// _worker.js
// Cloudflare Pages/Workers 上的 VLESS-over-WebSocket 服务端 + Clash 订阅生成器。
//
// 部署方式：通过 Cloudflare Pages 的 Git 集成（或 wrangler）部署，
// 构建过程会用 esbuild 打包本文件及其 import，因此可以安全地 import ./src/sub.mjs。
//
// 必填环境变量：
//   UUID      —— VLESS 用户 ID，同时作为订阅访问 token（用 `uuidgen` 生成）
// 可选环境变量：
//   PROXYIP   —— 当 Cloudflare 无法直连目标（回源受限）时的中转 IP[:端口]
//   SUB_NAME  —— 订阅/节点名前缀，默认 "Agora"
//   PREFERRED —— 自定义优选地址，逗号分隔，格式 addr#备注，如 "104.16.0.0#HK,time.is#JP"

import { connect } from "cloudflare:sockets";
import { buildClashYaml, buildBase64Sub, DEFAULT_PREFERRED_ADDRS } from "./src/sub.mjs";

export default {
  async fetch(request, env) {
    try {
      const uuid = env.UUID || "";
      const proxyIP = env.PROXYIP || "";
      const subName = env.SUB_NAME || "Agora";

      const upgrade = request.headers.get("Upgrade");
      if (upgrade && upgrade.toLowerCase() === "websocket") {
        if (!uuid) return new Response("UUID not set", { status: 500 });
        return await vlessOverWSHandler(request, uuid, proxyIP);
      }

      // 非 WebSocket：处理订阅与首页伪装
      const url = new URL(request.url);
      const host = request.headers.get("Host") || url.host;
      const path = url.pathname.replace(/^\/+/, "").replace(/\/+$/, "");

      // 订阅路由：/<UUID> ，target 用 query 控制（clash / v2ray）
      if (uuid && path === uuid) {
        return buildSubResponse(env, host, url.searchParams.get("target"));
      }

      // 伪装首页，避免被识别为代理
      return new Response(maskHomepage(), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response("Error: " + (err && err.message), { status: 500 });
    }
  },
};

// ---------- 订阅生成 ----------

function parsePreferred(env) {
  if (!env.PREFERRED) return DEFAULT_PREFERRED_ADDRS;
  return env.PREFERRED.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [addr, note] = s.split("#");
      return { addr: addr.trim(), note: (note || addr).trim() };
    });
}

