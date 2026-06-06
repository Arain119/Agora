# Agora

零成本 **VLESS over WebSocket** 代理 + **Clash 订阅生成器**，运行在 **Cloudflare Pages/Workers** 上。
无需服务器、无需信用卡，部署后得到一个可直接导入 Clash 的订阅链接，供自己和少数朋友使用。

## 特性

- 🆓 **全程免费**：跑在 Cloudflare 免费额度上（每天 10 万请求，自用绰绰有余）。
- 🤖 **近零配置**：站长 UUID、管理口令全部**自动生成**，无需手动配环境变量；打开站点一键初始化即可。
- 📥 **一条订阅通吃**：按客户端 User-Agent 自动返回 **Clash / sing-box / 通用 base64**，无需 `?target=`。
- 🎛️ **Editorial 风格控制台**：暖纸张 · 墨黑 · 单一朱红的 Swiss/编辑设计。左栏「成员名册」加好友、右栏「网络优选」仪表盘（存活率甜甜圈、优选历史 sparkline、按延迟排序的节点条、12h 自动优选周期），设置收进齿轮抽屉，改动即时生效。
- 🪪 **好友导入页**：朋友用浏览器打开自己的订阅链接时，看到的是一张温暖的导入卡片（按名问候 + Clash/sing-box/v2rayN/Shadowrocket 一键导入 + 三步指引），而非裸 YAML；真实代理客户端按 UA 仍拿到原始订阅。
- ⚡ **优选 IP 全自动**：订阅被访问时在后台（`waitUntil`）每 12h 多源拉取优选源、用 `connect()` **TCP 握手测延迟 + 连通性自检剔除失效**、按延迟排序缓存，并保留近 12 次存活数环形缓冲供 sparkline 展示。
- 🔁 **proxyIP 回退**：直连受限目标时自动走中转。
- 🧩 **前后端统一**：UI 由 `panel/` 下可编辑源 + `scripts/build-panel.mjs` 生成 `src/panel.mjs`，被 `_worker.js` 直接服务，原型与线上同源同数据。
- ✅ **离线可验证**：`npm run check` 重建面板 + 生成校验三种订阅 + 打包 worker。

## 快速开始

```bash
npm install && npx wrangler login && npm run setup
```

`npm run setup` 自动建并绑定 KV、部署到 Pages。然后**浏览器打开输出的网址 → 点「一键初始化」**，
即得到管理面板链接与站长订阅链接。进面板「+ 添加」朋友、把各自订阅发出去即可。

> 也支持网页控制台手动部署，全部步骤见 **[docs/DEPLOY.md](./docs/DEPLOY.md)**。

详细步骤见 **[docs/DEPLOY.md](./docs/DEPLOY.md)**。

## 文档

- [部署教程](./docs/DEPLOY.md) —— 从零部署到 Cloudflare Pages
- [免费域名](./docs/DOMAIN.md) —— 零成本绑定自定义域名，解决 `*.pages.dev` 被墙
- [使用说明](./docs/USAGE.md) —— 朋友端导入 Clash

## 项目结构

```
_worker.js             VLESS-over-WS 服务端 + 订阅路由 + KV 管理面板/API（Cloudflare 运行时）
src/sub.mjs            纯函数订阅生成器（worker 与离线脚本共用）
src/panel.mjs          GENERATED：面板/初始化/好友页的 CSS+JS+模板（由下面 panel/ 生成）
panel/                 可编辑 UI 源：agora.css · agora-views.css · app.prod.js · *.tmpl + 原型 HTML
clash/template.yaml    Clash Meta 配置模板（与 sub.mjs 内联模板保持一致，有守卫校验）
scripts/build-panel.mjs 由 panel/ 重建 src/panel.mjs
scripts/gen-sub.mjs    离线生成 + 校验脚本
wrangler.toml          Cloudflare 部署配置
docs/                  部署 / 域名 / 使用文档
```

## 技术说明与限制

- 协议为 **VLESS + WebSocket + TLS**（由 Cloudflare 边缘提供 443 TLS）。
- CF 免费层**不支持 UDP**，因此不支持 Reality / Hysteria2 / 依赖 UDP 的游戏与语音；
  网页浏览、流媒体、下载不受影响。
- `*.pages.dev` / `*.workers.dev` 在部分地区被 SNI 阻断，建议绑定自定义域名（见 DOMAIN.md）。

## ⚠️ 使用须知 / 合规

- 本项目用于**个人隐私保护与网络访问**，面向自己及少数朋友，**非大规模公开服务**。
- 用 Cloudflare Workers/CDN 代理流量属其 ToS 灰色地带；请控制流量规模，避免账号被限制。
- 使用者须遵守所在地法律法规，并自行承担使用责任。本项目不对任何滥用行为负责。
