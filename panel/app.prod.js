/* ============================================================
   AGORA — production admin panel (real data, served by _worker.js)
   Wired to /<token>/api/{users,settings,refresh}.
   window.AGORA = { base, host } is injected by the panel HTML.
   ============================================================ */
(function () {
  'use strict';

  var A = window.AGORA || {};
  var BASE = A.base || '';
  var HOST = A.host || location.host;
  var SUBNAME = 'Agora';
  var TTL_MIN = 720; // 12h auto-optimize cycle

  var users = [];
  var net = null;        // { updated, alive, checked, sources, nodes:[{addr,note,ms}], history:[{t,alive}] }
  var settings = {};
  var currentMember = null;

  var $ = function (s, r) { return (r || document).querySelector(s); };
  var $$ = function (s, r) { return Array.prototype.slice.call((r || document).querySelectorAll(s)); };
  var el = function (t, c, x) { var e = document.createElement(t); if (c) e.className = c; if (x != null) e.textContent = x; return e; };

  function subLink(id) { return location.protocol + '//' + HOST + '/' + id; }
  function clashImport(id, name) { return 'clash://install-config?url=' + encodeURIComponent(subLink(id)) + '&name=' + encodeURIComponent(SUBNAME + '-' + name); }
  function singboxLink(id) { return 'sing-box://import-remote-profile?url=' + encodeURIComponent(subLink(id) + '?target=singbox'); }

  async function api(path, opt) {
    var r = await fetch(BASE + '/api' + path, opt);
    try { return await r.json(); } catch (e) { return {}; }
  }

  /* ---- toast / copy ---- */
  var toastT;
  function toast(msg) {
    var t = $('#toast'); t.innerHTML = '<span class="tk">\u2713</span>' + msg;
    t.classList.add('show'); clearTimeout(toastT);
    toastT = setTimeout(function () { t.classList.remove('show'); }, 1700);
  }
  function copy(text, label) {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(text).then(function () { toast(label || '\u5df2\u590d\u5236'); }, function () { fb(text); });
    } else { fb(text); }
  }
  function fb(text) {
    var ta = el('textarea'); ta.value = text; document.body.appendChild(ta); ta.select();
    try { document.execCommand('copy'); toast('\u5df2\u590d\u5236'); } catch (e) { window.prompt('\u590d\u5236\uff1a', text); }
    document.body.removeChild(ta);
  }
  function fmtDur(min) {
    if (min == null) return '\u2014';
    if (min < 1) return '\u521a\u521a';
    if (min < 60) return Math.round(min) + 'm';
    return (min / 60).toFixed(1) + 'h';
  }

  /* ---- charts ---- */
  function buildDonut(val, total) {
    var pct = total ? val / total : 0;
    var r = 44, c = 2 * Math.PI * r, dash = (pct * c).toFixed(1) + ' ' + c.toFixed(1);
    return '<svg viewBox="0 0 112 112">' +
      '<circle cx="56" cy="56" r="44" fill="none" stroke="var(--line)" stroke-width="10"/>' +
      '<circle cx="56" cy="56" r="44" fill="none" stroke="var(--accent)" stroke-width="10" stroke-linecap="round" stroke-dasharray="' + dash + '" transform="rotate(-90 56 56)"/>' +
      '<text x="56" y="55" text-anchor="middle" class="donut-pct">' + Math.round(pct * 100) + '%</text>' +
      '<text x="56" y="71" text-anchor="middle" class="donut-sub">\u5b58\u6d3b\u7387</text></svg>';
  }
  function buildSpark(hist) {
    var vals = hist.map(function (h) { return h.alive; });
    if (vals.length < 2) return '<div class="spark-empty">\u6682\u65e0\u5386\u53f2</div>';
    var w = 320, h = 72, pad = 8, n = vals.length;
    var max = Math.max.apply(null, vals), min = Math.min.apply(null, vals), rng = Math.max(1, max - min);
    var pts = vals.map(function (v, i) {
      return [pad + i * (w - 2 * pad) / (n - 1), pad + (1 - (v - min) / rng) * (h - 2 * pad - 4)];
    });
    var line = pts.map(function (p, i) { return (i ? 'L' : 'M') + p[0].toFixed(1) + ' ' + p[1].toFixed(1); }).join(' ');
    var area = line + ' L' + pts[n - 1][0].toFixed(1) + ' ' + (h - pad) + ' L' + pts[0][0].toFixed(1) + ' ' + (h - pad) + ' Z';
    var last = pts[n - 1];
    return '<svg viewBox="0 0 ' + w + ' ' + h + '" preserveAspectRatio="none">' +
      '<line class="sp-base" x1="' + pad + '" y1="' + (h - pad) + '" x2="' + (w - pad) + '" y2="' + (h - pad) + '"/>' +
      '<path class="sp-area" d="' + area + '"/><path class="sp-line" d="' + line + '"/>' +
      '<circle class="sp-dot" cx="' + last[0].toFixed(1) + '" cy="' + last[1].toFixed(1) + '" r="3.5"/></svg>';
  }

  /* ---- load ---- */
  async function load() {
    var u = await api('/users');
    var s = await api('/settings');
    users = (u && u.users) || [];
    settings = (s && s.settings) || {};
    net = (s && s.auto) || null;
    SUBNAME = settings.subName || 'Agora';
    renderRegister();
    renderNetwork();
  }

  /* ---- register ---- */
  function renderRegister() {
    var box = $('#register'); box.innerHTML = '';
    users.forEach(function (m, i) {
      var row = el('div', 'mrow' + (m.enabled === false ? ' disabled' : '')); row.tabIndex = 0;
      row.appendChild(el('div', 'idx num', String(i + 1).padStart(2, '0')));
      var who = el('div', 'who');
      var name = el('div', 'name'); name.appendChild(document.createTextNode(m.name));
      if (m.owner) name.appendChild(badge('owner', '\u7ad9\u957f'));
      else if (m.enabled === false) name.appendChild(badge('off', '\u5df2\u505c\u7528'));
      var sub = el('div', 'sub');
      sub.appendChild(el('span', 'dot ' + (m.enabled === false ? 'off' : 'on')));
      sub.appendChild(el('span', null, HOST + '/' + String(m.id).slice(0, 8) + '\u2026'));
      who.appendChild(name); who.appendChild(sub);
      var actions = el('div', 'actions');
      actions.appendChild(act('\u590d\u5236\u8ba2\u9605', function (e) { e.stopPropagation(); copy(subLink(m.id), '\u8ba2\u9605\u94fe\u63a5\u5df2\u590d\u5236'); }));
      if (!m.owner) actions.appendChild(act(m.enabled === false ? '\u542f\u7528' : '\u505c\u7528', function (e) { e.stopPropagation(); toggle(m); }));
      var chev = el('span', 'chev'); chev.innerHTML = '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M9 6l6 6-6 6"/></svg>';
      actions.appendChild(chev);
      row.appendChild(who); row.appendChild(actions);
      row.addEventListener('click', function () { openMember(m); });
      box.appendChild(row);
    });
    $('#reg-count').textContent = users.length + ' \u4f4d';
  }
  function badge(c, t) { return el('span', 'badge ' + c, t); }
  function act(t, fn) { var b = el('button', 'act', t); b.addEventListener('click', fn); return b; }

  /* ---- network ---- */
  function renderNetwork() {
    var wrap = $('#net-body');
    if (!net || !net.nodes || !net.nodes.length) {
      wrap.innerHTML = '<div class="net-empty"><div class="ne-t">\u5c1a\u672a\u751f\u6210\u4f18\u9009\u8282\u70b9</div><div class="ne-d">\u9996\u6b21\u8bbf\u95ee\u4f1a\u5728\u540e\u53f0\u81ea\u52a8\u62c9\u53d6\uff1b\u4e5f\u53ef\u7acb\u5373\u624b\u52a8\u4f18\u9009\u3002</div></div>';
      return;
    }
    var alive = net.alive != null ? net.alive : net.nodes.length;
    var checked = net.checked != null ? net.checked : net.nodes.length;
    var msList = net.nodes.map(function (x) { return x.ms; }).filter(function (m) { return typeof m === 'number'; });
    var minMs = msList.length ? Math.min.apply(null, msList) : 0;
    var maxMs = msList.length ? Math.max.apply(null, msList) : 0;
    var elapsedMin = net.updated ? (Date.now() - net.updated) / 60000 : null;
    var cyclePct = elapsedMin == null ? 0 : Math.max(0, Math.min(1, elapsedMin / TTL_MIN));

    var nodesHtml = net.nodes.map(function (nd) {
      var w = (typeof nd.ms === 'number' && nd.ms > 0 && minMs > 0) ? Math.max(0.12, minMs / nd.ms) : 0.5;
      var msTxt = typeof nd.ms === 'number' ? nd.ms + ' ms' : '\u2014';
      return '<div class="node"><div style="display:flex;align-items:baseline;gap:10px">' +
        '<span class="addr">' + esc(nd.addr) + '</span><span class="note">' + esc(nd.note || '') + '</span></div>' +
        '<div class="ms">' + msTxt + '</div><div class="bar"><i style="transform:scaleX(' + w.toFixed(3) + ')"></i></div></div>';
    }).join('');

    var latRange = msList.length ? (minMs + '\u2013' + maxMs + ' ms') : '\u2014';

    wrap.innerHTML =
      '<div class="net-top"><div class="donut">' + buildDonut(alive, checked) + '</div>' +
        '<div class="net-stat"><div class="big"><span class="n num">' + alive + '</span><span class="of num">/ ' + checked + '</span></div>' +
        '<div class="lbl">\u8282\u70b9\u5b58\u6d3b \u00b7 \u81ea\u68c0\u901a\u8fc7</div>' +
        '<div class="autopill"><span class="dot on"></span> \u81ea\u52a8\u4f18\u9009 \u00b7 \u6bcf 12h</div></div></div>' +
      '<div class="chart-block"><div class="cc-head"><span class="cc-label">\u4f18\u9009\u5386\u53f2 \u00b7 \u8fd1 ' + net.history.length + ' \u6b21</span><span class="cc-val"><b>' + alive + '</b> \u5b58\u6d3b</span></div><div class="spark">' + buildSpark(net.history) + '</div></div>' +
      '<div class="chart-block"><div class="cc-head"><span class="cc-label">\u8282\u70b9\u5ef6\u8fdf \u00b7 \u6309\u6beb\u79d2\u6392\u5e8f</span><span class="cc-val mono">' + latRange + '</span></div><div class="nodes">' + nodesHtml + '</div></div>' +
      '<div class="cycle"><div class="cycle-top"><span class="cycle-k">\u81ea\u52a8\u4f18\u9009\u5468\u671f</span><span class="cycle-next mono">' + (elapsedMin == null ? '\u5f85\u9996\u6b21' : '\u7ea6 ' + ((TTL_MIN - elapsedMin) / 60).toFixed(1) + 'h \u540e') + '</span></div>' +
        '<div class="cycle-track"><i class="cycle-fill" style="width:' + (cyclePct * 100) + '%"></i><span class="cycle-dot" style="left:' + (cyclePct * 100) + '%"></span></div>' +
        '<div class="cycle-meta"><span>\u4e0a\u6b21 \u00b7 <b>' + fmtDur(elapsedMin) + '</b> \u524d</span><span>\u4e0b\u6b21\u81ea\u52a8\u5237\u65b0</span></div></div>' +
      '<div class="synced"><span class="t">\u6765\u6e90 \u00b7 ' + (net.sources || 1) + ' \u4e2a \u00b7 TCP \u81ea\u68c0\u901a\u8fc7</span><button class="btn ghost sm" id="btn-refresh">\u7acb\u5373\u4f18\u9009</button></div>';
    $('#btn-refresh').addEventListener('click', refreshNow);
  }
  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }

  /* ---- actions ---- */
  async function addMember() {
    var i = $('#newName'); var name = i.value.trim();
    if (!name) { i.focus(); return; }
    await api('/users', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ name: name.slice(0, 40) }) });
    i.value = ''; await load(); toast('\u5df2\u6dfb\u52a0 ' + name);
  }
  async function toggle(m) {
    await api('/users/' + m.id, { method: 'PATCH', headers: { 'content-type': 'application/json' }, body: JSON.stringify({ enabled: m.enabled === false }) });
    await load();
    if (currentMember === m.id) { var nm = users.filter(function (x) { return x.id === m.id; })[0]; if (nm) fillMember(nm); }
    toast(m.enabled === false ? (m.name + ' \u5df2\u542f\u7528') : (m.name + ' \u5df2\u505c\u7528'));
  }
  async function removeMember(m) {
    if (!window.confirm('\u5220\u9664\u300c' + m.name + '\u300d\uff1f\u5176\u8ba2\u9605\u5c06\u7acb\u5373\u5931\u6548\u3002')) return;
    await api('/users/' + m.id, { method: 'DELETE' });
    closeSheet(); await load(); toast(m.name + ' \u5df2\u79fb\u9664');
  }

  /* ---- member sheet ---- */
  function openMember(m) { currentMember = m.id; fillMember(m); openSheet('#sheet'); }
  function fillMember(m) {
    $('#sh-name').textContent = m.name;
    var meta = $('#sh-meta'); meta.innerHTML = '';
    var d = el('span', 'dot ' + (m.enabled === false ? 'off' : 'on')); d.style.marginRight = '8px'; d.style.verticalAlign = 'middle';
    meta.appendChild(d);
    meta.appendChild(document.createTextNode((m.owner ? '\u7ad9\u957f \u00b7 ' : '') + (m.enabled === false ? '\u5df2\u505c\u7528 \u00b7 \u8ba2\u9605\u5931\u6548' : '\u5728\u7ebf \u00b7 \u8ba2\u9605\u6709\u6548')));
    $('#sh-link').textContent = subLink(m.id);
    var imp = $('#sh-imports'); imp.innerHTML = '';
    imp.appendChild(importCard('Clash', 'clash:// \u00b7 YAML', function () { location.href = clashImport(m.id, m.name); }));
    imp.appendChild(importCard('sing-box', 'JSON', function () { location.href = singboxLink(m.id); }));
    imp.appendChild(importCard('v2rayN', 'Base64', function () { copy(subLink(m.id) + '?target=base64', '\u901a\u7528\u8ba2\u9605\u5df2\u590d\u5236'); }));
    imp.appendChild(importCard('\u901a\u7528 / \u5176\u5b83', 'auto \u00b7 UA \u9002\u914d', function () { copy(subLink(m.id), '\u8ba2\u9605\u94fe\u63a5\u5df2\u590d\u5236'); }));
    var qr = $('#sh-qr'); if (qr) { var img = el('img'); img.alt = 'QR'; img.src = BASE + '/qr?text=' + encodeURIComponent(subLink(m.id)); qr.innerHTML = ''; qr.appendChild(img); }
    var foot = $('#sh-foot'); foot.innerHTML = '';
    if (m.owner) {
      var p = el('div', 'kicker', '\u7ad9\u957f\u8d26\u53f7\u53d7\u4fdd\u62a4 \u00b7 \u4e0d\u53ef\u505c\u7528\u6216\u79fb\u9664'); p.style.padding = '6px 0'; foot.appendChild(p);
    } else {
      var tog = el('button', 'btn ghost', m.enabled === false ? '\u542f\u7528\u8ba2\u9605' : '\u505c\u7528\u8ba2\u9605');
      tog.addEventListener('click', function () { toggle(m); });
      var del = el('button', 'btn', '\u79fb\u9664\u6210\u5458');
      del.style.borderColor = 'var(--accent)'; del.style.color = 'var(--accent)';
      del.addEventListener('click', function () { removeMember(m); });
      foot.appendChild(tog); foot.appendChild(del);
    }
  }
  function importCard(name, fmt, fn) {
    var c = el('div', 'import-card');
    c.appendChild(el('span', 'ic-name', name)); c.appendChild(el('span', 'ic-fmt', fmt));
    c.addEventListener('click', fn); return c;
  }

  /* ---- settings ---- */
  function openSettings() {
    $('#set-proxyIP').value = settings.proxyIP || '';
    $('#set-subName').value = settings.subName || 'Agora';
    $('#set-sourceUrl').value = settings.sourceUrl || '';
    $('#set-auto').checked = settings.autoRefresh !== false;
    openSheet('#settings');
  }
  async function saveSettings() {
    var body = {
      proxyIP: $('#set-proxyIP').value.trim(),
      subName: $('#set-subName').value.trim() || 'Agora',
      sourceUrl: $('#set-sourceUrl').value.trim(),
      autoRefresh: $('#set-auto').checked
    };
    await api('/settings', { method: 'POST', headers: { 'content-type': 'application/json' }, body: JSON.stringify(body) });
    closeSheet(); await load(); toast('\u8bbe\u7f6e\u5df2\u4fdd\u5b58 \u00b7 \u5373\u65f6\u751f\u6548');
  }
  async function refreshNow() {
    var btn = $('#btn-refresh'); if (!btn) return;
    btn.disabled = true; btn.textContent = '\u6b63\u5728\u81ea\u68c0\u2026';
    var r = await api('/refresh', { method: 'POST' });
    await load();
    if (r && r.ok) toast('\u5df2\u91cd\u65b0\u4f18\u9009 \u00b7 ' + r.count + ' \u4e2a\u8282\u70b9\u5b58\u6d3b');
    else toast('\u5237\u65b0\u5931\u8d25 \u00b7 \u6765\u6e90\u4e0d\u53ef\u8fbe');
  }

  /* ---- sheet plumbing ---- */
  function openSheet(sel) { $('#scrim').classList.add('show'); $(sel).classList.add('show'); }
  function closeSheet() {
    $('#scrim').classList.remove('show');
    $('#sheet').classList.remove('show'); $('#settings').classList.remove('show');
    currentMember = null;
  }

  /* ---- init ---- */
  function init() {
    $('#newName').addEventListener('keydown', function (e) { if (e.key === 'Enter') addMember(); });
    $('#add-btn').addEventListener('click', addMember);
    $('#gear').addEventListener('click', openSettings);
    $('#scrim').addEventListener('click', closeSheet);
    $$('.sheet .x').forEach(function (x) { x.addEventListener('click', closeSheet); });
    $('#sh-copy').addEventListener('click', function () { copy($('#sh-link').textContent, '\u8ba2\u9605\u94fe\u63a5\u5df2\u590d\u5236'); });
    $('#set-save').addEventListener('click', saveSettings);
    $('#set-cancel').addEventListener('click', closeSheet);
    document.addEventListener('keydown', function (e) { if (e.key === 'Escape') closeSheet(); });
    load();
  }
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', init); else init();
})();
