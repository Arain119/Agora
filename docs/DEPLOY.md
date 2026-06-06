# 部署教程（Cloudflare Pages，全程免费）

本教程把 Agora 部署到 Cloudflare Pages，得到一个可导入 Clash 的订阅链接。
全程不需要服务器、不需要信用卡。

> 适用范围：自己 + 少数朋友的小流量使用。请勿大规模公开拉人（见 README 风险说明）。

---

## 0. 准备

- 一个 GitHub 账号（已 fork 或拥有本仓库）
- 一个 Cloudflare 账号（免费注册：<https://dash.cloudflare.com/sign-up>）
- 生成一个 UUID 作为你的身份与订阅 token：
  - Linux/macOS：`uuidgen`
  - 或在线生成：<https://www.uuidgenerator.net/>
  - 形如 `11111111-2222-3333-4444-555555555555`

---

## 1. 创建 Pages 项目并连接仓库

1. 进入 Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 选择本仓库，分支选 `main`（或你部署用的分支）。
3. 构建设置：
   - **Framework preset**：None
   - **Build command**：留空
   - **Build output directory**：`/`（根目录）
   - 其余默认。Cloudflare 会自动识别根目录的 `_worker.js`（高级模式）并打包其 import。
4. 点击 **Save and Deploy**，等待部署完成。

---

## 2. 配置环境变量

进入该 Pages 项目 → **Settings** → **Variables and Secrets** → 添加：

| 变量名 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `UUID` | ✅ | `11111111-2222-3333-4444-555555555555` | VLESS 用户 ID，同时是订阅 token |
| `PROXYIP` | 否 | `8.8.8.8` 或 `proxyip.example.com:443` | 直连失败时的中转地址，提升对部分站点的连通性 |
| `SUB_NAME` | 否 | `Agora` | 节点名前缀 |
| `PREFERRED` | 否 | `104.16.0.0#CF1,time.is#CF2` | 自定义优选地址，逗号分隔 |

保存后到 **Deployments** → 对最新部署点 **Retry deployment**，让变量生效。

> `PROXYIP` 可填社区公开的 proxyIP（搜索 “cloudflare proxyip”）。不填也能用，只是少数 CF 回源受限的站点可能连不上。

---

## 3. 获取订阅链接

部署完成后你会得到一个地址，如 `https://agora-xxx.pages.dev`。

- **Clash 订阅**（默认）：`https://agora-xxx.pages.dev/<你的UUID>`
- **通用 base64 订阅**：`https://agora-xxx.pages.dev/<你的UUID>?target=v2ray`

在浏览器打开 Clash 订阅链接，应能看到一段 YAML，即表示成功。

> ⚠️ 中国大陆网络下 `*.pages.dev` 的 SNI 常被阻断，可能无法直接连通。
> 解决办法见 [DOMAIN.md](./DOMAIN.md)：绑定一个**免费自定义域名**即可稳定使用。

把订阅链接发给朋友导入即可（客户端用法见 [USAGE.md](./USAGE.md)）。

---

## 4. 本地开发与验证（可选）

```bash
npm install
# 离线生成 + 校验订阅（不需要部署）
npm run gen -- your-app.pages.dev <你的UUID>
# 打包 worker，确认无语法/导入错误
npm run check
# 本地起一个开发服务器（需要 wrangler 登录）
npm run dev
```

`npm run gen` 会在 `out/` 下生成 `clash.yaml` 与 `v2ray.txt`，并执行两项守卫检查：
模板一致性、YAML 可解析性。

---

## 5. （可选增强）自适应多用户管理

给少数朋友分发时，目前最简单的做法是**共用一个 UUID**，或在代码里支持多个 UUID。
若希望**不改代码、动态增删用户/优选 IP**，可启用 KV：

1. **Workers & Pages** → **KV** → 创建一个 namespace（如 `AGORA_KV`）。
2. 在 Pages 项目 **Settings → Functions → KV namespace bindings** 绑定，变量名 `AGORA_KV`。
3. 后续在 `_worker.js` 中读取 `env.AGORA_KV` 来管理用户列表/优选 IP（当前版本预留了位置，
   按需扩展；最小可用版仅用环境变量即可运行）。

KV 免费额度（每天 10 万次读）对自用场景完全够用。
