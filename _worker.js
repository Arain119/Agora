// _worker.js
// Cloudflare Pages/Workers 上的 VLESS-over-WebSocket 服务端 + Clash 订阅生成器
// + 基于 KV 的自适应多用户/设置管理（默认启用）。
//
// 部署方式：通过 Cloudflare Pages 的 Git 集成（或 wrangler）部署，
// 构建过程会用 esbuild 打包本文件及其 import，因此可以安全地 import ./src/sub.mjs。
//
// 环境变量：
//   UUID        —— 站长(owner) 的 VLESS ID，同时是其订阅 token。即使不绑 KV 也始终有效。
//   ADMIN_TOKEN —— 管理面板访问令牌，访问 /<ADMIN_TOKEN> 打开面板（建议用一个长随机串）
//   PROXYIP     —— 直连受限目标时的中转 IP[:端口]（可在面板里覆盖）
//   SUB_NAME    —— 订阅/节点名前缀，默认 "Agora"（可在面板里覆盖）
//   PREFERRED   —— 默认优选地址，逗号分隔 addr#备注（可在面板里覆盖）
//
// KV 绑定（启用自适应管理）：
//   binding = "AGORA_KV"
//   未绑定时自动降级为仅 env.UUID 单用户，管理面板会提示去绑定 KV。

import { connect } from "cloudflare:sockets";
import { buildClashYaml, buildBase64Sub, DEFAULT_PREFERRED_ADDRS } from "./src/sub.mjs";

export default {
  async fetch(request, env) {
    try {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade && upgrade.toLowerCase() === "websocket") {
        return await vlessOverWSHandler(request, env);
      }

      const url = new URL(request.url);
      const host = request.headers.get("Host") || url.host;
      const segments = url.pathname.split("/").filter(Boolean);

      // 管理面板 / 管理 API（受 ADMIN_TOKEN 保护）
      if (env.ADMIN_TOKEN && segments[0] === env.ADMIN_TOKEN) {
        return await handleAdmin(segments.slice(1), request, env, host);
      }

      // 订阅路由：/<uuid>，uuid 必须是有效用户
      if (segments.length === 1) {
        const id = segments[0];
        const users = await allValidUsers(env);
        if (users.some((u) => u.id === id)) {
          return await buildSubResponse(env, host, url.searchParams.get("target"), id);
        }
      }

      // 伪装首页
      return new Response(maskHomepage(), {
        status: 200,
        headers: { "content-type": "text/html; charset=utf-8" },
      });
    } catch (err) {
      return new Response("Error: " + (err && err.message), { status: 500 });
    }
  },
};

// ---------- 用户与设置（KV 自适应管理） ----------

// 读取 KV 中受管理的用户列表（不含站长）
async function readKvUsers(env) {
  if (!env.AGORA_KV) return [];
  const raw = await env.AGORA_KV.get("users");
  if (!raw) return [];
  try {
    const arr = JSON.parse(raw);
    return Array.isArray(arr) ? arr : [];
  } catch {
    return [];
  }
}

async function saveKvUsers(env, users) {
  await env.AGORA_KV.put("users", JSON.stringify(users));
}

// 全部有效用户 = 站长(env.UUID) + KV 中 enabled 的用户
async function allValidUsers(env) {
  const list = [];
  if (env.UUID) list.push({ id: env.UUID, name: "站长", owner: true, enabled: true });
  for (const u of await readKvUsers(env)) {
    if (u && u.id && u.enabled !== false) list.push({ ...u, owner: false });
  }
  return list;
}

function parseEnvPreferred(env) {
  if (!env.PREFERRED) return DEFAULT_PREFERRED_ADDRS;
  return env.PREFERRED.split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((s) => {
      const [addr, note] = s.split("#");
      return { addr: addr.trim(), note: (note || addr).trim() };
    });
}

// 合并后的设置：KV 优先，回退到环境变量
async function loadSettings(env) {
  let s = {};
  if (env.AGORA_KV) {
    const raw = await env.AGORA_KV.get("settings");
    if (raw) {
      try {
        s = JSON.parse(raw) || {};
      } catch {
        s = {};
      }
    }
  }
  return {
    proxyIP: s.proxyIP != null ? s.proxyIP : env.PROXYIP || "",
    subName: s.subName || env.SUB_NAME || "Agora",
    preferred: Array.isArray(s.preferred) && s.preferred.length ? s.preferred : parseEnvPreferred(env),
  };
}

async function saveSettings(env, settings) {
  await env.AGORA_KV.put("settings", JSON.stringify(settings));
}

// ---------- 订阅生成 ----------

