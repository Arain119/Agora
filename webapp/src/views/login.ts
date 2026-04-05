export function loginHTML(): string {
  return `<!DOCTYPE html>
<html lang="zh-CN">
<head>
  <meta charset="UTF-8">
  <meta name="viewport" content="width=device-width, initial-scale=1.0">
  <title>New API - 登录</title>
  <link href="https://cdn.jsdelivr.net/npm/@fortawesome/fontawesome-free@6.5.0/css/all.min.css" rel="stylesheet">
  <style>
    *, *::before, *::after { box-sizing: border-box; margin: 0; padding: 0; }
    :root {
      --primary: #2080f0;
      --primary-hover: #1060c0;
      --bg: #f5f7fa;
      --white: #ffffff;
      --border: #e8e8ee;
      --text: #333640;
      --text-muted: #888ba0;
      --text-secondary: #666878;
      --shadow: 0 2px 16px rgba(0,0,0,0.08);
      --shadow-lg: 0 8px 32px rgba(0,0,0,0.12);
      --radius: 8px;
      --input-h: 40px;
    }
    html, body {
      height: 100%;
      background: var(--bg);
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'PingFang SC', 'Microsoft YaHei', sans-serif;
      font-size: 14px;
      color: var(--text);
    }
    body {
      display: flex;
      align-items: center;
      justify-content: center;
      min-height: 100vh;
      background: linear-gradient(135deg, #f5f7fa 0%, #eef1f8 100%);
    }

    .login-container {
      width: 400px;
      background: var(--white);
      border-radius: 12px;
      box-shadow: var(--shadow-lg);
      padding: 40px;
      border: 1px solid var(--border);
    }

    .logo-area {
      text-align: center;
      margin-bottom: 32px;
    }
    .logo-icon {
      width: 56px;
      height: 56px;
      background: linear-gradient(135deg, #2080f0, #4299e1);
      border-radius: 14px;
      display: inline-flex;
      align-items: center;
      justify-content: center;
      color: white;
      font-size: 24px;
      margin-bottom: 16px;
      box-shadow: 0 4px 16px rgba(32,128,240,0.3);
    }
    .logo-title {
      font-size: 22px;
      font-weight: 700;
      color: var(--text);
      margin-bottom: 4px;
    }
    .logo-subtitle {
      font-size: 13px;
      color: var(--text-muted);
    }

    .tab-bar {
      display: flex;
      border-bottom: 1px solid var(--border);
      margin-bottom: 24px;
    }
    .tab-item {
      flex: 1;
      text-align: center;
      padding: 10px 0;
      cursor: pointer;
      font-size: 14px;
      color: var(--text-muted);
      border-bottom: 2px solid transparent;
      margin-bottom: -1px;
      transition: all 0.2s;
    }
    .tab-item.active {
      color: var(--primary);
      border-bottom-color: var(--primary);
      font-weight: 500;
    }

    .form-item {
      margin-bottom: 20px;
    }
    .form-label {
      display: block;
      font-size: 13px;
      color: var(--text-secondary);
      margin-bottom: 8px;
      font-weight: 500;
    }
    .input-wrap {
      position: relative;
    }
    .form-input {
      width: 100%;
      height: var(--input-h);
      padding: 0 12px;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      font-size: 14px;
      color: var(--text);
      background: var(--white);
      outline: none;
      transition: border-color 0.2s, box-shadow 0.2s;
    }
    .form-input:focus {
      border-color: var(--primary);
      box-shadow: 0 0 0 3px rgba(32,128,240,0.1);
    }
    .form-input::placeholder { color: #bbbcc8; }
    .input-prefix {
      position: absolute;
      left: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      font-size: 14px;
    }
    .form-input.with-prefix { padding-left: 36px; }
    .input-suffix {
      position: absolute;
      right: 12px;
      top: 50%;
      transform: translateY(-50%);
      color: var(--text-muted);
      cursor: pointer;
      font-size: 13px;
      padding: 2px 4px;
    }
    .input-suffix:hover { color: var(--primary); }
    .form-input.with-suffix { padding-right: 40px; }

    .btn {
      width: 100%;
      height: 40px;
      border: none;
      border-radius: var(--radius);
      font-size: 14px;
      font-weight: 500;
      cursor: pointer;
      display: flex;
      align-items: center;
      justify-content: center;
      gap: 8px;
      transition: all 0.2s;
      outline: none;
    }
    .btn-primary {
      background: var(--primary);
      color: white;
    }
    .btn-primary:hover { background: var(--primary-hover); }
    .btn-primary:active { transform: scale(0.98); }
    .btn-primary:disabled { opacity: 0.6; cursor: not-allowed; }
    .btn-default {
      background: white;
      color: var(--text);
      border: 1px solid var(--border);
    }
    .btn-default:hover { background: #f8f9fb; }

    .divider {
      text-align: center;
      position: relative;
      margin: 16px 0;
    }
    .divider::before {
      content: '';
      position: absolute;
      top: 50%;
      left: 0; right: 0;
      height: 1px;
      background: var(--border);
    }
    .divider-text {
      position: relative;
      background: white;
      padding: 0 12px;
      color: var(--text-muted);
      font-size: 12px;
    }

    .alert {
      padding: 10px 14px;
      border-radius: var(--radius);
      font-size: 13px;
      margin-bottom: 16px;
      display: none;
      align-items: center;
      gap: 8px;
    }
    .alert.show { display: flex; }
    .alert-error { background: #fff2f0; border: 1px solid #ffccc7; color: #cf1322; }
    .alert-success { background: #f6ffed; border: 1px solid #b7eb8f; color: #389e0d; }
    .alert-info { background: #e6f4ff; border: 1px solid #91caff; color: #0958d9; }

    .footer-text {
      text-align: center;
      margin-top: 20px;
      font-size: 13px;
      color: var(--text-muted);
    }
    .footer-text a {
      color: var(--primary);
      text-decoration: none;
    }
    .footer-text a:hover { text-decoration: underline; }

    .page-bg-dots {
      position: fixed;
      inset: 0;
      pointer-events: none;
      overflow: hidden;
      z-index: 0;
    }
    .page-bg-dots::before {
      content: '';
      position: absolute;
      top: -30%;
      left: -10%;
      width: 600px;
      height: 600px;
      background: radial-gradient(circle, rgba(32,128,240,0.06) 0%, transparent 70%);
      border-radius: 50%;
    }
    .page-bg-dots::after {
      content: '';
      position: absolute;
      bottom: -20%;
      right: -10%;
      width: 500px;
      height: 500px;
      background: radial-gradient(circle, rgba(100,210,180,0.06) 0%, transparent 70%);
      border-radius: 50%;
    }
    .login-container { position: relative; z-index: 1; }

    .spin {
      display: inline-block;
      animation: spin 1s linear infinite;
    }
    @keyframes spin { to { transform: rotate(360deg); } }

    .api-info {
      background: #f8f9fb;
      border: 1px solid var(--border);
      border-radius: var(--radius);
      padding: 12px 16px;
      margin-top: 24px;
    }
    .api-info-title {
      font-size: 12px;
      color: var(--text-muted);
      margin-bottom: 8px;
      font-weight: 500;
      text-transform: uppercase;
      letter-spacing: 0.5px;
    }
    .api-info-row {
      display: flex;
      align-items: center;
      gap: 8px;
      margin-bottom: 6px;
      font-size: 12px;
    }
    .api-info-row:last-child { margin-bottom: 0; }
    .api-label { color: var(--text-muted); width: 60px; flex-shrink: 0; }
    .api-value {
      font-family: 'SF Mono', 'Fira Code', Consolas, monospace;
      color: var(--text);
      background: white;
      border: 1px solid var(--border);
      border-radius: 4px;
      padding: 2px 8px;
      flex: 1;
      overflow: hidden;
      text-overflow: ellipsis;
      white-space: nowrap;
    }
    .copy-btn {
      color: var(--text-muted);
      cursor: pointer;
      padding: 2px 4px;
      border-radius: 4px;
    }
    .copy-btn:hover { color: var(--primary); background: rgba(32,128,240,0.08); }
  </style>
</head>
<body>
  <div class="page-bg-dots"></div>

  <div class="login-container">
    <div class="logo-area">
      <div class="logo-icon">
        <i class="fas fa-robot"></i>
      </div>
      <div class="logo-title">New API</div>
      <div class="logo-subtitle">NVIDIA AI 网关平台</div>
    </div>

    <div class="tab-bar">
      <div class="tab-item active" id="tab-login">密码登录</div>
    </div>

    <div id="alert-box" class="alert"></div>

    <form id="login-form">
      <div class="form-item">
        <label class="form-label">管理员密码</label>
        <div class="input-wrap">
          <span class="input-prefix"><i class="fas fa-lock"></i></span>
          <input type="password" id="password" class="form-input with-prefix with-suffix"
            placeholder="请输入管理员密码" autocomplete="current-password" />
          <span class="input-suffix" onclick="togglePwd()">
            <i class="fas fa-eye" id="pwd-eye"></i>
          </span>
        </div>
      </div>

      <button type="submit" class="btn btn-primary" id="login-btn">
        <i class="fas fa-sign-in-alt"></i>
        登录
      </button>
    </form>

    <div class="api-info">
      <div class="api-info-title">API 接入信息</div>
      <div class="api-info-row">
        <span class="api-label">Base URL</span>
        <span class="api-value" id="base-url-val">--</span>
        <span class="copy-btn" onclick="copyText('base-url-val')"><i class="fas fa-copy"></i></span>
      </div>
      <div class="api-info-row">
        <span class="api-label">API Key</span>
        <span class="api-value">sk-nvidia-router-default-2024</span>
        <span class="copy-btn" onclick="copyVal('sk-nvidia-router-default-2024')"><i class="fas fa-copy"></i></span>
      </div>
      <div class="api-info-row">
        <span class="api-label">模型数</span>
        <span class="api-value" id="model-count-val">加载中...</span>
      </div>
    </div>
  </div>

  <script>
    // Set base URL
    const baseUrl = window.location.origin;
    document.getElementById('base-url-val').textContent = baseUrl + '/v1';

    // Load model count
    fetch('/v1/models').then(r => r.json()).then(d => {
      document.getElementById('model-count-val').textContent = (d.data?.length || 0) + ' 个模型可用';
    }).catch(() => {
      document.getElementById('model-count-val').textContent = '获取失败';
    });

    function togglePwd() {
      const input = document.getElementById('password');
      const eye = document.getElementById('pwd-eye');
      if (input.type === 'password') {
        input.type = 'text';
        eye.className = 'fas fa-eye-slash';
      } else {
        input.type = 'password';
        eye.className = 'fas fa-eye';
      }
    }

    function showAlert(msg, type = 'error') {
      const box = document.getElementById('alert-box');
      const icons = { error: 'fa-circle-xmark', success: 'fa-circle-check', info: 'fa-circle-info' };
      box.className = 'alert alert-' + type + ' show';
      box.innerHTML = '<i class="fas ' + icons[type] + '"></i>' + msg;
    }

    function copyText(id) {
      const text = document.getElementById(id).textContent;
      navigator.clipboard.writeText(text).then(() => {
        showAlert('已复制到剪贴板', 'success');
        setTimeout(() => { document.getElementById('alert-box').classList.remove('show'); }, 2000);
      });
    }

    function copyVal(val) {
      navigator.clipboard.writeText(val).then(() => {
        showAlert('已复制到剪贴板', 'success');
        setTimeout(() => { document.getElementById('alert-box').classList.remove('show'); }, 2000);
      });
    }

    document.getElementById('login-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const password = document.getElementById('password').value.trim();
      if (!password) { showAlert('请输入密码'); return; }

      const btn = document.getElementById('login-btn');
      btn.disabled = true;
      btn.innerHTML = '<span class="spin"><i class="fas fa-circle-notch"></i></span> 登录中...';

      try {
        const res = await fetch('/admin/login', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ password })
        });
        const data = await res.json();
        if (res.ok && data.token) {
          sessionStorage.setItem('adminToken', data.token);
          showAlert('登录成功，正在跳转...', 'success');
          setTimeout(() => { window.location.href = '/dashboard'; }, 800);
        } else {
          showAlert(data.error || '密码错误');
          btn.disabled = false;
          btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
        }
      } catch (err) {
        showAlert('网络错误，请重试');
        btn.disabled = false;
        btn.innerHTML = '<i class="fas fa-sign-in-alt"></i> 登录';
      }
    });

    // Enter key
    document.getElementById('password').addEventListener('keypress', (e) => {
      if (e.key === 'Enter') document.getElementById('login-form').dispatchEvent(new Event('submit'));
    });
  </script>
</body>
</html>`;
}
