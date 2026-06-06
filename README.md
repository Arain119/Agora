# Agora

零成本 **VLESS over WebSocket** 代理 + **Clash 订阅生成器**，运行在 **Cloudflare Pages/Workers** 上。
无需服务器、无需信用卡，部署后得到一个可直接导入 Clash 的订阅链接，供自己和少数朋友使用。

## 特性

- 🆓 **全程免费**：跑在 Cloudflare 免费额度上（每天 10 万请求，自用绰绰有余）。
- 📥 **一键导入 Clash**：内置 Clash Meta(mihomo) 订阅生成，含智能分流、广告拦截、策略组。
- ⚡ **优选 IP**：订阅自动展开多个 Cloudflare 优选地址节点，客户端测速择优。
- 🔁 **proxyIP 回退**：直连受限目标时自动走中转。
- 🧩 **自包含**：核心仅 `_worker.js` + `src/sub.mjs`，逻辑清晰可控，非黑盒。
- ✅ **离线可验证**：`npm run gen` 本地生成并校验订阅，不必先部署。

## 快速开始

1. 把本仓库部署到 Cloudflare Pages（Git 集成）。
2. 配置环境变量 `UUID`（你的身份 + 订阅 token）。
3. 访问 `https://<你的域名>/<UUID>` 得到 Clash 订阅，导入客户端。

详细步骤见 **[docs/DEPLOY.md](./docs/DEPLOY.md)**。

## 文档

- [部署教程](./docs/DEPLOY.md) —— 从零部署到 Cloudflare Pages
- [免费域名](./docs/DOMAIN.md) —— 零成本绑定自定义域名，解决 `*.pages.dev` 被墙
- [使用说明](./docs/USAGE.md) —— 朋友端导入 Clash

## 项目结构

```
_worker.js          VLESS-over-WS 服务端 + 订阅路由（Cloudflare 运行时）
src/sub.mjs         纯函数订阅生成器（worker 与离线脚本共用）
clash/template.yaml Clash Meta 配置模板（与 sub.mjs 内联模板保持一致，有守卫校验）
scripts/gen-sub.mjs 离线生成 + 校验脚本
wrangler.toml       Cloudflare 部署配置
docs/               部署 / 域名 / 使用文档
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
