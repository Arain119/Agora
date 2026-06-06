// _worker.js
// Cloudflare Pages/Workers 上的 VLESS-over-WebSocket 服务端 + 多格式订阅生成器
// + 基于 KV 的自适应多用户管理（默认启用，尽量零配置）。
//
// 设计目标：把所有手动步骤改为自动——
//   · 站长 UUID：未设环境变量时，首次运行自动生成并持久化到 KV
//   · 管理口令：支持「首次访问设置(TOFU)」，无需预先配置 ADMIN_TOKEN 环境变量
//   · 订阅格式：按客户端 User-Agent 自动返回 Clash / sing-box / 通用 base64
//   · 设置：管理面板内改动即自动保存、即时生效，无需重新部署
//
// 环境变量（全部可选）：
//   UUID        —— 站长 VLESS ID；不填则自动生成并存入 KV
//   ADMIN_TOKEN —— 管理口令；不填则用「首次访问设置」在网页上设定
//   PROXYIP     —— 直连失败时的中转 IP[:端口]（可在面板里改）
//   SUB_NAME    —— 订阅/节点名前缀，默认 "Agora"（可在面板里改）
//   PREFERRED   —— 默认优选地址 addr#备注，逗号分隔（可在面板里改）
//
// KV 绑定（变量名 AGORA_KV）：持久化用户/设置/自动生成的口令与站长 UUID。
//   未绑定时退化为仅 env.UUID 单用户，且无法使用管理面板。

import { connect } from "cloudflare:sockets";
import {
  buildClashYaml,
  buildBase64Sub,
  buildSingboxJson,
  pickFormatByUA,
  parsePreferredSource,
  DEFAULT_PREFERRED_ADDRS,
} from "./src/sub.mjs";

// 优选 IP 自动刷新参数
const PREFERRED_TTL_MS = 12 * 60 * 60 * 1000; // 缓存 12 小时
const DEFAULT_SOURCE_URL = "https://raw.githubusercontent.com/ymyuuu/IPDB/main/BestCF/bestcfv4.txt";
const MAX_PREFERRED = 8; // 最终保留的优选数量
const PROBE_CANDIDATES = 12; // 连通性自检的候选上限
const PROBE_TIMEOUT_MS = 1500;

export default {
  async fetch(request, env, ctx) {
    try {
      const upgrade = request.headers.get("Upgrade");
      if (upgrade && upgrade.toLowerCase() === "websocket") {
        return await vlessOverWSHandler(request, env);
      }

      const url = new URL(request.url);
      const host = request.headers.get("Host") || url.host;
      const segments = url.pathname.split("/").filter(Boolean);

      // 首次访问设置（TOFU）：设定管理口令
      if (request.method === "POST" && url.pathname === "/__setup__") {
        return await handleSetup(request, env);
      }

      const adminToken = await effectiveAdminToken(env);

      // 管理面板 / API
      if (adminToken && segments[0] === adminToken) {
        return await handleAdmin(segments.slice(1), request, env, host, adminToken);
      }

      // 订阅：/<uuid>
      if (segments.length === 1) {
        const id = segments[0];
        const users = await allValidUsers(env);
        if (users.some((u) => u.id === id)) {
          return await buildSubResponse(request, env, host, url.searchParams.get("target"), id, ctx);
        }
      }

      // 根路径：尚未设置口令且已绑 KV → 显示首次设置页
      if (url.pathname === "/" && !adminToken && env.AGORA_KV) {
        return new Response(setupPageHTML(host), { headers: htmlHeaders() });
      }

      // 伪装首页
      return new Response(maskHomepage(), { headers: htmlHeaders() });
    } catch (err) {
      return new Response("Error: " + (err && err.message), { status: 500 });
    }
  },
};

// ---------- 口令与身份（自动化） ----------