async function buildSubResponse(env, host, target, uuid) {
  const settings = await loadSettings(env);
  const opts = {
    uuid,
    host,
    path: "/?ed=2560",
    subName: settings.subName,
    preferred: settings.preferred,
    port: 443,
  };

  if (target === "v2ray" || target === "base64") {
    return new Response(buildBase64Sub(opts), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }

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

// ---------- 管理面板 / API ----------

async function handleAdmin(rest, request, env, host) {
  if (!env.AGORA_KV) {
    return json(
      { error: "未绑定 KV namespace 'AGORA_KV'，自适应管理不可用。请见 docs/DEPLOY.md 绑定后重试。" },
      503
    );
  }

  // API：/<token>/api/...
  if (rest[0] === "api") {
    return await handleAdminApi(rest.slice(1), request, env);
  }

  // 面板页面：/<token>
  return new Response(adminPanelHTML(env.ADMIN_TOKEN, host), {
    headers: { "content-type": "text/html; charset=utf-8" },
  });
}

async function handleAdminApi(rest, request, env) {
  const method = request.method.toUpperCase();

  // /api/users
  if (rest[0] === "users" && rest.length === 1) {
    if (method === "GET") {
      return json({ users: await allValidUsers(env) });
    }
    if (method === "POST") {
      const body = await readJson(request);
      const name = (body.name || "用户").toString().slice(0, 40);
      const kv = await readKvUsers(env);
      const user = { id: crypto.randomUUID(), name, enabled: true, created: Date.now() };
      kv.push(user);
      await saveKvUsers(env, kv);
      return json({ ok: true, user });
    }
  }

  // /api/users/<id>
  if (rest[0] === "users" && rest.length === 2) {
    const id = rest[1];
    if (id === env.UUID) {
      return json({ error: "站长账号由环境变量管理，不能在此删除/修改。" }, 400);
    }
    if (method === "DELETE") {
      const kv = (await readKvUsers(env)).filter((u) => u.id !== id);
      await saveKvUsers(env, kv);
      return json({ ok: true });
    }
    if (method === "PATCH") {
      const body = await readJson(request);
      const kv = await readKvUsers(env);
      const u = kv.find((x) => x.id === id);
      if (!u) return json({ error: "用户不存在" }, 404);
      if (typeof body.enabled === "boolean") u.enabled = body.enabled;
      if (typeof body.name === "string") u.name = body.name.slice(0, 40);
      await saveKvUsers(env, kv);
      return json({ ok: true, user: u });
    }
  }

  // /api/settings
  if (rest[0] === "settings" && rest.length === 1) {
    if (method === "GET") {
      return json({ settings: await loadSettings(env) });
    }
    if (method === "POST") {
      const body = await readJson(request);
      const cur = await loadSettings(env);
      const next = {
        proxyIP: typeof body.proxyIP === "string" ? body.proxyIP : cur.proxyIP,
        subName: typeof body.subName === "string" && body.subName ? body.subName : cur.subName,
        preferred: Array.isArray(body.preferred) ? body.preferred : cur.preferred,
      };
      await saveSettings(env, next);
      return json({ ok: true, settings: next });
    }
  }

  return json({ error: "未知接口" }, 404);
}

function json(obj, status = 200) {
  return new Response(JSON.stringify(obj), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

async function readJson(request) {
  try {
    return (await request.json()) || {};
  } catch {
    return {};
  }
}

function adminPanelHTML(token, host) {
  const base = "/" + token;
  // 注意：页面内 <script> 不使用反引号，避免与外层模板字符串冲突。
  return (
    '<!doctype html><html lang="zh"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>Agora 管理面板</title><style>" +
    "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:860px;margin:24px auto;padding:0 16px;color:#222}" +
    "h1{font-size:20px}h2{font-size:16px;margin-top:28px;border-bottom:1px solid #eee;padding-bottom:6px}" +
    "table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid #f0f0f0}" +
    "button{cursor:pointer;border:1px solid #ccc;background:#fafafa;border-radius:6px;padding:5px 10px;font-size:13px}" +
    "button.primary{background:#2563eb;color:#fff;border-color:#2563eb}button.danger{color:#b91c1c;border-color:#f0c0c0}" +
    "input{padding:6px 8px;border:1px solid #ccc;border-radius:6px;font-size:14px}" +
    ".row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}" +
    "code{background:#f5f5f5;padding:2px 5px;border-radius:4px;font-size:12px;word-break:break-all}" +
    ".muted{color:#888;font-size:12px}</style></head><body>" +
    "<h1>🛠️ Agora 管理面板</h1>" +
    '<p class="muted">域名：<code>' + host + "</code></p>" +
    "<h2>用户</h2>" +
    '<div class="row"><input id="newName" placeholder="新用户名称（如 张三）">' +
    '<button class="primary" onclick="addUser()">+ 添加用户</button></div>' +
    '<table><thead><tr><th>名称</th><th>UUID / 订阅链接</th><th>状态</th><th>操作</th></tr></thead>' +
    '<tbody id="users"></tbody></table>' +
    "<h2>设置</h2>" +
    '<div class="row">订阅名前缀 <input id="subName" style="width:160px"></div>' +
    '<div class="row">proxyIP <input id="proxyIP" style="width:260px" placeholder="如 1.2.3.4:443，可留空"></div>' +
    '<div class="row">优选地址 <input id="preferred" style="width:420px" placeholder="addr#备注，逗号分隔"></div>' +
    '<div class="row"><button class="primary" onclick="saveSettings()">保存设置</button>' +
    '<span id="msg" class="muted"></span></div>' +
    "<script>" +
    "var BASE=" + JSON.stringify(base) + ";var HOST=" + JSON.stringify(host) + ";" +
    "function subLink(id){return location.protocol+'//'+HOST+'/'+id}" +
    "async function api(p,opt){var r=await fetch(BASE+'/api'+p,opt);return r.json()}" +
    "function esc(s){return String(s).replace(/[&<>\"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]})}" +
    "async function loadUsers(){var d=await api('/users');var t=document.getElementById('users');t.innerHTML='';" +
    "d.users.forEach(function(u){var tr=document.createElement('tr');" +
    "var link=subLink(u.id);" +
    "var ops=u.owner?'<span class=muted>站长</span>':" +
    "('<button onclick=\"toggle(\\''+u.id+'\\','+(u.enabled?'false':'true')+')\">'+(u.enabled?'停用':'启用')+'</button> '+" +
    "'<button class=danger onclick=\"del(\\''+u.id+'\\')\">删除</button>');" +
    "tr.innerHTML='<td>'+esc(u.name)+'</td>'+" +
    "'<td><code>'+u.id+'</code><br><a href=\"'+link+'\" target=_blank>'+link+'</a></td>'+" +
    "'<td>'+(u.enabled?'✅':'⛔')+'</td>'+'<td>'+ops+'</td>';t.appendChild(tr)})}" +
    "async function addUser(){var n=document.getElementById('newName').value||'用户';" +
    "await api('/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:n})});" +
    "document.getElementById('newName').value='';loadUsers()}" +
    "async function del(id){if(!confirm('确认删除该用户？其订阅将立即失效。'))return;" +
    "await api('/users/'+id,{method:'DELETE'});loadUsers()}" +
    "async function toggle(id,en){await api('/users/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:en==='true'})});loadUsers()}" +
    "async function loadSettings(){var d=await api('/settings');var s=d.settings;" +
    "document.getElementById('subName').value=s.subName||'';" +
    "document.getElementById('proxyIP').value=s.proxyIP||'';" +
    "document.getElementById('preferred').value=(s.preferred||[]).map(function(p){return p.addr+'#'+(p.note||p.addr)}).join(',')}" +
    "async function saveSettings(){var pref=document.getElementById('preferred').value.split(',').map(function(x){x=x.trim();if(!x)return null;var a=x.split('#');return{addr:a[0].trim(),note:(a[1]||a[0]).trim()}}).filter(Boolean);" +
    "var body={subName:document.getElementById('subName').value,proxyIP:document.getElementById('proxyIP').value,preferred:pref};" +
    "await api('/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});" +
    "document.getElementById('msg').textContent='已保存 ✓';setTimeout(function(){document.getElementById('msg').textContent=''},2000)}" +
    "loadUsers();loadSettings();" +
    "</script></body></html>"
  );
}

// ---------- VLESS over WebSocket ----------

async function vlessOverWSHandler(request, env) {
  const validIds = new Set((await allValidUsers(env)).map((u) => u.id));
  if (validIds.size === 0) {
    return new Response("no valid user configured", { status: 500 });
  }
  const settings = await loadSettings(env);
  const proxyIP = settings.proxyIP;

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

          const result = parseVlessHeader(chunk, validIds);
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

// 解析 VLESS 请求头，校验 UUID（任意有效用户），提取目标地址/端口
function parseVlessHeader(buffer, validIds) {
  if (buffer.byteLength < 24) {
    return { hasError: true, message: "invalid header length" };
  }
  const view = new DataView(buffer);
  const version = new Uint8Array(buffer.slice(0, 1));
  const id = stringifyUUID(new Uint8Array(buffer.slice(1, 17)));
  if (!validIds.has(id)) {
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