function buildSubResponse(env, host, target) {
  const opts = {
    uuid: env.UUID,
    host,
    path: "/?ed=2560",
    subName: env.SUB_NAME || "Agora",
    preferred: parsePreferred(env),
    port: 443,
  };

  if (target === "v2ray" || target === "base64") {
    return new Response(buildBase64Sub(opts), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

  // 默认 Clash Meta YAML
  return new Response(buildClashYaml(opts), {
    headers: {
      "content-type": "text/yaml; charset=utf-8",
      "profile-update-interval": "24",
      "content-disposition": `attachment; filename=${encodeURIComponent(opts.subName)}.yaml`,
    },
  });
}

function maskHomepage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>It works!</title></head><body><h1>It works!</h1>
<p>This is the default web page for this server.</p></body></html>`;
}

// ---------- VLESS over WebSocket ----------

async function vlessOverWSHandler(request, uuid, proxyIP) {
  const pair = new WebSocketPair();
  const [client, server] = Object.values(pair);
  server.accept();

  let remoteSocketWrapper = { value: null };
  const earlyHeader = request.headers.get("sec-websocket-protocol") || "";
  const readable = makeReadableWebSocketStream(server, earlyHeader);

  readable
    .pipeTo(
      new WritableStream({
        async write(chunk) {
          if (remoteSocketWrapper.value) {
            const writer = remoteSocketWrapper.value.writable.getWriter();
            await writer.write(chunk);
            writer.releaseLock();
            return;
          }

          const result = parseVlessHeader(chunk, uuid);
          if (result.hasError) {
            throw new Error(result.message);
          }
          const { addressRemote, portRemote, rawDataIndex, vlessVersion } = result;
          const vlessResponse = new Uint8Array([vlessVersion[0], 0]);
          const rawClientData = chunk.slice(rawDataIndex);

          await handleTCPOutBound(
            remoteSocketWrapper,
            addressRemote,
            portRemote,
            rawClientData,
            server,
            vlessResponse,
            proxyIP
          );
        },
        close() {},
        abort() {},
      })
    )
    .catch(() => safeClose(server));

  return new Response(null, { status: 101, webSocket: client });
}

// 解析 VLESS 请求头，校验 UUID，提取目标地址/端口
function parseVlessHeader(buffer, uuid) {
  if (buffer.byteLength < 24) {
    return { hasError: true, message: "invalid header length" };
  }
  const view = new DataView(buffer);
  const version = new Uint8Array(buffer.slice(0, 1));
  const id = stringifyUUID(new Uint8Array(buffer.slice(1, 17)));
  if (id !== uuid) {
    return { hasError: true, message: "invalid user" };
  }

  const optLength = view.getUint8(17);
  const command = view.getUint8(18 + optLength); // 1=TCP, 2=UDP
  if (command !== 1) {
    return { hasError: true, message: "only TCP supported on this edge" };
  }

  let offset = 18 + optLength + 1;
  const portRemote = view.getUint16(offset);
  offset += 2;

  const addressType = view.getUint8(offset);
  offset += 1;
  let addressRemote = "";
  let addressLength = 0;

  switch (addressType) {
    case 1: // IPv4
      addressLength = 4;
      addressRemote = new Uint8Array(buffer.slice(offset, offset + 4)).join(".");
      break;
    case 2: // 域名
      addressLength = view.getUint8(offset);
      offset += 1;
      addressRemote = new TextDecoder().decode(buffer.slice(offset, offset + addressLength));
      break;
    case 3: // IPv6
      addressLength = 16;
      {
        const parts = [];
        for (let i = 0; i < 8; i++) parts.push(view.getUint16(offset + i * 2).toString(16));
        addressRemote = parts.join(":");
      }
      break;
    default:
      return { hasError: true, message: "invalid address type" };
  }
  offset += addressLength;

  return {
    hasError: false,
    addressRemote,
    portRemote,
    rawDataIndex: offset,
    vlessVersion: version,
  };
}

async function handleTCPOutBound(
  remoteSocketWrapper,
  address,
  port,
  rawClientData,
  ws,
  vlessResponse,
  proxyIP
) {
  async function tryConnect(host, p) {
    const socket = connect({ hostname: host, port: p });
    remoteSocketWrapper.value = socket;
    const writer = socket.writable.getWriter();
    await writer.write(rawClientData);
    writer.releaseLock();
    return socket;
  }

  let socket;
  try {
    socket = await tryConnect(address, port);
  } catch {
    socket = null;
  }

  // 直连失败且配置了 proxyIP，则走中转
  pipeRemoteToWS(socket, ws, vlessResponse, async () => {
    if (proxyIP) {
      const [ph, pp] = proxyIP.split(":");
      try {
        const s = await tryConnect(ph, Number(pp) || port);
        pipeRemoteToWS(s, ws, vlessResponse, () => safeClose(ws));
        return;
      } catch {
        // ignore
      }
    }
    safeClose(ws);
  });
}

// 把远端 socket 数据回传给 WebSocket；首包前置 VLESS 响应头
function pipeRemoteToWS(socket, ws, vlessResponse, onNoData) {
  if (!socket) {
    if (onNoData) onNoData();
    return;
  }
  let headerSent = false;
  let hasData = false;
  socket.readable
    .pipeTo(
      new WritableStream({
        write(chunk) {
          hasData = true;
          if (ws.readyState !== 1) return;
          if (!headerSent) {
            const merged = new Uint8Array(vlessResponse.byteLength + chunk.byteLength);
            merged.set(vlessResponse, 0);
            merged.set(new Uint8Array(chunk), vlessResponse.byteLength);
            ws.send(merged.buffer);
            headerSent = true;
          } else {
            ws.send(chunk);
          }
        },
        close() {
          if (!hasData && onNoData) onNoData();
        },
        abort() {},
      })
    )
    .catch(() => safeClose(ws));
}

// 把 WebSocket 包装成 ReadableStream，处理 0-RTT early data
function makeReadableWebSocketStream(ws, earlyHeader) {
  let cancelled = false;
  return new ReadableStream({
    start(controller) {
      ws.addEventListener("message", (e) => {
        if (cancelled) return;
        controller.enqueue(e.data);
      });
      ws.addEventListener("close", () => {
        safeClose(ws);
        if (!cancelled) controller.close();
      });
      ws.addEventListener("error", () => controller.error(new Error("ws error")));

      const { earlyData, error } = base64ToArrayBuffer(earlyHeader);
      if (error) controller.error(error);
      else if (earlyData) controller.enqueue(earlyData);
    },
    cancel() {
      cancelled = true;
      safeClose(ws);
    },
  });
}

// ---------- 工具函数 ----------

function base64ToArrayBuffer(b64) {
  if (!b64) return { earlyData: null, error: null };
  try {
    const normalized = b64.replace(/-/g, "+").replace(/_/g, "/");
    const decoded = atob(normalized);
    const buf = Uint8Array.from(decoded, (c) => c.charCodeAt(0));
    return { earlyData: buf.buffer, error: null };
  } catch (error) {
    return { earlyData: null, error };
  }
}

function safeClose(ws) {
  try {
    if (ws.readyState === 1 || ws.readyState === 2) ws.close();
  } catch {}
}

const BYTE_HEX = [];
for (let i = 0; i < 256; i++) BYTE_HEX.push((i + 256).toString(16).slice(1));
function stringifyUUID(arr) {
  return (
    BYTE_HEX[arr[0]] + BYTE_HEX[arr[1]] + BYTE_HEX[arr[2]] + BYTE_HEX[arr[3]] + "-" +
    BYTE_HEX[arr[4]] + BYTE_HEX[arr[5]] + "-" +
    BYTE_HEX[arr[6]] + BYTE_HEX[arr[7]] + "-" +
    BYTE_HEX[arr[8]] + BYTE_HEX[arr[9]] + "-" +
    BYTE_HEX[arr[10]] + BYTE_HEX[arr[11]] + BYTE_HEX[arr[12]] +
    BYTE_HEX[arr[13]] + BYTE_HEX[arr[14]] + BYTE_HEX[arr[15]]
  ).toLowerCase();
}