// 有效管理口令：环境变量优先，其次 KV 中 TOFU 设定的口令
async function effectiveAdminToken(env) {
  if (env.ADMIN_TOKEN) return env.ADMIN_TOKEN;
  if (env.AGORA_KV) {
    const t = await env.AGORA_KV.get("admin_token");
    if (t) return t;
  }
  return null;
}

// 站长 UUID：环境变量优先，否则自动生成并持久化到 KV
async function getOwnerUUID(env) {
  if (env.UUID) return env.UUID;
  if (!env.AGORA_KV) return null;
  let u = await env.AGORA_KV.get("owner_uuid");
  if (!u) {
    u = crypto.randomUUID();
    await env.AGORA_KV.put("owner_uuid", u);
  }
  return u;
}

async function handleSetup(request, env) {
  if (!env.AGORA_KV) return json({ error: "未绑定 KV，无法保存口令" }, 503);
  if (await effectiveAdminToken(env)) {
    return json({ error: "管理口令已设置，禁止重复初始化" }, 409);
  }
  // 自动生成高熵管理口令（无需用户自拟弱口令）
  const token = (crypto.randomUUID() + crypto.randomUUID()).replace(/-/g, "");
  await env.AGORA_KV.put("admin_token", token);
  const owner = await getOwnerUUID(env);
  return json({ ok: true, adminUrl: "/" + token, ownerUuid: owner });
}

// ---------- 用户与设置（KV 自适应管理） ----------

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

// 全部有效用户 = 站长 + KV 中 enabled 的用户
async function allValidUsers(env) {
  const list = [];
  const owner = await getOwnerUUID(env);
  if (owner) list.push({ id: owner, name: "站长", owner: true, enabled: true });
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
    autoRefresh: typeof s.autoRefresh === "boolean" ? s.autoRefresh : true,
    sourceUrl: s.sourceUrl || env.SOURCE_URL || DEFAULT_SOURCE_URL,
  };
}

async function saveSettings(env, settings) {
  await env.AGORA_KV.put("settings", JSON.stringify(settings));
}

// ---------- 优选 IP：自动刷新 + 连通性自检 ----------

// 解析当前生效的优选地址；自动模式下在后台惰性刷新（不阻塞响应）
async function getEffectivePreferred(env, settings, ctx) {
  if (!settings.autoRefresh) {
    return settings.preferred && settings.preferred.length ? settings.preferred : DEFAULT_PREFERRED_ADDRS;
  }
  let cache = null;
  if (env.AGORA_KV) {
    const raw = await env.AGORA_KV.get("auto_preferred");
    if (raw) {
      try {
        cache = JSON.parse(raw);
      } catch {
        cache = null;
      }
    }
  }
  const fresh = cache && Array.isArray(cache.addrs) && cache.addrs.length;
  const stale = !fresh || Date.now() - (cache.updated || 0) > PREFERRED_TTL_MS;
  if (stale && env.AGORA_KV && ctx && typeof ctx.waitUntil === "function") {
    ctx.waitUntil(refreshPreferred(env, settings)); // 后台刷新，不阻塞本次响应
  }
  return fresh ? cache.addrs : DEFAULT_PREFERRED_ADDRS;
}

// 拉取优选来源 → 解析 → 连通性自检剔除失效 → 写入 KV
async function refreshPreferred(env, settings) {
  try {
    const url = (settings && settings.sourceUrl) || DEFAULT_SOURCE_URL;
    const res = await fetch(url, { cf: { cacheTtl: 300, cacheEverything: true } });
    if (!res.ok) return null;
    const text = await res.text();
    const cands = parsePreferredSource(text, PROBE_CANDIDATES * 2);
    if (!cands.length) return null;
    const alive = await filterAlive(cands, MAX_PREFERRED);
    const addrs = alive.length ? alive : cands.slice(0, MAX_PREFERRED);
    if (env.AGORA_KV) {
      await env.AGORA_KV.put(
        "auto_preferred",
        JSON.stringify({ updated: Date.now(), addrs, source: url, checked: cands.length, alive: alive.length })
      );
    }
    return addrs;
  } catch {
    return null;
  }
}

