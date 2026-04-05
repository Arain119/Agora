// Single shared shell for both user panel (/user) and admin panel (/admin)
// isAdmin controls visibility of admin-only pages
export function shellHTML(isAdmin: boolean): string {
  const title = isAdmin ? 'New API - 管理控制台' : 'New API - 用户中心'
  const logoTag = isAdmin
    ? `<span style="font-size:10px;background:rgba(208,48,80,0.3);color:#f87171;padding:1px 6px;border-radius:4px;margin-left:4px">Admin</span>`
    : `<span style="font-size:10px;background:rgba(24,160,88,0.3);color:#4ade80;padding:1px 6px;border-radius:4px;margin-left:4px">User</span>`
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>${title}</title>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <script src="https://cdn.jsdelivr.net/npm/chart.js@4.4.0/dist/chart.umd.min.js"></script>
  <script src="https://cdn.jsdelivr.net/npm/marked@9.0.0/marked.min.js"></script>
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: #2080f0; --primary-hover: #1060c0; --primary-light: rgba(32,128,240,0.08);
      --bg: #f5f7fa; --white: #ffffff; --sidebar-bg: #001833;
      --border: #e8e8ee; --border-light: #f0f0f6;
      --text: #333640; --text-muted: #888ba0; --text-secondary: #666878;
      --shadow: 0 1px 8px rgba(0,0,0,0.06); --shadow-md: 0 2px 16px rgba(0,0,0,0.08);
      --radius: 8px; --sidebar-w: 220px; --header-h: 56px;
      --green: #18a058; --green-light: rgba(24,160,88,0.1);
      --red: #d03050;   --red-light: rgba(208,48,80,0.1);
      --orange: #f0a020; --orange-light: rgba(240,160,32,0.1);
      --blue: #2080f0;  --blue-light: rgba(32,128,240,0.1);
      --purple: #722ed1; --purple-light: rgba(114,46,209,0.1);
      --teal: #13c2c2;  --teal-light: rgba(19,194,194,0.1);
      --pink: #eb2f96;  --pink-light: rgba(235,47,150,0.1);
    }
    html, body { height: 100%; }
    body { background: var(--bg); color: var(--text); font-family: -apple-system,BlinkMacSystemFont,'Segoe UI','PingFang SC',sans-serif; font-size: 14px; display: flex; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: transparent; }
    ::-webkit-scrollbar-thumb { background: #d0d0dc; border-radius: 3px; }

    /* ── SIDEBAR ── */
    .sidebar { width: var(--sidebar-w); background: var(--sidebar-bg); display: flex; flex-direction: column; position: fixed; inset: 0 auto 0 0; z-index: 200; }
    .sidebar-logo { height: var(--header-h); display: flex; align-items: center; gap: 10px; padding: 0 16px; border-bottom: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
    .logo-icon { width: 32px; height: 32px; background: var(--primary); border-radius: 8px; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 14px; flex-shrink: 0; }
    .logo-text { color: #fff; font-size: 15px; font-weight: 700; }
    .sidebar-nav { flex: 1; overflow-y: auto; padding: 8px 0; }
    .nav-section-label { padding: 12px 16px 4px; font-size: 11px; color: rgba(255,255,255,0.35); letter-spacing: .8px; text-transform: uppercase; }
    .nav-item { display: flex; align-items: center; gap: 10px; padding: 9px 16px; margin: 1px 8px; border-radius: 6px; cursor: pointer; color: rgba(255,255,255,0.75); font-size: 13px; transition: all .15s; user-select: none; }
    .nav-item:hover { background: rgba(255,255,255,0.08); color: #fff; }
    .nav-item.active { background: var(--primary); color: #fff; }
    .nav-item .ni { width: 16px; text-align: center; font-size: 13px; flex-shrink: 0; opacity: .85; }
    .nav-item.active .ni { opacity: 1; }
    .nav-badge { margin-left: auto; background: rgba(255,255,255,0.15); color: rgba(255,255,255,0.8); font-size: 11px; padding: 1px 7px; border-radius: 10px; font-weight: 500; }
    .nav-item.active .nav-badge { background: rgba(255,255,255,0.25); }
    .sidebar-footer { padding: 10px 8px; border-top: 1px solid rgba(255,255,255,0.06); flex-shrink: 0; }
    .sidebar-user { display: flex; align-items: center; gap: 10px; padding: 8px; border-radius: 6px; cursor: pointer; transition: background .15s; }
    .sidebar-user:hover { background: rgba(255,255,255,0.08); }
    .user-av { width: 30px; height: 30px; border-radius: 50%; display: flex; align-items: center; justify-content: center; color: #fff; font-size: 12px; flex-shrink: 0; }
    .user-name { color: rgba(255,255,255,0.85); font-size: 13px; line-height: 1.2; }
    .user-role { color: rgba(255,255,255,0.4); font-size: 11px; }

    /* ── MAIN ── */
    .main-wrap { margin-left: var(--sidebar-w); flex: 1; display: flex; flex-direction: column; min-height: 100vh; }
    .header { height: var(--header-h); background: #fff; border-bottom: 1px solid var(--border); display: flex; align-items: center; padding: 0 24px; gap: 12px; position: sticky; top: 0; z-index: 100; }
    .breadcrumb { display: flex; align-items: center; gap: 6px; font-size: 13px; color: var(--text-muted); flex: 1; }
    .breadcrumb-cur { color: var(--text); font-weight: 500; }
    .hdr-btn { height: 32px; padding: 0 14px; border: 1px solid var(--border); border-radius: 6px; background: #fff; color: var(--text); font-size: 13px; cursor: pointer; display: flex; align-items: center; gap: 6px; transition: all .15s; text-decoration: none; }
    .hdr-btn:hover { background: var(--bg); }
    .hdr-btn.primary { background: var(--primary); color: #fff; border-color: var(--primary); }
    .hdr-btn.primary:hover { background: var(--primary-hover); }
    .hdr-icon-btn { width: 36px; height: 36px; border: 1px solid var(--border); border-radius: 6px; background: #fff; color: var(--text-muted); cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all .15s; }
    .hdr-icon-btn:hover { background: var(--bg); color: var(--text); }
    .content { padding: 24px; flex: 1; }
    .page { display: none; }
    .page.active { display: block; }

    /* ── CARD ── */
    .card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .card-header { padding: 16px 20px; border-bottom: 1px solid var(--border-light); display: flex; align-items: center; gap: 12px; }
    .card-title { font-size: 15px; font-weight: 600; color: var(--text); flex: 1; }
    .card-extra { display: flex; align-items: center; gap: 8px; }
    .card-body { padding: 20px; }

    /* ── STATS ── */
    .stats-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 16px; margin-bottom: 24px; }
    .stat-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; display: flex; align-items: center; gap: 16px; }
    .stat-card:hover { box-shadow: var(--shadow-md); }
    .stat-icon { width: 48px; height: 48px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 20px; flex-shrink: 0; }
    .si-blue { background: var(--blue-light); color: var(--blue); }
    .si-green { background: var(--green-light); color: var(--green); }
    .si-orange { background: var(--orange-light); color: var(--orange); }
    .si-purple { background: var(--purple-light); color: var(--purple); }
    .stat-label { font-size: 12px; color: var(--text-muted); margin-bottom: 4px; }
    .stat-value { font-size: 24px; font-weight: 700; color: var(--text); line-height: 1.2; }
    .stat-sub { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    /* ── TABLE ── */
    .table-wrap { overflow-x: auto; }
    table { width: 100%; border-collapse: collapse; }
    th { padding: 10px 16px; text-align: left; font-size: 12px; font-weight: 600; color: var(--text-muted); background: var(--bg); border-bottom: 1px solid var(--border); white-space: nowrap; }
    td { padding: 11px 16px; border-bottom: 1px solid var(--border-light); vertical-align: middle; }
    tr:last-child td { border-bottom: none; }
    tr:hover td { background: rgba(0,0,0,0.01); }

    /* ── BADGE ── */
    .badge { display: inline-flex; align-items: center; gap: 3px; padding: 2px 8px; border-radius: 4px; font-size: 11px; font-weight: 500; white-space: nowrap; }
    .bd-success { background: var(--green-light); color: var(--green); }
    .bd-danger  { background: var(--red-light);   color: var(--red); }
    .bd-warning { background: var(--orange-light); color: var(--orange); }
    .bd-info    { background: var(--blue-light);   color: var(--blue); }
    .bd-purple  { background: var(--purple-light); color: var(--purple); }
    .bd-teal    { background: var(--teal-light);   color: var(--teal); }

    /* ── BUTTON ── */
    .btn { display: inline-flex; align-items: center; gap: 5px; padding: 6px 14px; border-radius: 6px; font-size: 13px; font-weight: 500; cursor: pointer; border: none; transition: all .15s; }
    .btn-sm { padding: 4px 10px; font-size: 12px; }
    .btn-xs { padding: 2px 8px; font-size: 11px; }
    .btn-primary { background: var(--primary); color: #fff; }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-default { background: #fff; border: 1px solid var(--border); color: var(--text); }
    .btn-default:hover { background: var(--bg); }
    .btn-danger { background: var(--red-light); color: var(--red); border: 1px solid transparent; }
    .btn-danger:hover { background: var(--red); color: #fff; }
    .btn-icon { width: 28px; height: 28px; padding: 0; display: inline-flex; align-items: center; justify-content: center; background: none; border: 1px solid transparent; border-radius: 6px; color: var(--text-muted); cursor: pointer; font-size: 12px; }
    .btn-icon:hover { background: var(--bg); color: var(--primary); border-color: var(--border); }

    /* ── SWITCH ── */
    .switch { position: relative; display: inline-flex; align-items: center; cursor: pointer; }
    .switch input { opacity: 0; width: 0; height: 0; position: absolute; }
    .sw-track { width: 36px; height: 20px; background: #d0d0dc; border-radius: 10px; transition: background .2s; }
    .switch input:checked ~ .sw-track { background: var(--green); }
    .sw-thumb { position: absolute; left: 3px; width: 14px; height: 14px; background: #fff; border-radius: 50%; transition: transform .2s; box-shadow: 0 1px 3px rgba(0,0,0,.2); }
    .switch input:checked ~ .sw-thumb { transform: translateX(16px); }

    /* ── FORM ── */
    .form-group { margin-bottom: 16px; }
    .form-label { display: block; font-size: 13px; font-weight: 500; color: var(--text); margin-bottom: 6px; }
    .form-control { width: 100%; height: 36px; padding: 0 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; color: var(--text); background: #fff; outline: none; transition: border-color .15s; }
    .form-control:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(32,128,240,.1); }
    .form-input { height: 34px; padding: 0 12px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; color: var(--text); outline: none; background: #fff; }
    .form-input:focus { border-color: var(--primary); }
    .form-select { height: 32px; padding: 0 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 13px; background: #fff; cursor: pointer; }

    /* ── KEY BAR ── */
    .key-bar { height: 4px; background: var(--border); border-radius: 2px; overflow: hidden; margin-top: 4px; }
    .key-bar-fill { height: 100%; background: var(--primary); border-radius: 2px; transition: width .3s; }

    /* ── MODEL GRID ── */
    .model-grid { display: grid; grid-template-columns: repeat(auto-fill,minmax(220px,1fr)); gap: 12px; }
    .model-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 14px; transition: all .15s; }
    .model-card:hover { box-shadow: var(--shadow-md); border-color: rgba(32,128,240,.3); }
    .mc-header { display: flex; align-items: flex-start; gap: 10px; margin-bottom: 8px; }
    .mc-icon { width: 36px; height: 36px; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 14px; flex-shrink: 0; }
    .mc-name { font-size: 13px; font-weight: 600; color: var(--text); word-break: break-all; line-height: 1.3; }
    .mc-vendor { font-size: 11px; color: var(--text-muted); margin-top: 2px; }
    .mc-tags { display: flex; flex-wrap: wrap; gap: 4px; margin-bottom: 10px; }
    .mc-tag { font-size: 11px; padding: 2px 7px; border-radius: 4px; }
    .model-pill { font-size: 11px; background: var(--bg); border: 1px solid var(--border); padding: 2px 8px; border-radius: 10px; color: var(--text-secondary); max-width: 180px; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; display: inline-block; }

    /* ── VENDOR / TYPE CHIPS ── */
    .vendor-filters { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
    .vendor-chip { display: inline-flex; align-items: center; gap: 5px; padding: 5px 12px; border-radius: 20px; font-size: 12px; font-weight: 500; border: 1.5px solid var(--border); background: #fff; color: var(--text-secondary); cursor: pointer; transition: all .15s; user-select: none; }
    .vendor-chip:hover { border-color: var(--primary); color: var(--primary); }
    .vendor-chip.active { border-color: var(--primary); background: var(--primary); color: #fff; }
    .chip-count { font-size: 10px; opacity: .8; }

    /* ── CODE BLOCK ── */
    .code-block { background: #1a1f2e; border-radius: var(--radius); overflow: auto; }
    .code-block pre { padding: 16px; font-family: 'JetBrains Mono','Fira Code',Consolas,monospace; font-size: 12px; line-height: 1.6; color: #e2e8f0; white-space: pre; }
    .code-block .kw { color: #79c0ff; } .code-block .str { color: #a5d6ff; }
    .code-block .num { color: #ffa657; } .code-block .cm { color: #8b949e; font-style: italic; }

    /* ── TABS ── */
    .tab-bar { display: flex; border-bottom: 1px solid var(--border); margin-bottom: 0; }
    .tab { padding: 10px 18px; font-size: 13px; font-weight: 500; color: var(--text-muted); cursor: pointer; border-bottom: 2px solid transparent; margin-bottom: -1px; transition: all .15s; }
    .tab:hover { color: var(--text); }
    .tab.active { color: var(--primary); border-bottom-color: var(--primary); }

    /* ── MODAL ── */
    .modal-overlay { position: fixed; inset: 0; background: rgba(0,0,0,.4); z-index: 1000; display: flex; align-items: center; justify-content: center; opacity: 0; pointer-events: none; transition: opacity .2s; }
    .modal-overlay.open { opacity: 1; pointer-events: all; }
    .modal { background: #fff; border-radius: 10px; width: 460px; max-width: 90vw; box-shadow: 0 8px 40px rgba(0,0,0,.15); transform: translateY(-12px); transition: transform .2s; }
    .modal-overlay.open .modal { transform: translateY(0); }
    .modal-header { padding: 18px 20px; border-bottom: 1px solid var(--border); display: flex; align-items: center; }
    .modal-title { font-size: 15px; font-weight: 600; flex: 1; }
    .modal-close { width: 28px; height: 28px; border: none; background: none; color: var(--text-muted); cursor: pointer; border-radius: 4px; font-size: 14px; display: flex; align-items: center; justify-content: center; }
    .modal-close:hover { background: var(--bg); }
    .modal-body { padding: 20px; }
    .modal-footer { padding: 16px 20px; border-top: 1px solid var(--border); display: flex; justify-content: flex-end; gap: 8px; }

    /* ── SETTINGS ── */
    .settings-section { margin-bottom: 20px; }
    .settings-label { font-size: 11px; font-weight: 600; color: var(--text-muted); letter-spacing: .8px; text-transform: uppercase; margin-bottom: 12px; }
    .settings-item { display: flex; align-items: center; gap: 16px; padding: 12px 0; border-bottom: 1px solid var(--border-light); }
    .settings-item:last-child { border-bottom: none; }
    .si-info { flex: 1; }
    .si-title { font-size: 13px; font-weight: 500; color: var(--text); }
    .si-desc { font-size: 12px; color: var(--text-muted); margin-top: 2px; }

    /* ── MISC ── */
    .dash-row { display: grid; grid-template-columns: 1fr 300px; gap: 16px; margin-bottom: 16px; }
    .chart-wrap { height: 220px; position: relative; }
    .loading-box { padding: 32px; text-align: center; color: var(--text-muted); font-size: 13px; }
    .empty-box { padding: 40px 20px; text-align: center; color: var(--text-muted); }
    .empty-icon { font-size: 32px; margin-bottom: 12px; opacity: .3; }
    .spin { display: inline-block; animation: spin 1s linear infinite; }
    @keyframes spin { to { transform: rotate(360deg); } }
    .pagination { display: flex; align-items: center; gap: 4px; }
    .page-btn { min-width: 30px; height: 30px; border: 1px solid var(--border); border-radius: 6px; background: #fff; color: var(--text); font-size: 13px; cursor: pointer; display: flex; align-items: center; justify-content: center; padding: 0 6px; }
    .page-btn:hover { background: var(--bg); }
    .page-btn.active { background: var(--primary); color: #fff; border-color: var(--primary); }
    .page-info { margin-left: 8px; font-size: 12px; color: var(--text-muted); }
    .alert { padding: 10px 14px; border-radius: 6px; font-size: 13px; margin-bottom: 12px; display: none; }
    .alert.show { display: block; }
    .alert-success { background: var(--green-light); color: var(--green); border: 1px solid rgba(24,160,88,.2); }
    .alert-error { background: var(--red-light); color: var(--red); border: 1px solid rgba(208,48,80,.2); }

    /* ── WELCOME BANNER ── */
    .welcome-banner { background: linear-gradient(135deg,#001833 0%,#0a3060 100%); border-radius: var(--radius); padding: 28px 32px; color: #fff; margin-bottom: 24px; position: relative; overflow: hidden; }
    .welcome-banner::before { content:''; position:absolute; right:-40px; top:-40px; width:200px; height:200px; background:rgba(255,255,255,.03); border-radius:50%; }
    .wb-title { font-size: 22px; font-weight: 700; margin-bottom: 6px; }
    .wb-sub { font-size: 14px; color: rgba(255,255,255,.65); margin-bottom: 16px; }
    .wb-tags { display: flex; flex-wrap: wrap; gap: 8px; }
    .wb-tag { background: rgba(255,255,255,.1); border: 1px solid rgba(255,255,255,.15); color: rgba(255,255,255,.8); padding: 4px 12px; border-radius: 20px; font-size: 12px; }
    .feature-grid { display: grid; grid-template-columns: repeat(4,1fr); gap: 12px; margin-bottom: 24px; }
    .feature-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 16px; display: flex; align-items: flex-start; gap: 12px; }
    .fc-icon { width: 40px; height: 40px; border-radius: 10px; display: flex; align-items: center; justify-content: center; font-size: 16px; flex-shrink: 0; }
    .fc-title { font-size: 13px; font-weight: 600; color: var(--text); margin-bottom: 4px; }
    .fc-desc { font-size: 12px; color: var(--text-muted); line-height: 1.5; }
    .info-grid { display: grid; grid-template-columns: repeat(3,1fr); gap: 16px; margin-bottom: 20px; }
    .info-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 20px; }
    .ic-label { font-size: 12px; color: var(--text-muted); margin-bottom: 8px; }
    .ic-val { display: flex; align-items: center; gap: 8px; }
    .ic-code { font-size: 13px; background: var(--bg); border: 1px solid var(--border); padding: 6px 12px; border-radius: 6px; color: var(--primary); flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: monospace; }

    /* ── CHAT PAGE ── */
    .chat-layout { display: flex; gap: 16px; height: calc(100vh - var(--header-h) - 48px); }
    .chat-sidebar { width: 256px; flex-shrink: 0; display: flex; flex-direction: column; gap: 10px; overflow-y: auto; }
    .chat-main { flex: 1; display: flex; flex-direction: column; min-width: 0; background: #fff; border: 1px solid var(--border); border-radius: var(--radius); overflow: hidden; }
    .chat-messages { flex: 1; overflow-y: auto; padding: 20px; display: flex; flex-direction: column; gap: 16px; }
    .chat-msg { display: flex; gap: 12px; max-width: 88%; }
    .chat-msg.user { flex-direction: row-reverse; align-self: flex-end; }
    .chat-msg.assistant { align-self: flex-start; }
    .chat-avatar { width: 32px; height: 32px; border-radius: 50%; flex-shrink: 0; display: flex; align-items: center; justify-content: center; font-size: 13px; }
    .chat-msg.user .chat-avatar { background: var(--primary); color: #fff; }
    .chat-msg.assistant .chat-avatar { background: var(--bg); color: var(--text-muted); border: 1px solid var(--border); }
    .chat-bubble { padding: 10px 14px; border-radius: 12px; font-size: 14px; line-height: 1.65; max-width: 100%; word-break: break-word; }
    .chat-msg.user .chat-bubble { background: var(--primary); color: #fff; border-radius: 12px 4px 12px 12px; }
    .chat-msg.assistant .chat-bubble { background: var(--bg); color: var(--text); border: 1px solid var(--border); border-radius: 4px 12px 12px 12px; }
    .chat-bubble.streaming::after { content: '▋'; animation: blink .8s infinite; color: var(--primary); }
    .chat-msg.user .chat-bubble.streaming::after { color: rgba(255,255,255,.7); }
    @keyframes blink { 50% { opacity: 0; } }
    .chat-bubble img { max-width: 100%; border-radius: 8px; margin-top: 8px; display: block; }
    .chat-bubble p { margin-bottom: 8px; } .chat-bubble p:last-child { margin-bottom: 0; }
    .chat-bubble pre { background: rgba(0,0,0,.06); padding: 10px 12px; border-radius: 6px; overflow-x: auto; font-size: 12px; margin: 8px 0; }
    .chat-msg.user .chat-bubble pre { background: rgba(255,255,255,.15); }
    .chat-bubble code { font-family: monospace; font-size: 12px; background: rgba(0,0,0,.06); padding: 1px 5px; border-radius: 4px; }
    .chat-msg.user .chat-bubble code { background: rgba(255,255,255,.2); }
    .chat-bubble ul,.chat-bubble ol { padding-left: 20px; margin: 4px 0; }
    .chat-bubble h1,.chat-bubble h2,.chat-bubble h3 { font-weight:600; margin: 8px 0 4px; }
    .chat-input-area { padding: 10px 14px; border-top: 1px solid var(--border); background: #fff; }
    .chat-input-row { display: flex; gap: 8px; align-items: flex-end; }
    .chat-textarea { flex: 1; resize: none; border: 1px solid var(--border); border-radius: 8px; padding: 9px 12px; font-size: 14px; font-family: inherit; outline: none; line-height: 1.5; max-height: 160px; min-height: 40px; transition: border-color .15s; overflow-y: auto; }
    .chat-textarea:focus { border-color: var(--primary); box-shadow: 0 0 0 2px rgba(32,128,240,.1); }
    .chat-send-btn { width: 40px; height: 40px; border-radius: 8px; background: var(--primary); color: #fff; border: none; cursor: pointer; display: flex; align-items: center; justify-content: center; font-size: 14px; transition: all .15s; flex-shrink: 0; }
    .chat-send-btn:hover { background: var(--primary-hover); }
    .chat-send-btn:disabled { background: #d0d0dc; cursor: not-allowed; }
    .chat-cfg-card { background: #fff; border: 1px solid var(--border); border-radius: var(--radius); padding: 12px 14px; }
    .chat-cfg-card .cfg-title { font-size: 12px; font-weight: 600; color: var(--text); margin-bottom: 10px; display:flex; align-items:center; gap:6px; cursor:pointer; user-select:none; }
    .chat-cfg-card .cfg-title i.arrow { margin-left:auto; font-size:11px; color:var(--text-muted); transition:transform .2s; }
    .chat-cfg-card.collapsed .cfg-title i.arrow { transform: rotate(-90deg); }
    .chat-cfg-card.collapsed .cfg-body { display:none; }
    .cfg-label { font-size: 11px; font-weight: 600; color: var(--text-muted); letter-spacing: .5px; text-transform: uppercase; margin-bottom: 6px; }
    .cfg-select { width: 100%; height: 32px; padding: 0 8px; border: 1px solid var(--border); border-radius: 6px; font-size: 12px; background: #fff; cursor: pointer; outline: none; }
    .cfg-select:focus { border-color: var(--primary); }
    .cfg-row { margin-bottom: 10px; }
    .cfg-row:last-child { margin-bottom: 0; }
    .cfg-range { width: 100%; margin: 4px 0; accent-color: var(--primary); }
    .cfg-val { font-size: 12px; color: var(--text-muted); float: right; }
    .chat-empty { flex: 1; display: flex; flex-direction: column; align-items: center; justify-content: center; color: var(--text-muted); gap: 12px; }
    .chat-empty-icon { font-size: 48px; opacity: .15; }
    .sys-prompt-wrap { margin-top: 6px; }
    .sys-prompt-ta { width:100%; border:1px solid var(--border); border-radius:6px; padding:8px 10px; font-size:12px; font-family:inherit; resize:vertical; min-height:60px; max-height:120px; outline:none; color:var(--text); line-height:1.5; }
    .sys-prompt-ta:focus { border-color:var(--primary); }
    .chat-hint { font-size:11px; color:var(--text-muted); padding: 4px 0 0; }

    /* ── THINK BLOCK ── */
    .think-block { margin-bottom: 8px; border: 1px solid rgba(114,46,209,0.2); border-radius: 8px; background: rgba(114,46,209,0.04); overflow: hidden; }
    .think-header { display: flex; align-items: center; gap: 6px; padding: 6px 12px; cursor: pointer; user-select: none; color: var(--purple); font-size: 12px; font-weight: 500; }
    .think-header:hover { background: rgba(114,46,209,0.06); }
    .think-header .think-icon { font-size: 11px; }
    .think-header .think-toggle { margin-left: auto; font-size: 10px; transition: transform .2s; color: var(--text-muted); }
    .think-block.collapsed .think-toggle { transform: rotate(-90deg); }
    .think-body { padding: 8px 12px 10px; border-top: 1px solid rgba(114,46,209,0.12); font-size: 12px; color: var(--text-secondary); line-height: 1.65; }
    .think-block.collapsed .think-body { display: none; }
    .think-body p { margin-bottom: 6px; } .think-body p:last-child { margin-bottom: 0; }
    .think-body pre { background: rgba(0,0,0,.04); padding: 8px 10px; border-radius: 5px; font-size: 11px; overflow-x: auto; }
    .think-streaming .think-header { animation: think-pulse 1.2s ease-in-out infinite; }
    @keyframes think-pulse { 0%,100% { opacity:1; } 50% { opacity:.6; } }

    /* ── ENDPOINT TABLE ── */
    .method-badge { padding: 2px 7px; border-radius: 4px; font-size: 11px; font-weight: 700; font-family: monospace; }
    .method-get  { background: var(--green-light); color: var(--green); }
    .method-post { background: var(--blue-light);  color: var(--blue); }
    .ep-path { font-family: monospace; font-size: 12px; color: var(--text-secondary); background: var(--bg); padding: 3px 8px; border-radius: 4px; border: 1px solid var(--border); }
  </style>
</head>
<body>

<!-- SIDEBAR -->
<nav class="sidebar">
  <div class="sidebar-logo">
    <div class="logo-icon"><i class="fas fa-robot"></i></div>
    <div><div class="logo-text">New API${logoTag}</div></div>
  </div>

  <div class="sidebar-nav">
    <div class="nav-section-label">通用</div>
    <div class="nav-item active" onclick="nav('home',this)">
      <span class="ni"><i class="fas fa-home"></i></span><span>首页</span>
    </div>
    <div class="nav-item" onclick="nav('chat',this)">
      <span class="ni"><i class="fas fa-comments"></i></span><span>对话测试</span>
      <span class="nav-badge" style="background:rgba(32,128,240,.25);color:#7ec8ff;font-size:10px">New</span>
    </div>
    <div class="nav-item" onclick="nav('models',this)">
      <span class="ni"><i class="fas fa-layer-group"></i></span><span>模型广场</span>
    </div>
    <div class="nav-item" onclick="nav('docs',this)">
      <span class="ni"><i class="fas fa-book-open"></i></span><span>接入文档</span>
    </div>
    <div class="nav-item" onclick="nav('endpoints',this)">
      <span class="ni"><i class="fas fa-plug"></i></span><span>API 端点</span>
    </div>

    ${isAdmin ? `
    <div class="nav-section-label" style="margin-top:8px">管理</div>
    <div class="nav-item" onclick="nav('overview',this)">
      <span class="ni"><i class="fas fa-tachometer-alt"></i></span><span>控制台</span>
    </div>
    <div class="nav-item" onclick="nav('channels',this)">
      <span class="ni"><i class="fas fa-server"></i></span><span>渠道管理</span>
      <span class="nav-badge" id="channel-count-badge">-</span>
    </div>
    <div class="nav-item" onclick="nav('tokens',this)">
      <span class="ni"><i class="fas fa-key"></i></span><span>令牌管理</span>
    </div>
    <div class="nav-item" onclick="nav('logs',this)">
      <span class="ni"><i class="fas fa-list-alt"></i></span><span>请求日志</span>
    </div>
    <div class="nav-item" onclick="nav('settings',this)">
      <span class="ni"><i class="fas fa-cog"></i></span><span>系统设置</span>
    </div>
    ` : ''}
  </div>

  <div class="sidebar-footer">
    ${isAdmin ? `
    <div class="sidebar-user" onclick="logout()">
      <div class="user-av" style="background:var(--red)"><i class="fas fa-user-shield"></i></div>
      <div><div class="user-name">管理员</div><div class="user-role">点击退出登录</div></div>
    </div>
    ` : `
    <div class="nav-item" onclick="window.location.href='/login'" style="color:rgba(255,255,255,.5)">
      <span class="ni"><i class="fas fa-sign-in-alt"></i></span><span>管理员入口</span>
    </div>
    `}
  </div>
</nav>

<!-- MAIN -->
<div class="main-wrap">
  <header class="header">
    <div class="breadcrumb">
      <span>New API</span>
      <span style="opacity:.4">/</span>
      <span class="breadcrumb-cur" id="page-title">首页</span>
    </div>
    <div style="flex:1"></div>
    <div style="display:flex;align-items:center;gap:8px">
      <span id="hdr-model-count" style="font-size:12px;color:var(--text-muted)"></span>
      ${isAdmin ? `
      <button class="hdr-icon-btn" onclick="refreshPage()" title="刷新"><i class="fas fa-sync-alt" id="refresh-icon"></i></button>
      <a href="/user" class="hdr-btn" style="text-decoration:none"><i class="fas fa-user"></i> 用户面板</a>
      ` : ``}
    </div>
  </header>

  <div class="content">

    <!-- ═══════════════════════ HOME ═══════════════════════ -->
    <div class="page active" id="page-home">
      <div class="welcome-banner">
        <div class="wb-title"><i class="fas fa-robot" style="margin-right:10px;opacity:.8"></i>NVIDIA NIM API 网关</div>
        <div class="wb-sub">OpenAI 兼容的 AI 模型统一接入平台，精选 Google · Qwen · DeepSeek · Moonshot · MiniMax · 阶跃星辰 · 智谱 AI 等顶尖供应商</div>
        <div class="wb-tags">
          <span class="wb-tag">✅ OpenAI 兼容</span>
          <span class="wb-tag">🌍 8 大供应商</span>
          <span class="wb-tag">⚡ 流式输出</span>
          <span class="wb-tag">💬 对话测试</span>
          <span class="wb-tag">🔐 令牌鉴权</span>
        </div>
      </div>
      <div class="feature-grid">
        <div class="feature-card">
          <div class="fc-icon" style="background:var(--blue-light);color:var(--blue)"><i class="fas fa-comments"></i></div>
          <div><div class="fc-title">对话 & 推理</div><div class="fc-desc">DeepSeek V3、Qwen3、Kimi K2、GLM 等顶级模型，支持流式与思考链</div></div>
        </div>
        <div class="feature-card">
          <div class="fc-icon" style="background:var(--green-light);color:var(--green)"><i class="fas fa-eye"></i></div>
          <div><div class="fc-title">视觉理解</div><div class="fc-desc">多模态视觉模型，支持图文混合输入理解图像内容</div></div>
        </div>
        <div class="feature-card">
          <div class="fc-icon" style="background:var(--teal-light);color:var(--teal)"><i class="fas fa-vector-square"></i></div>
          <div><div class="fc-title">嵌入 & 编码</div><div class="fc-desc">高质量文本嵌入，用于语义搜索、RAG 等场景</div></div>
        </div>
      </div>
      <div class="info-grid">
        <div class="info-card">
          <div class="ic-label"><i class="fas fa-link" style="margin-right:6px;color:var(--primary)"></i>Base URL</div>
          <div class="ic-val">
            <div class="ic-code" id="home-base-url">-</div>
            <button class="btn-icon" onclick="copyEl('home-base-url')"><i class="fas fa-copy"></i></button>
          </div>
        </div>
        <div class="info-card">
          <div class="ic-label"><i class="fas fa-key" style="margin-right:6px;color:var(--orange)"></i>API Key</div>
          <div class="ic-val">
            <div class="ic-code" style="font-size:12px">在${isAdmin ? '令牌管理页创建' : '管理后台获取'}</div>
            ${isAdmin ? `<button class="btn-icon" onclick="nav('tokens',null)"><i class="fas fa-arrow-right"></i></button>` : `<a href="/login" class="btn-icon"><i class="fas fa-external-link-alt"></i></a>`}
          </div>
        </div>
        <div class="info-card">
          <div class="ic-label"><i class="fas fa-check-circle" style="margin-right:6px;color:var(--green)"></i>服务状态</div>
          <div class="ic-val" style="gap:6px;flex-wrap:wrap">
            <span class="badge bd-success">正常运行</span>
            <span class="badge bd-purple" id="home-model-count">-</span>
          </div>
        </div>
      </div>
      <div class="card">
        <div class="card-header">
          <span class="card-title"><i class="fas fa-terminal" style="color:#4ade80;margin-right:8px"></i>快速开始</span>
          <button class="btn btn-default btn-sm" onclick="nav('chat',null)"><i class="fas fa-comments"></i> 在线测试</button>
          <button class="btn btn-default btn-sm" onclick="nav('docs',null)"><i class="fas fa-book-open"></i> 完整文档</button>
        </div>
        <div style="padding:0">
          <div class="tab-bar" style="padding:0 20px" id="quick-tab-bar">
            <div class="tab active" onclick="qTab(0,this)">Python 对话</div>
            <div class="tab" onclick="qTab(1,this)">cURL</div>
          </div>
          <div class="code-block" style="border-radius:0"><pre id="quick-code"></pre></div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════ CHAT ═══════════════════════ -->
    <div class="page" id="page-chat" style="height:calc(100vh - var(--header-h) - 48px);display:none;flex-direction:column">
      <div class="chat-layout">
        <!-- Config sidebar -->
        <div class="chat-sidebar">

          <!-- 模式 & 模型 -->
          <div class="chat-cfg-card">
            <div class="cfg-title" onclick="toggleCfgCard(this.closest('.chat-cfg-card'))">
              <i class="fas fa-sliders-h" style="color:var(--primary)"></i> 模型配置
              <i class="fas fa-chevron-down arrow"></i>
            </div>
            <div class="cfg-body">
              <div class="cfg-label">供应商</div>
              <div class="cfg-row">
                <select class="cfg-select" id="chat-vendor-select" onchange="onVendorChange()">
                  <option value="all">全部供应商</option>
                </select>
              </div>

              <div class="cfg-label">模型</div>
              <div class="cfg-row">
                <select class="cfg-select" id="chat-model-select" onchange="updateChatStatusBar()">
                  <option value="">加载中...</option>
                </select>
              </div>

              <div id="chat-mode-cfg">
                <div class="cfg-label" style="display:flex;align-items:center">温度 <span class="cfg-val" id="temperature-val" style="float:none;margin-left:auto">0.7</span></div>
                <div class="cfg-row">
                  <input type="range" class="cfg-range" id="cfg-temperature" min="0" max="2" step="0.1" value="0.7" oninput="document.getElementById('temperature-val').textContent=parseFloat(this.value).toFixed(1)">
                </div>
                <div class="cfg-label">最大 Token</div>
                <div class="cfg-row">
                  <select class="cfg-select" id="cfg-max-tokens">
                    <option value="512">512</option>
                    <option value="1024" selected>1024</option>
                    <option value="2048">2048</option>
                    <option value="4096">4096</option>
                    <option value="8192">8192</option>
                    <option value="32768">32k</option>
                  </select>
                </div>
                <div class="cfg-label" style="display:flex;align-items:center;justify-content:space-between;margin-bottom:0">
                  <span>流式输出</span>
                  <label class="switch" style="margin:0">
                    <input type="checkbox" id="cfg-stream" checked>
                    <div class="sw-track"></div><div class="sw-thumb"></div>
                  </label>
                </div>
              </div>

            </div>
          </div>

          <!-- 系统提示词 -->
          <div class="chat-cfg-card collapsed" id="sys-prompt-card">
            <div class="cfg-title" onclick="toggleCfgCard(this.closest('.chat-cfg-card'))">
              <i class="fas fa-terminal" style="color:var(--orange)"></i> 系统提示词
              <i class="fas fa-chevron-down arrow"></i>
            </div>
            <div class="cfg-body sys-prompt-wrap">
              <textarea class="sys-prompt-ta" id="sys-prompt" placeholder="(可选) 设定 AI 的角色、风格或背景知识..."></textarea>
              <div class="chat-hint">发送消息时自动附加到上下文首部</div>
            </div>
          </div>

          <!-- API Key -->
          <div class="chat-cfg-card collapsed">
            <div class="cfg-title" onclick="toggleCfgCard(this.closest('.chat-cfg-card'))">
              <i class="fas fa-key" style="color:var(--green)"></i> API Key
              <i class="fas fa-chevron-down arrow"></i>
            </div>
            <div class="cfg-body">
              <input type="password" class="form-control" id="chat-api-key" placeholder="sk-... (留空用默认令牌)" style="height:32px;font-size:12px">
              <div class="chat-hint">留空将使用系统默认令牌</div>
            </div>
          </div>

          <button class="btn btn-default btn-sm" onclick="clearChat()" style="width:100%;margin-top:2px">
            <i class="fas fa-trash-alt"></i> 清空对话
          </button>
        </div>

        <!-- Chat main -->
        <div class="chat-main">
          <div class="chat-messages" id="chat-messages">
            <div class="chat-empty" id="chat-empty">
              <div class="chat-empty-icon"><i class="fas fa-robot"></i></div>
              <div style="font-size:16px;font-weight:600;color:var(--text)">开始对话</div>
              <div style="font-size:13px">从左侧选择供应商和模型，输入消息</div>
              <div style="font-size:12px;color:var(--text-muted)">Enter 发送 · Shift+Enter 换行 · 支持流式输出</div>
            </div>
          </div>
          <div class="chat-input-area">
            <div class="chat-input-row">
              <textarea class="chat-textarea" id="chat-input" placeholder="输入消息... (Enter 发送，Shift+Enter 换行)" rows="1"></textarea>
              <button class="chat-send-btn" id="chat-send-btn" onclick="sendMessage()">
                <i class="fas fa-paper-plane" id="send-icon"></i>
              </button>
            </div>
            <div style="display:flex;align-items:center;gap:8px;margin-top:5px">
              <span id="chat-model-label" style="font-size:11px;color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap"></span>
              <span style="font-size:11px;color:var(--text-muted);flex-shrink:0">消息数：<span id="chat-msg-count">0</span></span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- ═══════════════════════ MODELS ═══════════════════════ -->
    <div class="page" id="page-models">
      <div style="display:flex;gap:12px;align-items:center;margin-bottom:14px;flex-wrap:wrap">
        <input type="text" class="form-input" id="model-search" placeholder="搜索模型名称..." oninput="filterModels()" style="width:260px">
        <span id="model-count-label" style="font-size:12px;color:var(--text-muted);margin-left:auto"></span>
      </div>
      <div class="vendor-filters" id="vendor-chips"><div class="loading-box" style="padding:8px">加载供应商...</div></div>
      <div class="model-grid" id="model-grid">
        <div class="loading-box" style="grid-column:1/-1"><span class="spin"><i class="fas fa-circle-notch"></i></span> 加载模型列表...</div>
      </div>
    </div>

    <!-- ═══════════════════════ DOCS ═══════════════════════ -->
    <div class="page" id="page-docs">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">接入信息</span></div>
        <div class="card-body">
          <div style="display:grid;grid-template-columns:repeat(3,1fr);gap:16px">
            <div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">Base URL</div>
              <div style="display:flex;align-items:center;gap:8px">
                <code style="font-size:12px;background:var(--bg);padding:6px 10px;border-radius:6px;border:1px solid var(--border);color:var(--primary);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:monospace" id="docs-base-url">-</code>
                <button class="btn-icon" onclick="copyEl('docs-base-url')"><i class="fas fa-copy"></i></button>
              </div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">支持端点</div>
              <div style="display:flex;flex-wrap:wrap;gap:4px">
                <span class="badge bd-info">Chat Completions</span>
                <span class="badge bd-info">Completions</span>
                
              </div>
            </div>
            <div>
              <div style="font-size:12px;color:var(--text-muted);margin-bottom:6px">认证方式</div>
              <code style="font-size:11px;background:var(--bg);padding:6px 10px;border-radius:6px;border:1px solid var(--border);color:var(--text-secondary);font-family:monospace">Authorization: Bearer &lt;key&gt;</code>
            </div>
          </div>
        </div>
      </div>
      <div class="tab-bar" id="doc-tab-bar">
        <div class="tab active" onclick="docTab(0,this)">Python</div>
        <div class="tab" onclick="docTab(1,this)">cURL</div>
        <div class="tab" onclick="docTab(2,this)">JavaScript</div>
        <div class="tab" onclick="docTab(3,this)">流式输出</div>
      </div>
      <div id="doc-panel"></div>
    </div>

    <!-- ═══════════════════════ ENDPOINTS ═══════════════════════ -->
    <div class="page" id="page-endpoints">
      <div class="card" style="margin-bottom:16px">
        <div class="card-header"><span class="card-title">API 端点总览</span></div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>方法</th><th>端点</th><th>说明</th><th>鉴权</th></tr></thead>
            <tbody id="ep-tbody"></tbody>
          </table>
        </div>
      </div>
    </div>

    ${isAdmin ? `
    <!-- ═══════════════════════ OVERVIEW (admin) ═══════════════════════ -->
    <div class="page" id="page-overview">
      <div class="stats-grid">
        <div class="stat-card"><div class="stat-icon si-blue"><i class="fas fa-paper-plane"></i></div><div><div class="stat-label">总请求数</div><div class="stat-value" id="stat-total">-</div><div class="stat-sub">所有时间</div></div></div>
        <div class="stat-card"><div class="stat-icon si-green"><i class="fas fa-check-circle"></i></div><div><div class="stat-label">成功率</div><div class="stat-value" id="stat-success">-</div><div class="stat-sub">最近1小时</div></div></div>
        <div class="stat-card"><div class="stat-icon si-orange"><i class="fas fa-clock"></i></div><div><div class="stat-label">平均延迟</div><div class="stat-value" id="stat-latency">-</div><div class="stat-sub">最近1小时</div></div></div>
        <div class="stat-card"><div class="stat-icon si-purple"><i class="fas fa-server"></i></div><div><div class="stat-label">渠道状态</div><div class="stat-value" id="stat-keys">-</div><div class="stat-sub">启用/总计</div></div></div>
      </div>
      <div class="dash-row">
        <div class="card">
          <div class="card-header"><span class="card-title">请求趋势</span><span id="chart-note" style="font-size:12px;color:var(--text-muted)">最近24小时</span></div>
          <div class="card-body">
            <div class="chart-wrap"><canvas id="trend-chart"></canvas></div>
            <div id="chart-empty" style="display:none;padding:30px 0;text-align:center;color:var(--text-muted);font-size:13px">
              <i class="fas fa-chart-bar" style="font-size:28px;opacity:.2;display:block;margin-bottom:10px"></i>暂无数据，发送请求后显示
            </div>
          </div>
        </div>
        <div class="card">
          <div class="card-header"><span class="card-title">渠道状态</span><span style="cursor:pointer;font-size:12px;color:var(--primary)" onclick="nav('channels',null)">查看全部</span></div>
          <div id="channel-status-list"><div class="loading-box"><span class="spin"><i class="fas fa-circle-notch"></i></span> 加载中...</div></div>
        </div>
      </div>
      <div class="card">
        <div class="card-header"><span class="card-title">最近请求日志</span><button class="btn btn-default btn-sm" onclick="nav('logs',null)"><i class="fas fa-external-link-alt"></i> 查看全部</button></div>
        <div class="table-wrap">
          <table><thead><tr><th>时间</th><th>模型</th><th>渠道</th><th>状态</th><th>延迟</th></tr></thead>
          <tbody id="recent-logs-tbody"><tr><td colspan="5" class="loading-box"><span class="spin"><i class="fas fa-circle-notch"></i></span></td></tr></tbody></table>
        </div>
      </div>
    </div>

    <!-- CHANNELS -->
    <div class="page" id="page-channels">
      <div class="card">
        <div class="card-header">
          <span class="card-title">渠道管理</span>
          <div class="card-extra">
            <span style="font-size:12px;color:var(--text-muted)" id="channel-total-label"></span>
            <button class="btn btn-primary btn-sm" onclick="openModal('modal-add-key')"><i class="fas fa-plus"></i> 添加渠道</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>#</th><th>名称</th><th>类型</th><th>状态</th><th>本分钟</th><th>RPM</th><th>总请求</th><th>失败</th><th>操作</th></tr></thead>
            <tbody id="channels-tbody"><tr><td colspan="9" class="loading-box"><span class="spin"><i class="fas fa-circle-notch"></i></span></td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- TOKENS -->
    <div class="page" id="page-tokens">
      <div class="card">
        <div class="card-header">
          <span class="card-title">令牌管理</span>
          <button class="btn btn-primary btn-sm" onclick="openModal('modal-add-token')"><i class="fas fa-plus"></i> 创建令牌</button>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>名称</th><th>令牌</th><th>状态</th><th>本分钟</th><th>RPM 限制</th><th>总请求</th><th>创建时间</th><th>操作</th></tr></thead>
            <tbody id="tokens-tbody"><tr><td colspan="8" class="loading-box"><span class="spin"><i class="fas fa-circle-notch"></i></span></td></tr></tbody>
          </table>
        </div>
      </div>
    </div>

    <!-- LOGS -->
    <div class="page" id="page-logs">
      <div class="card">
        <div class="card-header">
          <span class="card-title">请求日志</span>
          <div class="card-extra">
            <select class="form-select" id="log-status-filter" onchange="filterLogs()" style="font-size:12px;height:30px">
              <option value="">全部状态</option>
              <option value="200">成功 (2xx)</option>
              <option value="400">错误 (4xx)</option>
              <option value="500">服务器错误 (5xx)</option>
            </select>
            <button class="btn btn-default btn-sm" onclick="loadLogs()"><i class="fas fa-sync-alt"></i> 刷新</button>
          </div>
        </div>
        <div class="table-wrap">
          <table>
            <thead><tr><th>时间</th><th>模型</th><th>渠道</th><th>令牌</th><th>状态</th><th>延迟</th><th>详情</th></tr></thead>
            <tbody id="logs-tbody"><tr><td colspan="7" class="loading-box"><span class="spin"><i class="fas fa-circle-notch"></i></span></td></tr></tbody>
          </table>
        </div>
        <div style="padding:12px 20px;border-top:1px solid var(--border-light)"><div class="pagination" id="logs-pagination"></div></div>
      </div>
    </div>

    <!-- SETTINGS -->
    <div class="page" id="page-settings">
      <div class="card" style="max-width:640px">
        <div class="card-header"><span class="card-title">系统设置</span></div>
        <div class="card-body">
          <div id="settings-alert" class="alert"></div>
          <div class="settings-section">
            <div class="settings-label">安全设置</div>
            <div class="settings-item">
              <div class="si-info"><div class="si-title">管理员密码</div><div class="si-desc">修改控制台登录密码（至少6位）</div></div>
              <div style="display:flex;gap:8px">
                <input type="password" class="form-control" id="new-password" placeholder="新密码" style="width:160px">
                <button class="btn btn-primary btn-sm" onclick="changePassword()">修改</button>
              </div>
            </div>
          </div>
          <div class="settings-section">
            <div class="settings-label">平台信息</div>
            <div class="settings-item">
              <div class="si-info"><div class="si-title">上游提供商</div><div class="si-desc">NVIDIA NIM API</div></div>
              <span class="badge bd-success">已连接</span>
            </div>
            <div class="settings-item">
              <div class="si-info"><div class="si-title">API 兼容</div><div class="si-desc">OpenAI API v1 完全兼容</div></div>
              <span class="badge bd-info">v1</span>
            </div>
            <div class="settings-item">
              <div class="si-info"><div class="si-title">可用模型</div><div class="si-desc">对话、代码、推理</div></div>
              <span id="settings-model-count" class="badge bd-purple">-</span>
            </div>
          </div>
        </div>
      </div>
    </div>

    <!-- MODALS -->
    <div class="modal-overlay" id="modal-add-key">
      <div class="modal">
        <div class="modal-header"><span class="modal-title">添加渠道</span><button class="modal-close" onclick="closeModal('modal-add-key')"><i class="fas fa-times"></i></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">渠道名称</label><input type="text" class="form-control" id="new-key-label" placeholder="例如：Key-6"></div>
          <div class="form-group"><label class="form-label">NVIDIA API Key</label><input type="text" class="form-control" id="new-key-value" placeholder="nvapi-..."></div>
          <div class="form-group"><label class="form-label">RPM 限制</label><input type="number" class="form-control" id="new-key-rpm" value="40" min="1"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" onclick="closeModal('modal-add-key')">取消</button>
          <button class="btn btn-primary" onclick="addKey()"><i class="fas fa-plus"></i> 添加</button>
        </div>
      </div>
    </div>
    <div class="modal-overlay" id="modal-add-token">
      <div class="modal">
        <div class="modal-header"><span class="modal-title">创建令牌</span><button class="modal-close" onclick="closeModal('modal-add-token')"><i class="fas fa-times"></i></button></div>
        <div class="modal-body">
          <div class="form-group"><label class="form-label">令牌名称</label><input type="text" class="form-control" id="new-token-name" placeholder="例如：My App"></div>
          <div class="form-group"><label class="form-label">RPM 限制</label><input type="number" class="form-control" id="new-token-rpm" value="100" min="1"></div>
        </div>
        <div class="modal-footer">
          <button class="btn btn-default" onclick="closeModal('modal-add-token')">取消</button>
          <button class="btn btn-primary" onclick="addToken()"><i class="fas fa-key"></i> 创建</button>
        </div>
      </div>
    </div>
    ` : ''}

  </div><!-- /content -->
</div><!-- /main-wrap -->

<!-- Toast -->
<div id="toast" style="position:fixed;bottom:24px;right:24px;z-index:9999;transition:all .3s;opacity:0;transform:translateY(8px);pointer-events:none">
  <div id="toast-inner" style="padding:10px 16px;border-radius:8px;font-size:13px;display:flex;align-items:center;gap:8px;box-shadow:0 4px 20px rgba(0,0,0,.15);min-width:200px"></div>
</div>

<script>
// ─────────────── CONFIG ───────────────
const IS_ADMIN = ${isAdmin};
${isAdmin ? `const adminToken = sessionStorage.getItem('adminToken'); if (!adminToken) window.location.href = '/login';` : ''}

// ─────────────── NAV ───────────────
const PAGE_TITLES = {
  home:'首页', chat:'对话测试', models:'模型广场', docs:'接入文档', endpoints:'API 端点',
  overview:'控制台', channels:'渠道管理', tokens:'令牌管理', logs:'请求日志', settings:'系统设置'
};

function nav(name, el) {
  document.querySelectorAll('.page').forEach(p => { p.classList.remove('active'); p.style.display = ''; });
  document.querySelectorAll('.nav-item').forEach(n => n.classList.remove('active'));

  const pg = document.getElementById('page-' + name);
  if (!pg) return;
  if (name === 'chat') { pg.style.display = 'flex'; pg.classList.add('active'); }
  else pg.classList.add('active');

  if (el) el.classList.add('active');
  else document.querySelectorAll('.nav-item').forEach(n => {
    if ((n.getAttribute('onclick') || '').includes("'" + name + "'")) n.classList.add('active');
  });
  document.getElementById('page-title').textContent = PAGE_TITLES[name] || name;

  if (name === 'home') initHome();
  else if (name === 'chat') initChatPage();
  else if (name === 'models') loadModels();
  else if (name === 'docs') initDocs();
  else if (name === 'endpoints') initEndpoints();
  else if (IS_ADMIN) {
    if (name === 'overview') loadOverview();
    else if (name === 'channels') loadChannels();
    else if (name === 'tokens') loadTokens();
    else if (name === 'logs') loadLogs();
    else if (name === 'settings') loadSettings();
  }
}

// ─────────────── UTILS ───────────────
function authHdrs() {
  return { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + (IS_ADMIN ? adminToken : '') };
}
async function apiFetch(url, opts = {}) {
  opts.headers = { ...authHdrs(), ...(opts.headers || {}) };
  const r = await fetch(url, opts);
  if (r.status === 401 && IS_ADMIN) { window.location.href = '/login'; throw new Error('Unauth'); }
  return r;
}
function toast(msg, type = 'success') {
  const t = document.getElementById('toast'), i = document.getElementById('toast-inner');
  const m = { success:{bg:'#f6ffed',bd:'#b7eb8f',cl:'#389e0d',ic:'fa-check-circle'},
               error:{bg:'#fff2f0',bd:'#ffccc7',cl:'#cf1322',ic:'fa-times-circle'},
               info:{bg:'#e6f4ff',bd:'#91caff',cl:'#0958d9',ic:'fa-info-circle'} }[type] || {};
  i.style.cssText = \`background:\${m.bg};border:1px solid \${m.bd};color:\${m.cl}\`;
  i.innerHTML = \`<i class="fas \${m.ic}"></i> \${msg}\`;
  t.style.opacity = '1'; t.style.transform = 'translateY(0)';
  clearTimeout(window._tt);
  window._tt = setTimeout(() => { t.style.opacity = '0'; t.style.transform = 'translateY(8px)'; }, 3000);
}
function copyEl(id) { navigator.clipboard.writeText(document.getElementById(id)?.textContent || '').then(() => toast('已复制')); }
function copyVal(v) { navigator.clipboard.writeText(v).then(() => toast('已复制')); }
function copyCode(id) { navigator.clipboard.writeText(document.getElementById(id)?.textContent || '').then(() => toast('代码已复制')); }
function fmtTime(ts) { return new Date(ts).toLocaleString('zh-CN',{month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit'}); }
function statusBadge(s) {
  const c = String(s);
  if (c.startsWith('2')) return \`<span class="badge bd-success">\${s}</span>\`;
  if (c.startsWith('4')) return \`<span class="badge bd-warning">\${s}</span>\`;
  return \`<span class="badge bd-danger">\${s}</span>\`;
}
function openModal(id) { document.getElementById(id)?.classList.add('open'); }
function closeModal(id) { document.getElementById(id)?.classList.remove('open'); }
function logout() { sessionStorage.removeItem('adminToken'); window.location.href = '/login'; }
function refreshPage() {
  const icon = document.getElementById('refresh-icon');
  if (icon) { icon.classList.add('spin'); setTimeout(() => icon.classList.remove('spin'), 900); }
  const cur = document.querySelector('.page.active')?.id?.replace('page-','');
  if (cur) nav(cur, null);
}

// ─────────────── HOME ───────────────
function initHome() {
  const base = location.origin + '/v1';
  const el = document.getElementById('home-base-url');
  if (el) el.textContent = base;
  fetch('/v1/models').then(r => r.json()).then(d => {
    const cnt = d.data?.length || 0;
    const e1 = document.getElementById('home-model-count');
    const e2 = document.getElementById('hdr-model-count');
    if (e1) e1.textContent = cnt + ' 个模型';
    if (e2) e2.textContent = cnt + ' 个可用模型';
  }).catch(() => {});
  renderQuickTab(0);
}

const QUICK_TABS = [
  b => \`from openai import OpenAI
client = OpenAI(base_url="\${b}", api_key="your-api-key")
response = client.chat.completions.create(
    model="deepseek-ai/deepseek-v3.2",
    messages=[{"role":"user","content":"你好！"}],
)
print(response.choices[0].message.content)\`,
  b => \`curl \${b}/chat/completions \\\\
  -H "Content-Type: application/json" \\\\
  -H "Authorization: Bearer your-api-key" \\\\
  -d '{"model":"deepseek-ai/deepseek-v3.2","messages":[{"role":"user","content":"你好！"}]}'\`,
];

function qTab(idx, el) {
  document.querySelectorAll('#quick-tab-bar .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderQuickTab(idx);
}
function renderQuickTab(idx) {
  const el = document.getElementById('quick-code');
  if (el) el.textContent = QUICK_TABS[idx]?.(location.origin + '/v1') || '';
}

// ─────────────── CHAT ───────────────
let chatMessages = [];       // {role, content}
let chatAbortCtrl = null;
let chatModelsLoaded = false;
let chatCurVendor = 'all';

function toggleCfgCard(card) {
  card.classList.toggle('collapsed');
}

async function initChatPage() {
  if (!chatModelsLoaded) {
    await loadChatModels();
    chatModelsLoaded = true;
  }
  updateChatStatusBar();
  const ta = document.getElementById('chat-input');
  if (ta && !ta._initDone) {
    ta._initDone = true;
    ta.addEventListener('input', () => {
      ta.style.height = 'auto';
      ta.style.height = Math.min(ta.scrollHeight, 160) + 'px';
    });
    ta.addEventListener('keydown', e => {
      if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendMessage(); }
    });
  }
}

let allChatModels = [];
async function loadChatModels() {
  try {
    const r = await fetch('/v1/models');
    const d = await r.json();
    allChatModels = d.data || [];
  } catch(e) {}
  buildVendorSelect();
}

function getChatModelList() {
  return allChatModels;
}

function buildVendorSelect() {
  const vsel = document.getElementById('chat-vendor-select');
  if (!vsel) return;
  const list = getChatModelList();
  const cnt = {};
  list.forEach(m => { const v = modelVendor(m); cnt[v] = (cnt[v]||0)+1; });
  const sorted = Object.entries(cnt).sort((a,b) => b[1]-a[1]);
  let opts = \`<option value="all">全部供应商 (\${list.length})</option>\`;
  sorted.forEach(([v,c]) => { opts += \`<option value="\${v}">\${vendorLabel(v)} (\${c})</option>\`; });
  const prev = vsel.value;
  vsel.innerHTML = opts;
  if (prev && sorted.find(([v]) => v === prev)) vsel.value = prev; else vsel.value = 'all';
  chatCurVendor = vsel.value;
  populateChatModels();
}

function onVendorChange() {
  chatCurVendor = document.getElementById('chat-vendor-select')?.value || 'all';
  populateChatModels();
}

function populateChatModels() {
  const sel = document.getElementById('chat-model-select');
  if (!sel) return;
  let list = getChatModelList();
  if (chatCurVendor !== 'all') list = list.filter(m => modelVendor(m) === chatCurVendor);
  const prev = sel.value;
  // Group by vendor for optgroup display
  const grouped = {};
  list.forEach(m => { const v = modelVendor(m); if (!grouped[v]) grouped[v] = []; grouped[v].push(m); });
  const vendors = Object.keys(grouped).sort((a,b) => grouped[b].length - grouped[a].length);
  if (vendors.length === 0) {
    sel.innerHTML = '<option value="">无可用模型</option>';
  } else if (vendors.length === 1) {
    sel.innerHTML = grouped[vendors[0]].map(m => \`<option value="\${m.id}">\${m.id.split('/').pop()}</option>\`).join('');
  } else {
    sel.innerHTML = vendors.map(v =>
      \`<optgroup label="\${vendorLabel(v)}">\${grouped[v].map(m =>
        '<option value="'+m.id+'">'+m.id.split('/').pop()+'</option>'
      ).join('')}</optgroup>\`
    ).join('');
  }
  if (prev && [...sel.options].find(o => o.value === prev)) sel.value = prev;
  updateChatStatusBar();
}

function updateChatStatusBar() {
  const sel = document.getElementById('chat-model-select');
  const lbl = document.getElementById('chat-model-label');
  const cnt = document.getElementById('chat-msg-count');
  if (lbl && sel?.value) lbl.textContent = '当前：' + sel.value;
  else if (lbl) lbl.textContent = '';
  if (cnt) cnt.textContent = chatMessages.filter(m => m.role !== 'system').length;
}

function getApiKey() {
  const v = document.getElementById('chat-api-key')?.value?.trim();
  if (v) return v;
  return 'sk-nvidia-router-default-2024';
}

function getSysPrompt() {
  return document.getElementById('sys-prompt')?.value?.trim() || '';
}

// ── Think block helpers ──
// Each chatMessages[i] for assistant has shape: { role, content, thinking }
// thinking = string | null  (always stored separately from content)
// content  = the final answer text only

function renderThinkBlock(thinking, thinkDone, isStreaming) {
  if (!thinking && thinkDone) return '';
  const txt = thinking || '';
  let html = txt;
  if (typeof marked !== 'undefined') { try { html = marked.parse(txt); } catch(e) {} }
  const isThinkStreaming = !thinkDone && isStreaming;
  const wc = txt.trim().split(/\s+/).filter(Boolean).length;
  const label = isThinkStreaming
    ? \`<span class="spin" style="font-size:10px"><i class="fas fa-circle-notch"></i></span>&nbsp;思考中...\`
    : \`<i class="fas fa-brain think-icon"></i> 思考过程&nbsp;<span style="color:var(--text-muted);font-weight:400;font-size:11px">\${wc} 词</span>\`;
  return \`<div class="think-block\${isThinkStreaming ? ' think-streaming' : ''}" onclick="this.classList.toggle('collapsed')">
    <div class="think-header">\${label}<i class="fas fa-chevron-down think-toggle"></i></div>
    <div class="think-body">\${html}</div>
  </div>\`;
}

// Extract think from inline content string (for models that embed <think> in content)
// Handles 3 cases:
//   A) "<think>...</think>answer"   - has open+close tag
//   B) "<think>...still thinking"   - open tag, no close yet (streaming)
//   C) "thinking text\n</think>\nanswer" - NO open tag, only close tag (qwen-32b style)
function extractInlineThink(raw) {
  const openIdx  = raw.indexOf('<think>');
  const closeIdx = raw.indexOf('</think>');

  if (openIdx === -1 && closeIdx === -1) {
    // No think tags at all
    return { thinking: null, thinkDone: true, text: raw };
  }

  if (openIdx !== -1 && closeIdx === -1) {
    // Case B: open tag, streaming, close not yet arrived
    const thinking = raw.slice(openIdx + 7);
    const before   = raw.slice(0, openIdx);
    return { thinking: (before + thinking).trim() || thinking, thinkDone: false, text: '' };
  }

  if (openIdx === -1 && closeIdx !== -1) {
    // Case C: no open tag, content before </think> is thinking
    const thinking = raw.slice(0, closeIdx).trim();
    const text     = raw.slice(closeIdx + 8).replace(/^\\n+/, '');
    return { thinking, thinkDone: true, text };
  }

  // Case A: both open and close tag present
  const thinking = raw.slice(openIdx + 7, closeIdx).trim();
  const before   = raw.slice(0, openIdx);
  const after    = raw.slice(closeIdx + 8).replace(/^\\n+/, '');
  return { thinking, thinkDone: true, text: (before + after).trim() };
}

function renderChatMessages(streaming = false) {
  updateChatStatusBar();
  const container = document.getElementById('chat-messages');
  const empty = document.getElementById('chat-empty');
  if (!container) return;
  const displayMsgs = chatMessages.filter(m => m.role !== 'system');
  if (empty) empty.style.display = displayMsgs.length ? 'none' : 'flex';

  container.innerHTML = displayMsgs.map((msg, idx) => {
    const isUser = msg.role === 'user';
    const isLast = idx === displayMsgs.length - 1;
    const isStreaming = streaming && isLast && !isUser;

    if (!isUser) {
      // msg.thinking = separate thinking string (already extracted)
      // msg.thinkDone = bool
      // msg.content = answer text (may still contain inline <think> tags if not yet parsed out)
      let thinking  = msg.thinking  ?? null;
      let thinkDone = msg.thinkDone ?? true;
      let text      = msg.content   || '';

      // If thinking is still null, check for inline tags in content
      if (thinking === null) {
        const parsed = extractInlineThink(text);
        if (parsed.thinking !== null) {
          thinking  = parsed.thinking;
          thinkDone = parsed.thinkDone;
          text      = parsed.text;
        }
      }

      let mainHtml = text;
      if (typeof marked !== 'undefined' && text) {
        try { mainHtml = marked.parse(text); } catch(e) {}
      }
      const thinkHtml = renderThinkBlock(thinking, thinkDone, isStreaming);
      const showCursor = isStreaming && thinkDone && text;
      return \`<div class="chat-msg assistant">
        <div class="chat-avatar"><i class="fas fa-robot"></i></div>
        <div class="chat-bubble\${showCursor ? ' streaming' : ''}">
          \${thinkHtml}\${mainHtml}
        </div>
      </div>\`;
    } else {
      const safe = (msg.content||'').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;').replace(/\\n/g,'<br>');
      return \`<div class="chat-msg user">
        <div class="chat-avatar"><i class="fas fa-user"></i></div>
        <div class="chat-bubble">\${safe}</div>
      </div>\`;
    }
  }).join('');
  container.scrollTop = container.scrollHeight;
}

async function sendMessage() {
  const input = document.getElementById('chat-input');
  const sendBtn = document.getElementById('chat-send-btn');
  const sendIcon = document.getElementById('send-icon');
  const text = (input?.value || '').trim();
  if (!text) return;
  if (chatAbortCtrl) { chatAbortCtrl.abort(); chatAbortCtrl = null; }

  input.value = '';
  if (input) { input.style.height = 'auto'; }

  // Inject / update system prompt
  const sysp = getSysPrompt();
  if (sysp) {
    if (chatMessages.length === 0 || chatMessages[0].role !== 'system') {
      chatMessages.unshift({ role: 'system', content: sysp });
    } else {
      chatMessages[0].content = sysp;
    }
  }
  chatMessages.push({ role: 'user', content: text });
  renderChatMessages(false);

  const model = document.getElementById('chat-model-select')?.value;
  if (!model) { toast('请先选择模型', 'error'); finishStream(); return; }
  const apiKey = getApiKey();
  if (sendBtn) sendBtn.disabled = true;
  if (sendIcon) { sendIcon.className = 'fas fa-stop'; }

  // Override send button to stop
  if (sendBtn) sendBtn.onclick = () => { if (chatAbortCtrl) { chatAbortCtrl.abort(); chatAbortCtrl = null; } finishStream(); };

  await sendChat(text, model, apiKey);
}

async function sendChat(text, model, apiKey) {
  const useStream = document.getElementById('cfg-stream')?.checked !== false;
  const maxTokens = parseInt(document.getElementById('cfg-max-tokens')?.value || '1024');
  const temperature = parseFloat(document.getElementById('cfg-temperature')?.value || '0.7');

  chatMessages.push({ role: 'assistant', content: '', thinking: null, thinkDone: true });
  renderChatMessages(true);
  const lastIdx = chatMessages.length - 1;

  chatAbortCtrl = new AbortController();
  try {
    const r = await fetch('/v1/chat/completions', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer ' + apiKey },
      body: JSON.stringify({
        model,
        messages: chatMessages.slice(0, lastIdx).map(m => ({ role: m.role, content: m.content })),
        stream: useStream,
        max_tokens: maxTokens,
        temperature,
      }),
      signal: chatAbortCtrl.signal,
    });

    if (!r.ok) {
      const err = await r.json().catch(() => ({ error: { message: r.statusText } }));
      chatMessages[lastIdx].content = \`❌ 错误：\${err.error?.message || r.statusText}\`;
      renderChatMessages(false);
      finishStream();
      return;
    }

    if (useStream) {
      const reader = r.body.getReader();
      const decoder = new TextDecoder();
      let buf = '';
      // rawContent accumulates everything from delta.content so we can parse think tags inline
      let rawContent = '';
      // inlineThinkDone: whether we've finished the inline <think> phase
      // null = not yet determined; false = inside think; true = think done
      let inlineThinkState = null; // null|'thinking'|'done'

      while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buf += decoder.decode(value, { stream: true });
        const lines = buf.split('\\n');
        buf = lines.pop() || '';
        for (const line of lines) {
          if (!line.startsWith('data: ')) continue;
          const payload = line.slice(6).trim();
          if (payload === '[DONE]') { buf = ''; break; }
          try {
            const chunk = JSON.parse(payload);
            const delta = chunk.choices?.[0]?.delta || {};

            // ── Track finish reason ──
            const finishReason = chunk.choices?.[0]?.finish_reason;

            // ── Case A: separate reasoning_content field (glm4.7, kimi-k2, qwen3-thinking) ──
            const rc = delta.reasoning_content ?? delta.reasoning ?? null;
            if (rc !== null && rc !== undefined && rc !== '') {
              if (chatMessages[lastIdx].thinking === null) {
                chatMessages[lastIdx].thinking = rc;
              } else {
                chatMessages[lastIdx].thinking += rc;
              }
              chatMessages[lastIdx].thinkDone = false;
              renderChatMessages(true);
            }

            // ── Case B: content field ──
            if (delta.content != null && delta.content !== '') {
              // If we were in reasoning_content phase, mark thinking done
              if (chatMessages[lastIdx].thinkDone === false) {
                chatMessages[lastIdx].thinkDone = true;
              }

              rawContent += delta.content;

              // Parse inline think tags from rawContent in real time
              // Handles:
              //   Format 1: "<think>...thinking...</think>answer"  (deepseek-r1-llama, phi-4)
              //   Format 2: "thinking...\n</think>\n\nanswer"      (deepseek-r1-qwen32b, no open tag)
              // We detect if inline think is being used (inlineThinkState != null)
              // ── Inline think-tag detection ──
              // Format 1: "<think>...thinking...</think>answer"  (deepseek-r1-llama, phi-4)
              //   → first content chunk starts with "<think>"
              // Format 2: "thinking...\n</think>\n\nanswer"      (deepseek-r1-qwen32b, no open tag)
              //   → content starts normally but a "</think>" appears mid-stream
              // Format 3: plain answer, no think tags at all
              //   → content never contains "<think>" or "</think>"
              //
              // Strategy:
              //   - If rawContent starts with "<think>", enter 'thinking' mode immediately
              //   - Otherwise show content as answer; if "</think>" appears later, reclassify
              //     all accumulated content before it as thinking, rest as answer

              if (inlineThinkState === null) {
                if (rawContent.startsWith('<think>')) {
                  inlineThinkState = 'thinking';
                } else {
                  // Treat as plain answer for now; watch for </think> in case it's Format 2
                  inlineThinkState = 'plain';
                }
              }

              if (inlineThinkState === 'thinking') {
                // Format 1: <think> at start
                const closeIdx = rawContent.indexOf('</think>');
                if (closeIdx === -1) {
                  // Still inside <think> block
                  chatMessages[lastIdx].thinking = rawContent.slice(7); // strip '<think>'
                  chatMessages[lastIdx].thinkDone = false;
                  chatMessages[lastIdx].content = '';
                } else {
                  // </think> found – split thinking and answer
                  chatMessages[lastIdx].thinking = rawContent.slice(7, closeIdx).trim();
                  chatMessages[lastIdx].thinkDone = true;
                  chatMessages[lastIdx].content = rawContent.slice(closeIdx + 8).replace(/^\\n+/, '');
                  inlineThinkState = 'done';
                }
              } else if (inlineThinkState === 'plain') {
                // Watching for Format 2 (no open tag, but </think> may appear)
                const closeIdx = rawContent.indexOf('</think>');
                if (closeIdx !== -1) {
                  // Reclassify: everything before </think> was thinking content
                  chatMessages[lastIdx].thinking = rawContent.slice(0, closeIdx).trim();
                  chatMessages[lastIdx].thinkDone = true;
                  chatMessages[lastIdx].content = rawContent.slice(closeIdx + 8).replace(/^\\n+/, '');
                  inlineThinkState = 'done';
                } else {
                  // No </think> yet; render as normal answer text
                  chatMessages[lastIdx].content = rawContent;
                }
              } else {
                // 'done': just keep updating answer text
                chatMessages[lastIdx].content = rawContent;
              }

              renderChatMessages(true);
            }
          } catch(e) {}
        }
      }

      // Stream ended - finalize
      const msg = chatMessages[lastIdx];

      // If still 'thinking' mode but stream ended without </think>, mark as done
      // (truncated response, show whatever we have)
      if (msg.thinkDone === false) {
        msg.thinkDone = true;
      }

    } else {
      // ── Non-stream ──
      const d = await r.json();
      const msg = d.choices?.[0]?.message || {};
      const rc = msg.reasoning_content ?? msg.reasoning ?? null;
      const rawContent = msg.content || '';

      if (rc !== null && rc !== undefined && rc !== '') {
        // Separate reasoning field (glm4.7, kimi-k2, qwen3-thinking)
        chatMessages[lastIdx].thinking  = String(rc).trim();
        chatMessages[lastIdx].thinkDone = true;
        chatMessages[lastIdx].content   = rawContent;
      } else {
        // Inline think tags in content - parse now
        // Format 1: "<think>...</think>answer"
        // Format 2: "thinking\n</think>\nanswer"  (no open tag)
        const closeIdx = rawContent.indexOf('</think>');
        if (closeIdx !== -1) {
          const openIdx = rawContent.indexOf('<think>');
          if (openIdx !== -1 && openIdx < closeIdx) {
            // Format 1
            chatMessages[lastIdx].thinking = rawContent.slice(openIdx + 7, closeIdx).trim();
          } else {
            // Format 2
            chatMessages[lastIdx].thinking = rawContent.slice(0, closeIdx).trim();
          }
          chatMessages[lastIdx].thinkDone = true;
          chatMessages[lastIdx].content   = rawContent.slice(closeIdx + 8).replace(/^\\n+/, '');
        } else {
          // No think tags at all
          chatMessages[lastIdx].thinking  = null;
          chatMessages[lastIdx].thinkDone = true;
          chatMessages[lastIdx].content   = rawContent;
        }
      }
    }
  } catch(e) {
    if (e.name !== 'AbortError') {
      chatMessages[lastIdx].content = \`❌ 错误：\${e.message}\`;
    }
  }
  renderChatMessages(false);
  finishStream();
}

function finishStream() {
  chatAbortCtrl = null;
  const btn = document.getElementById('chat-send-btn');
  const icon = document.getElementById('send-icon');
  if (btn) { btn.disabled = false; btn.onclick = () => sendMessage(); }
  if (icon) icon.className = 'fas fa-paper-plane';
}

function clearChat() {
  chatMessages = [];
  renderChatMessages(false);
  updateChatStatusBar();
  if (chatAbortCtrl) { chatAbortCtrl.abort(); chatAbortCtrl = null; finishStream(); }
}

// ─────────────── MODELS ───────────────
let allModels = [];
let curVendor = 'all';
const VENDOR_META = {
  google:       { label:'Google',       icon:'fa-google' },
  qwen:         { label:'Qwen (阿里)',   icon:'fa-cloud' },
  openai:       { label:'OpenAI OSS',   icon:'fa-robot' },
  moonshotai:   { label:'Moonshot AI',  icon:'fa-moon' },
  'stepfun-ai': { label:'阶跃星辰',      icon:'fa-star' },
  minimaxai:    { label:'MiniMax',      icon:'fa-infinity' },
  'deepseek-ai':{ label:'DeepSeek',     icon:'fa-brain' },
  'z-ai':       { label:'智谱 AI',       icon:'fa-atom' },
};
function vendorLabel(v) { return VENDOR_META[v]?.label || v; }
function modelVendor(m) { return m.owned_by || (m.id.includes('/') ? m.id.split('/')[0] : 'nvidia'); }

async function loadModels() {
  if (allModels.length) { buildVendorChips(); filterModels(); return; }
  document.getElementById('model-grid').innerHTML = '<div class="loading-box" style="grid-column:1/-1"><span class="spin"><i class="fas fa-circle-notch"></i></span> 加载中...</div>';
  try {
    const r = await fetch('/v1/models');
    allModels = (await r.json()).data || [];
    buildVendorChips();
    filterModels();
  } catch(e) {
    document.getElementById('model-grid').innerHTML = '<div class="empty-box" style="grid-column:1/-1"><div class="empty-icon"><i class="fas fa-exclamation-circle"></i></div><div>加载失败</div></div>';
  }
}

function buildVendorChips() {
  const cnt = {};
  allModels.forEach(m => { const v = modelVendor(m); cnt[v] = (cnt[v] || 0) + 1; });
  const sorted = Object.entries(cnt).sort((a,b) => b[1]-a[1]);
  let html = \`<div class="vendor-chip active" onclick="setVendorFilter('all',this)">全部 <span class="chip-count">(\${allModels.length})</span></div>\`;
  sorted.forEach(([v,c]) => html += \`<div class="vendor-chip" onclick="setVendorFilter('\${v}',this)">\${vendorLabel(v)} <span class="chip-count">(\${c})</span></div>\`);
  document.getElementById('vendor-chips').innerHTML = html;
}

function setVendorFilter(v, el) {
  curVendor = v;
  document.querySelectorAll('.vendor-chip').forEach(c => c.classList.remove('active'));
  if (el) el.classList.add('active');
  filterModels();
}
function filterModels() {
  const q = (document.getElementById('model-search')?.value || '').toLowerCase();
  let list = allModels;
  if (curVendor !== 'all') list = list.filter(m => modelVendor(m) === curVendor);
  if (q) list = list.filter(m => m.id.toLowerCase().includes(q));

  const lbl = document.getElementById('model-count-label');
  if (lbl) lbl.textContent = list.length + ' 个模型';

  const grid = document.getElementById('model-grid');
  if (!list.length) { grid.innerHTML = '<div class="empty-box" style="grid-column:1/-1"><div class="empty-icon"><i class="fas fa-search"></i></div><div>没有匹配的模型</div></div>'; return; }

  grid.innerHTML = list.map(m => {
    const vendor = modelVendor(m);
    const shortName = m.id.split('/').pop();
    const ctx = m.context_length ? (m.context_length >= 1000 ? (m.context_length/1000).toFixed(0)+'k' : m.context_length) : null;
    return \`<div class="model-card">
      <div class="mc-header">
        <div class="mc-icon" style="background:var(--blue-light);color:var(--blue)"><i class="fas fa-building"></i></div>
        <div style="flex:1;min-width:0">
          <div class="mc-name" title="\${m.id}">\${shortName}</div>
          <div class="mc-vendor">\${vendorLabel(vendor)}</div>
        </div>
      </div>
      <div class="mc-tags">
        <span class="mc-tag" style="background:var(--blue-light);color:var(--blue)">供应商：\${vendorLabel(vendor)}</span>
        \${ctx ? \`<span class="mc-tag" style="background:#f0f0f6;color:var(--text-muted)">ctx \${ctx}</span>\` : ''}
      </div>
      <div style="display:flex;gap:6px">
        <button class="btn btn-default btn-xs" onclick="copyVal('\${m.id}')" style="flex:1"><i class="fas fa-copy"></i> 复制 ID</button>
        <button class="btn btn-default btn-xs" onclick="useModel('\${m.id}')" title="用于对话测试"><i class="fas fa-comments"></i></button>
      </div>
    </div>\`;
  }).join('');
}

function useModel(id) {
  nav('chat', null);
  setTimeout(() => {
    // Try to preselect vendor
    const vendor = id.includes('/') ? id.split('/')[0] : '';
    const vsel = document.getElementById('chat-vendor-select');
    if (vsel && vendor) {
      const opt = [...vsel.options].find(o => o.value === vendor);
      if (opt) { vsel.value = vendor; chatCurVendor = vendor; populateChatModels(); }
    }
    setTimeout(() => {
      const sel = document.getElementById('chat-model-select');
      if (sel) {
        const found = [...sel.options].find(o => o.value === id);
        if (found) sel.value = id;
        else { const o = new Option(id, id); sel.add(o); sel.value = id; }
      }
      updateChatStatusBar();
    }, 80);
  }, 60);
}

// ─────────────── DOCS ───────────────
const DOC_TABS = ['Python','cURL','JavaScript','流式输出'];
function docContent(idx, base) {
  const t = { py:(s,e)=>\`<span class="kw">\${s}</span>\${e||''}\`, str:(s)=>\`<span class="str">"\${s}"</span>\`, num:(n)=>\`<span class="num">\${n}</span>\` };
  switch(idx) {
    case 0: return \`from openai import OpenAI
client = OpenAI(base_url="\${base}", api_key="your-api-key")
resp = client.chat.completions.create(
    model="deepseek-ai/deepseek-v3.2",
    messages=[{"role":"user","content":"你好！"}],
    temperature=0.7, max_tokens=1024,
)
print(resp.choices[0].message.content)\`;
    case 1: return \`curl \${base}/chat/completions \\\\
  -H "Content-Type: application/json" \\\\
  -H "Authorization: Bearer your-api-key" \\\\
  -d '{
    "model": "deepseek-ai/deepseek-v3.2",
    "messages": [{"role":"user","content":"你好！"}],
    "temperature": 0.7, "max_tokens": 1024
  }'\`;
    case 2: return \`const resp = await fetch('\${base}/chat/completions', {
  method: 'POST',
  headers: { 'Content-Type': 'application/json', 'Authorization': 'Bearer your-api-key' },
  body: JSON.stringify({ model: 'deepseek-ai/deepseek-v3.2', messages: [{role:'user',content:'你好！'}] })
});
const data = await resp.json();
console.log(data.choices[0].message.content);\`;
    case 3: return \`from openai import OpenAI
client = OpenAI(base_url="\${base}", api_key="your-api-key")
stream = client.chat.completions.create(
    model="moonshotai/kimi-k2-instruct",
    messages=[{"role":"user","content":"写一首关于春天的诗"}],
    stream=True,
)
for chunk in stream:
    if chunk.choices[0].delta.content:
        print(chunk.choices[0].delta.content, end="", flush=True)\`;
    default: return '';
  }
}
function docTab(idx, el) {
  document.querySelectorAll('#doc-tab-bar .tab').forEach(t => t.classList.remove('active'));
  if (el) el.classList.add('active');
  renderDocPanel(idx);
}
function renderDocPanel(idx) {
  const base = location.origin + '/v1';
  document.getElementById('doc-panel').innerHTML = \`
    <div class="card"><div class="card-header">
      <span class="card-title">\${DOC_TABS[idx]||''}</span>
      <button class="btn btn-default btn-sm" onclick="copyCode('doc-code')"><i class="fas fa-copy"></i> 复制</button>
    </div><div style="padding:0">
      <div class="code-block" style="border-radius:0"><pre id="doc-code"></pre></div>
    </div></div>\`;
  document.getElementById('doc-code').textContent = docContent(idx, base);
}
function initDocs() {
  const base = location.origin + '/v1';
  const el = document.getElementById('docs-base-url');
  if (el) el.textContent = base;
  renderDocPanel(0);
}

// ─────────────── ENDPOINTS ───────────────
function initEndpoints() {
  const eps = [
    { m:'GET',  p:'/v1/models',              d:'获取所有可用模型列表',       auth:false },
    { m:'POST', p:'/v1/chat/completions',    d:'对话补全（含多模态）',         auth:true },
    { m:'POST', p:'/v1/completions',         d:'文本补全 (Legacy)',          auth:true },
  ];
  const tbody = document.getElementById('ep-tbody');
  if (tbody) tbody.innerHTML = eps.map(e => \`<tr>
    <td><span class="method-badge method-\${e.m.toLowerCase()}">\${e.m}</span></td>
    <td><code class="ep-path">\${e.p}</code></td>
    <td style="color:var(--text-secondary)">\${e.d}</td>
    <td>\${e.auth ? '<span class="badge bd-warning"><i class="fas fa-lock"></i> Bearer</span>' : '<span class="badge bd-success">公开</span>'}</td>
  </tr>\`).join('');
}

${isAdmin ? `
// ─────────────── ADMIN: OVERVIEW ───────────────
let trendChart = null;
async function loadOverview() {
  try {
    const r = await apiFetch('/admin/stats');
    const s = await r.json();
    document.getElementById('stat-total').textContent = s.totalRequests.toLocaleString();
    document.getElementById('stat-success').textContent = s.successRate + '%';
    document.getElementById('stat-latency').textContent = s.avgLatency + 'ms';
    document.getElementById('stat-keys').textContent = s.activeKeys + '/' + s.totalKeys;
    const cb = document.getElementById('channel-count-badge');
    if (cb) cb.textContent = s.totalKeys;
  } catch(e) {}
  await loadChannelStatusList();
  await loadRecentLogsHome();
  await renderTrendChart();
}
async function loadChannelStatusList() {
  try {
    const r = await apiFetch('/admin/keys');
    const d = await r.json();
    const el = document.getElementById('channel-status-list');
    if (!d.keys?.length) { el.innerHTML='<div class="empty-box"><div class="empty-icon"><i class="fas fa-server"></i></div><div>暂无渠道</div></div>'; return; }
    el.innerHTML = d.keys.map(k => {
      const pct = Math.min(100,(k.requestCount/k.rpm)*100);
      return \`<div style="padding:12px 20px;border-bottom:1px solid var(--border-light)">
        <div style="display:flex;align-items:center;gap:8px;margin-bottom:6px">
          <span class="badge \${k.enabled?'bd-success':'bd-danger'}">\${k.enabled?'启用':'禁用'}</span>
          <span style="font-size:13px;font-weight:500">\${k.label}</span>
          <span style="margin-left:auto;font-size:12px;color:var(--text-muted)">\${k.requestCount}/\${k.rpm} rpm</span>
        </div>
        <div class="key-bar"><div class="key-bar-fill" style="width:\${pct}%;\${pct>80?'background:var(--orange)':''}"></div></div>
      </div>\`;
    }).join('');
  } catch(e) {}
}
async function loadRecentLogsHome() {
  try {
    const r = await apiFetch('/admin/logs?limit=8');
    const d = await r.json();
    const tbody = document.getElementById('recent-logs-tbody');
    if (!d.logs?.length) { tbody.innerHTML='<tr><td colspan="5"><div class="empty-box"><div class="empty-icon"><i class="fas fa-inbox"></i></div><div>暂无日志</div></div></td></tr>'; return; }
    tbody.innerHTML = d.logs.map(l => \`<tr>
      <td style="color:var(--text-muted);font-size:12px">\${fmtTime(l.timestamp)}</td>
      <td><span class="model-pill">\${l.model}</span></td>
      <td><span class="badge bd-info">\${l.keyId}</span></td>
      <td>\${statusBadge(l.status)}</td>
      <td style="color:var(--text-muted);font-size:12px">\${l.latency}ms</td>
    </tr>\`).join('');
  } catch(e) {}
}
async function renderTrendChart() {
  const canvas = document.getElementById('trend-chart');
  const emptyEl = document.getElementById('chart-empty');
  if (!canvas) return;
  if (trendChart) { trendChart.destroy(); trendChart = null; }
  const now = Date.now();
  const buckets = Array.from({length:24}, () => ({success:0,error:0}));
  let hasData = false;
  try {
    const r = await apiFetch('/admin/logs?limit=500');
    const d = await r.json();
    (d.logs||[]).forEach(l => {
      const h = (now - l.timestamp) / 3600000;
      if (h < 24) { const b = 23 - Math.floor(h); if (b>=0&&b<24) { if (String(l.status).startsWith('2')) buckets[b].success++; else buckets[b].error++; hasData=true; } }
    });
  } catch(e) {}
  if (!hasData) { canvas.style.display='none'; if (emptyEl) emptyEl.style.display='block'; document.getElementById('chart-note').textContent='暂无数据'; return; }
  canvas.style.display='block'; if (emptyEl) emptyEl.style.display='none';
  document.getElementById('chart-note').textContent='最近24小时（真实数据）';
  const labels=[], sd=[], ed=[];
  for (let i=23;i>=0;i--) { const h=new Date(now-i*3600000); labels.push(h.getHours()+':00'); sd.push(buckets[23-i].success); ed.push(buckets[23-i].error); }
  trendChart = new Chart(canvas, {
    type:'bar', data:{ labels, datasets:[
      {label:'成功',data:sd,backgroundColor:'rgba(24,160,88,0.7)',borderRadius:3},
      {label:'失败',data:ed,backgroundColor:'rgba(208,48,80,0.6)',borderRadius:3}
    ]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:true,position:'top',align:'end',labels:{boxWidth:10,font:{size:11},color:'#888ba0'}}},
      scales:{x:{stacked:true,grid:{display:false},ticks:{color:'#888ba0',font:{size:11},maxTicksLimit:8}},
              y:{stacked:true,grid:{color:'#f0f0f6'},ticks:{color:'#888ba0',font:{size:11}},beginAtZero:true}},
      interaction:{intersect:false,mode:'index'}}
  });
}

// ─────────────── ADMIN: CHANNELS ───────────────
async function loadChannels() {
  try {
    const r = await apiFetch('/admin/keys');
    const d = await r.json();
    const lbl = document.getElementById('channel-total-label');
    if (lbl) lbl.textContent = '共 '+(d.keys?.length||0)+' 个渠道';
    const tb = document.getElementById('channels-tbody');
    if (!d.keys?.length) { tb.innerHTML='<tr><td colspan="9"><div class="empty-box"><div class="empty-icon"><i class="fas fa-server"></i></div><div>暂无渠道</div></div></td></tr>'; return; }
    tb.innerHTML = d.keys.map((k,i) => \`<tr>
      <td style="color:var(--text-muted);font-size:12px">\${i+1}</td>
      <td style="font-weight:500">\${k.label}</td>
      <td><span class="badge bd-purple">NVIDIA NIM</span></td>
      <td><label class="switch"><input type="checkbox" \${k.enabled?'checked':''} onchange="toggleKey('\${k.id}',this.checked)"><div class="sw-track"></div><div class="sw-thumb"></div></label></td>
      <td><span>\${k.requestCount}</span><div class="key-bar" style="width:60px"><div class="key-bar-fill" style="width:\${Math.min(100,(k.requestCount/k.rpm)*100)}%"></div></div></td>
      <td><span class="badge bd-info">\${k.rpm} rpm</span></td>
      <td style="color:var(--text-muted)">\${k.totalRequests.toLocaleString()}</td>
      <td style="color:\${k.failCount>0?'var(--red)':'var(--text-muted)'}">\${k.failCount}</td>
      <td><button class="btn btn-danger btn-xs" onclick="deleteKey('\${k.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>\`).join('');
  } catch(e) {}
}
async function addKey() {
  const label=document.getElementById('new-key-label').value.trim(), key=document.getElementById('new-key-value').value.trim(), rpm=parseInt(document.getElementById('new-key-rpm').value);
  if (!label||!key) { toast('请填写名称和 API Key','error'); return; }
  const r = await apiFetch('/admin/keys',{method:'POST',body:JSON.stringify({label,key,rpm:rpm||40})});
  if (r.ok) { toast('渠道添加成功'); closeModal('modal-add-key'); loadChannels(); }
  else { const d=await r.json(); toast(d.error||'失败','error'); }
}
async function toggleKey(id, en) {
  await apiFetch('/admin/keys/'+id,{method:'PATCH',body:JSON.stringify({enabled:en})});
  toast(en?'已启用':'已禁用'); loadChannelStatusList();
}
async function deleteKey(id) {
  if (!confirm('确认删除该渠道？')) return;
  const r = await apiFetch('/admin/keys/'+id,{method:'DELETE'});
  if (r.ok) { toast('已删除'); loadChannels(); loadChannelStatusList(); }
}

// ─────────────── ADMIN: TOKENS ───────────────
async function loadTokens() {
  try {
    const r = await apiFetch('/admin/tokens');
    const d = await r.json();
    const tb = document.getElementById('tokens-tbody');
    if (!d.tokens?.length) { tb.innerHTML='<tr><td colspan="8"><div class="empty-box"><div class="empty-icon"><i class="fas fa-key"></i></div><div>暂无令牌</div></div></td></tr>'; return; }
    tb.innerHTML = d.tokens.map(t => \`<tr>
      <td style="font-weight:500">\${t.name}</td>
      <td><code style="font-size:11px;background:var(--bg);border:1px solid var(--border);padding:3px 8px;border-radius:4px">\${t.token}</code>
        <button class="btn-icon" onclick="copyVal('\${t.token}')"><i class="fas fa-copy"></i></button></td>
      <td><label class="switch"><input type="checkbox" \${t.enabled?'checked':''} onchange="toggleToken('\${t.id}',this.checked)"><div class="sw-track"></div><div class="sw-thumb"></div></label></td>
      <td>\${t.requestCount}</td>
      <td><span class="badge bd-info">\${t.rpmLimit} rpm</span></td>
      <td style="color:var(--text-muted)">\${t.totalRequests.toLocaleString()}</td>
      <td style="color:var(--text-muted);font-size:12px">\${fmtTime(t.createdAt)}</td>
      <td><button class="btn btn-danger btn-xs" onclick="deleteToken('\${t.id}')"><i class="fas fa-trash"></i></button></td>
    </tr>\`).join('');
  } catch(e) {}
}
async function addToken() {
  const name=document.getElementById('new-token-name').value.trim(), rpmLimit=parseInt(document.getElementById('new-token-rpm').value);
  if (!name) { toast('请填写令牌名称','error'); return; }
  const r = await apiFetch('/admin/tokens',{method:'POST',body:JSON.stringify({name,rpmLimit:rpmLimit||100})});
  if (r.ok) { toast('令牌创建成功'); closeModal('modal-add-token'); loadTokens(); }
  else { const d=await r.json(); toast(d.error||'失败','error'); }
}
async function toggleToken(id, en) {
  await apiFetch('/admin/tokens/'+id,{method:'PATCH',body:JSON.stringify({enabled:en})});
  toast(en?'已启用':'已禁用');
}
async function deleteToken(id) {
  if (!confirm('确认删除该令牌？')) return;
  const r = await apiFetch('/admin/tokens/'+id,{method:'DELETE'});
  if (r.ok) { toast('已删除'); loadTokens(); }
}

// ─────────────── ADMIN: LOGS ───────────────
let allLogs=[], logsPage=1;
const LOGS_PER_PAGE=20;
async function loadLogs() {
  const tb = document.getElementById('logs-tbody');
  tb.innerHTML = '<tr><td colspan="7" class="loading-box"><span class="spin"><i class="fas fa-circle-notch"></i></span></td></tr>';
  try {
    const r = await apiFetch('/admin/logs?limit=500');
    const d = await r.json();
    allLogs = d.logs||[]; logsPage=1; renderLogs();
  } catch(e) { tb.innerHTML='<tr><td colspan="7" class="empty-box"><div>加载失败</div></td></tr>'; }
}
function filterLogs() { logsPage=1; renderLogs(); }
function renderLogs() {
  const f = document.getElementById('log-status-filter')?.value||'';
  let logs = allLogs;
  if (f==='200') logs=logs.filter(l=>String(l.status).startsWith('2'));
  else if (f==='400') logs=logs.filter(l=>String(l.status).startsWith('4'));
  else if (f==='500') logs=logs.filter(l=>String(l.status).startsWith('5'));
  const total=logs.length, start=(logsPage-1)*LOGS_PER_PAGE, pg=logs.slice(start,start+LOGS_PER_PAGE);
  const tb=document.getElementById('logs-tbody');
  if (!pg.length) { tb.innerHTML='<tr><td colspan="7"><div class="empty-box"><div class="empty-icon"><i class="fas fa-inbox"></i></div><div>暂无日志</div></div></td></tr>'; }
  else tb.innerHTML = pg.map(l=>\`<tr>
    <td style="color:var(--text-muted);font-size:12px;white-space:nowrap">\${fmtTime(l.timestamp)}</td>
    <td><span class="model-pill">\${l.model}</span></td>
    <td><span class="badge bd-info" style="font-size:11px">\${l.keyId}</span></td>
    <td style="font-size:12px;color:var(--text-muted);max-width:120px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">\${l.userToken}</td>
    <td>\${statusBadge(l.status)}</td>
    <td style="font-size:12px;color:var(--text-muted)">\${l.latency}ms</td>
    <td \${l.error?\`title="\${l.error.substring(0,100)}"\`:''}>
      \${l.error?'<span style="color:var(--red);font-size:11px;cursor:help"><i class="fas fa-exclamation-triangle"></i> 错误</span>':'<span style="color:var(--text-muted);font-size:11px">-</span>'}
    </td>
  </tr>\`).join('');
  const tp=Math.ceil(total/LOGS_PER_PAGE), pag=document.getElementById('logs-pagination');
  if (!pag) return;
  if (tp<=1) { pag.innerHTML=total?\`<span class="page-info">共 \${total} 条</span>\`:''; return; }
  let h='';
  if (logsPage>1) h+=\`<button class="page-btn" onclick="goPage(\${logsPage-1})"><i class="fas fa-chevron-left"></i></button>\`;
  for (let i=Math.max(1,logsPage-2);i<=Math.min(tp,logsPage+2);i++) h+=\`<button class="page-btn \${i===logsPage?'active':''}" onclick="goPage(\${i})">\${i}</button>\`;
  if (logsPage<tp) h+=\`<button class="page-btn" onclick="goPage(\${logsPage+1})"><i class="fas fa-chevron-right"></i></button>\`;
  h+=\`<span class="page-info">共 \${total} 条</span>\`;
  pag.innerHTML=h;
}
function goPage(p) { logsPage=p; renderLogs(); }

// ─────────────── ADMIN: SETTINGS ───────────────
async function loadSettings() {
  try { const r=await fetch('/v1/models'); const d=await r.json(); const el=document.getElementById('settings-model-count'); if(el) el.textContent=(d.data?.length||0)+' 个'; } catch(e){}
}
async function changePassword() {
  const pwd=document.getElementById('new-password').value.trim();
  if (!pwd||pwd.length<6) { toast('密码至少6位','error'); return; }
  const r=await apiFetch('/admin/password',{method:'POST',body:JSON.stringify({password:pwd})});
  const d=await r.json();
  if (r.ok) { toast('密码修改成功，即将退出'); setTimeout(logout,1500); }
  else toast(d.error||'失败','error');
}
` : ''}

// ─────────────── INIT ───────────────
document.addEventListener('DOMContentLoaded', () => {
  initHome();
  // Close modals on overlay click
  document.querySelectorAll('.modal-overlay').forEach(o => o.addEventListener('click', e => { if (e.target===o) o.classList.remove('open'); }));
});
</script>
</body>
</html>`
}