// 并发 TCP 探测，保留连得通的（保持原顺序），最多 want 个
async function filterAlive(cands, want) {
  const slice = cands.slice(0, PROBE_CANDIDATES);
  const results = await Promise.all(
    slice.map(async (c) => ({ c, ok: await tcpAlive(c.addr, 443, PROBE_TIMEOUT_MS) }))
  );
  return results.filter((r) => r.ok).map((r) => r.c).slice(0, want);
}

// 对 host:443 做一次带超时的 TCP 握手探测
async function tcpAlive(host, port, ms) {
  let socket;
  try {
    socket = connect({ hostname: host, port });
    const timeout = new Promise((_, reject) => setTimeout(() => reject(new Error("timeout")), ms));
    await Promise.race([socket.opened, timeout]);
    return true;
  } catch {
    return false;
  } finally {
    try {
      if (socket) await socket.close();
    } catch {}
  }
}

// ---------- 订阅生成 ----------

async function buildSubResponse(request, env, host, target, uuid, ctx) {
  const settings = await loadSettings(env);
  const preferred = await getEffectivePreferred(env, settings, ctx);
  const opts = {
    uuid,
    host,
    path: "/?ed=2560",
    subName: settings.subName,
    preferred,
    port: 443,
  };

  const fmt = target || pickFormatByUA(request.headers.get("User-Agent"));

  if (fmt === "v2ray" || fmt === "base64") {
    return new Response(buildBase64Sub(opts), {
      headers: { "content-type": "text/plain; charset=utf-8" },
    });
  }
  if (fmt === "singbox") {
    return new Response(buildSingboxJson(opts), {
      headers: { "content-type": "application/json; charset=utf-8" },
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

function htmlHeaders() {
  return { "content-type": "text/html; charset=utf-8" };
}

function maskHomepage() {
  return `<!doctype html><html lang="en"><head><meta charset="utf-8">
<title>It works!</title></head><body><h1>It works!</h1>
<p>This is the default web page for this server.</p></body></html>`;
}

// ---------- 管理面板 / API ----------

async function handleAdmin(rest, request, env, host, adminToken) {
  if (!env.AGORA_KV) {
    return json({ error: "未绑定 KV namespace 'AGORA_KV'，自适应管理不可用。" }, 503);
  }
  if (rest[0] === "api") {
    return await handleAdminApi(rest.slice(1), request, env);
  }
  return new Response(adminPanelHTML(adminToken, host), { headers: htmlHeaders() });
}

async function handleAdminApi(rest, request, env) {
  const method = request.method.toUpperCase();
  const owner = await getOwnerUUID(env);

  if (rest[0] === "users" && rest.length === 1) {
    if (method === "GET") return json({ users: await allValidUsers(env) });
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

  if (rest[0] === "users" && rest.length === 2) {
    const id = rest[1];
    if (id === owner) return json({ error: "站长账号受保护，不能在此删除/修改。" }, 400);
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

  if (rest[0] === "settings" && rest.length === 1) {
    if (method === "GET") {
      const settings = await loadSettings(env);
      let auto = null;
      if (env.AGORA_KV) {
        const raw = await env.AGORA_KV.get("auto_preferred");
        if (raw) {
          try {
            const c = JSON.parse(raw);
            auto = { updated: c.updated, count: (c.addrs || []).length, alive: c.alive, checked: c.checked };
          } catch {}
        }
      }
      return json({ settings, auto });
    }
    if (method === "POST") {
      const body = await readJson(request);
      const cur = await loadSettings(env);
      const next = {
        proxyIP: typeof body.proxyIP === "string" ? body.proxyIP : cur.proxyIP,
        subName: typeof body.subName === "string" && body.subName ? body.subName : cur.subName,
        preferred: Array.isArray(body.preferred) ? body.preferred : cur.preferred,
        autoRefresh: typeof body.autoRefresh === "boolean" ? body.autoRefresh : cur.autoRefresh,
        sourceUrl: typeof body.sourceUrl === "string" && body.sourceUrl ? body.sourceUrl : cur.sourceUrl,
      };
      await saveSettings(env, next);
      return json({ ok: true, settings: next });
    }
  }

  // 手动「立即刷新优选」：拉取 + 连通性自检（同步返回结果）
  if (rest[0] === "refresh" && rest.length === 1 && method === "POST") {
    const settings = await loadSettings(env);
    const addrs = await refreshPreferred(env, settings);
    if (!addrs) return json({ error: "刷新失败：来源不可达或无有效地址" }, 502);
    return json({ ok: true, count: addrs.length, addrs, updated: Date.now() });
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

// 首次访问设置页（TOFU）：设定一次管理口令
function setupPageHTML(host) {
  return (
    '<!doctype html><html lang="zh"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>Agora 初始化</title><style>" +
    "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:520px;margin:60px auto;padding:0 16px;color:#222}" +
    "h1{font-size:20px}" +
    "button{margin-top:12px;width:100%;padding:12px;border:0;border-radius:8px;background:#2563eb;color:#fff;font-size:15px;cursor:pointer}" +
    ".muted{color:#888;font-size:13px}code{background:#f5f5f5;padding:2px 6px;border-radius:4px;word-break:break-all}" +
    "#done{display:none;margin-top:20px;padding:14px;background:#f0fdf4;border:1px solid #bbf7d0;border-radius:8px}" +
    "a{color:#2563eb}</style></head><body>" +
    "<h1>🔐 一键初始化</h1>" +
    '<p class="muted">部署后的一次性初始化：点击下方按钮自动生成管理口令并启用面板。' +
    "生成的管理链接含随机口令，请务必收藏保存；本页随后不再可用。</p>" +
    '<button onclick="go()" id="btn">🚀 生成并启用管理面板</button>' +
    '<p id="err" class="muted" style="color:#b91c1c"></p>' +
    '<div id="done"><b>✅ 已启用！请收藏下面的管理链接（含口令，勿外泄）：</b><br><br>' +
    '管理面板：<a id="adminurl" href="#" target="_blank"></a><br><br>' +
    '站长订阅：<code id="ownersub"></code></div>' +
    "<script>" +
    "async function go(){document.getElementById('btn').disabled=true;" +
    "var r=await fetch('/__setup__',{method:'POST'});" +
    "var d=await r.json();if(!r.ok){document.getElementById('err').textContent=d.error||'设置失败';document.getElementById('btn').disabled=false;return}" +
    "var au=location.origin+d.adminUrl;document.getElementById('adminurl').textContent=au;document.getElementById('adminurl').href=au;" +
    "document.getElementById('ownersub').textContent=location.origin+'/'+d.ownerUuid;" +
    "document.getElementById('done').style.display='block';}" +
    "</script></body></html>"
  );
}

function adminPanelHTML(token, host) {
  const base = "/" + token;
  return (
    '<!doctype html><html lang="zh"><head><meta charset="utf-8">' +
    '<meta name="viewport" content="width=device-width, initial-scale=1">' +
    "<title>Agora 管理面板</title><style>" +
    "body{font-family:system-ui,-apple-system,Segoe UI,Roboto,sans-serif;max-width:920px;margin:24px auto;padding:0 16px;color:#222}" +
    "h1{font-size:20px}h2{font-size:16px;margin-top:28px;border-bottom:1px solid #eee;padding-bottom:6px}" +
    "table{width:100%;border-collapse:collapse;font-size:14px}th,td{text-align:left;padding:8px;border-bottom:1px solid #f0f0f0;vertical-align:top}" +
    "button{cursor:pointer;border:1px solid #ccc;background:#fafafa;border-radius:6px;padding:4px 9px;font-size:13px;margin-right:4px}" +
    "button.primary{background:#2563eb;color:#fff;border-color:#2563eb}button.danger{color:#b91c1c;border-color:#f0c0c0}" +
    "input{padding:6px 8px;border:1px solid #ccc;border-radius:6px;font-size:14px}" +
    ".row{display:flex;gap:8px;flex-wrap:wrap;align-items:center;margin:8px 0}" +
    "code{background:#f5f5f5;padding:2px 5px;border-radius:4px;font-size:12px;word-break:break-all}" +
    ".muted{color:#888;font-size:12px}.tag{font-size:11px;color:#16a34a}</style></head><body>" +
    "<h1>🛠️ Agora 管理面板</h1>" +
    '<p class="muted">域名 <code>' + host + "</code> ｜ 订阅按客户端自动适配 Clash / sing-box / 通用格式</p>" +
    "<h2>用户</h2>" +
    '<div class="row"><input id="newName" placeholder="输入名称后回车即可添加（如 张三）">' +
    '<button class="primary" onclick="addUser()">+ 添加</button></div>' +
    '<table><thead><tr><th>名称</th><th>订阅链接</th><th>操作</th></tr></thead>' +
    '<tbody id="users"></tbody></table>' +
    "<h2>设置 <span id=\"smsg\" class=\"tag\"></span></h2>" +
    '<p class="muted">改动即自动保存、即时对所有订阅生效，无需重新部署。</p>' +
    '<div class="row">订阅名前缀 <input id="subName" style="width:160px" oninput="saveSoon()"></div>' +
    '<div class="row"><label><input type="checkbox" id="autoRefresh" onchange="onAuto()"> 自动优选 IP（每 12h 定时刷新 + 连通性自检剔除失效）</label></div>' +
    '<div class="row">优选来源 <input id="sourceUrl" style="width:460px" placeholder="留空用内置默认源" oninput="saveSoon()">' +
    '<button onclick="refreshNow()">立即刷新</button></div>' +
    '<div class="row"><span id="autometa" class="muted"></span></div>' +
    '<div class="row">手动优选 <input id="preferred" style="width:460px" placeholder="addr#备注，逗号分隔（关闭自动时生效）" oninput="saveSoon()"></div>' +
    '<div class="row">proxyIP <input id="proxyIP" style="width:280px" placeholder="可留空；仅个别站点直连失败时用作中转" oninput="saveSoon()"></div>' +
    "<script>" +
    "var BASE=" + JSON.stringify(base) + ";var HOST=" + JSON.stringify(host) + ";var SUBNAME='Agora';" +
    "function origin(){return location.protocol+'//'+HOST}" +
    "function subLink(id){return origin()+'/'+id}" +
    "function clashImport(id,name){return 'clash://install-config?url='+encodeURIComponent(subLink(id))+'&name='+encodeURIComponent(SUBNAME+'-'+name)}" +
    "async function api(p,opt){var r=await fetch(BASE+'/api'+p,opt);return r.json()}" +
    "function esc(s){return String(s).replace(/[&<>\"]/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','\"':'&quot;'}[c]})}" +
    "async function copy(t){try{await navigator.clipboard.writeText(t);toast('已复制 ✓')}catch(e){prompt('手动复制：',t)}}" +
    "function toast(m){var s=document.getElementById('smsg');s.textContent=m;setTimeout(function(){s.textContent=''},1500)}" +
    "async function loadUsers(){var d=await api('/users');var t=document.getElementById('users');t.innerHTML='';" +
    "d.users.forEach(function(u){var tr=document.createElement('tr');var link=subLink(u.id);" +
    "var act='<button onclick=\"copy(\\''+link+'\\')\">复制</button>'+" +
    "'<button onclick=\"location.href=clashImport(\\''+u.id+'\\',\\''+esc(u.name)+'\\')\">导入Clash</button>';" +
    "if(!u.owner){act+='<button onclick=\"toggle(\\''+u.id+'\\','+(u.enabled?'false':'true')+')\">'+(u.enabled?'停用':'启用')+'</button>'+" +
    "'<button class=danger onclick=\"del(\\''+u.id+'\\')\">删除</button>'}" +
    "var badge=u.owner?' <span class=tag>站长</span>':(u.enabled?'':' <span class=muted>(已停用)</span>');" +
    "tr.innerHTML='<td>'+esc(u.name)+badge+'</td>'+'<td><code>'+link+'</code></td>'+'<td>'+act+'</td>';t.appendChild(tr)})}" +
    "async function addUser(){var i=document.getElementById('newName');var n=i.value.trim()||'用户';" +
    "await api('/users',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify({name:n})});i.value='';loadUsers()}" +
    "document.addEventListener('keydown',function(e){if(e.key==='Enter'&&document.activeElement&&document.activeElement.id==='newName')addUser()});" +
    "async function del(id){if(!confirm('确认删除该用户？其订阅将立即失效。'))return;await api('/users/'+id,{method:'DELETE'});loadUsers()}" +
    "async function toggle(id,en){await api('/users/'+id,{method:'PATCH',headers:{'content-type':'application/json'},body:JSON.stringify({enabled:en==='true'})});loadUsers()}" +
    "var saveTimer=null;function saveSoon(){clearTimeout(saveTimer);saveTimer=setTimeout(saveSettings,600)}" +
    "function applyAutoState(){var a=document.getElementById('autoRefresh').checked;document.getElementById('preferred').disabled=a;document.getElementById('sourceUrl').disabled=!a}" +
    "function onAuto(){applyAutoState();saveSoon()}" +
    "function renderMeta(a){var e=document.getElementById('autometa');if(!a){e.textContent='';return}var t=a.updated?new Date(a.updated).toLocaleString():'';" +
    "e.textContent='自动优选当前 '+(a.count||0)+' 个'+(a.checked?'（探测 '+a.checked+' 个，存活 '+a.alive+'）':'')+(t?'，更新于 '+t:'')}" +
    "async function loadSettings(){var d=await api('/settings');var s=d.settings;SUBNAME=s.subName||'Agora';" +
    "document.getElementById('subName').value=s.subName||'';document.getElementById('proxyIP').value=s.proxyIP||'';" +
    "document.getElementById('autoRefresh').checked=!!s.autoRefresh;document.getElementById('sourceUrl').value=s.sourceUrl||'';" +
    "document.getElementById('preferred').value=(s.preferred||[]).map(function(p){return p.addr+'#'+(p.note||p.addr)}).join(',');" +
    "renderMeta(d.auto);applyAutoState()}" +
    "async function saveSettings(){var pref=document.getElementById('preferred').value.split(',').map(function(x){x=x.trim();if(!x)return null;var a=x.split('#');return{addr:a[0].trim(),note:(a[1]||a[0]).trim()}}).filter(Boolean);" +
    "var body={subName:document.getElementById('subName').value,proxyIP:document.getElementById('proxyIP').value,preferred:pref," +
    "autoRefresh:document.getElementById('autoRefresh').checked,sourceUrl:document.getElementById('sourceUrl').value};" +
    "var d=await api('/settings',{method:'POST',headers:{'content-type':'application/json'},body:JSON.stringify(body)});" +
    "SUBNAME=(d.settings&&d.settings.subName)||SUBNAME;toast('已自动保存 ✓')}" +
    "async function refreshNow(){toast('刷新中…');var d=await api('/refresh',{method:'POST'});if(d.error){toast('刷新失败');return}toast('已更新 '+d.count+' 个优选 ✓');loadSettings()}" +
    "loadSettings().then(loadUsers);" +
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
