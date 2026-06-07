# Agora

零成本 **VLESS over WebSocket** 代理 + **Clash 订阅生成器**，跑在 **Cloudflare Pages/Workers** 上。
无需服务器、无需信用卡，部署即得一个可导入 Clash 的订阅链接，供自己和少数朋友使用。

<p>
  <a href="https://deploy.workers.cloudflare.com/?url=https://github.com/Arain119/Agora">
    <img src="https://deploy.workers.cloudflare.com/button" alt="Deploy to Cloudflare">
  </a>
</p>

---

## 🚀 傻瓜式开始（两条路，任选其一）

### 路线 A · 一条命令全自动（推荐）

```bash
npm install && npx wrangler login && npm run setup
```

`npm run setup` 会**一口气跑完**：创建并绑定 KV → 部署到 Pages → **自动初始化** →
直接在终端打印你的**管理面板链接**和**站长订阅链接**。立即收藏这两条（含口令，仅显示一次），完事。

### 路线 B · 网页点按钮（零终端）

1. 点上面的 **Deploy to Cloudflare** 按钮，按提示把仓库部署到你的 Cloudflare（会自动 fork 到你的 GitHub）。
2. 部署后，在该 Pages 项目 **Settings → Functions → KV namespace bindings** 新建并绑定一个变量名为
   `AGORA_KV` 的 KV（约 3 次点击），然后 **Deployments → Retry deployment**。
3. 浏览器打开部署得到的网址，点页面上的 **「初始化并启用面板 →」**，拿到管理面板链接与站长订阅链接。

> 之后：打开**管理面板**输入好友名字回车「添加」，点「复制订阅 / 导入Clash」或让对方**扫码**即可。
> 全程**无需手动配置任何环境变量**：站长 UUID 与管理口令都自动生成。

---

## ✨ 特性

- 🆓 **全程免费**：Cloudflare 免费额度（每天 10 万请求，自用绰绰有余），无需服务器/信用卡。
- 🤖 **近零配置**：站长 UUID、管理口令自动生成；命令行路径连初始化都自动完成。
- 📥 **一条订阅通吃**：按客户端 UA 自动返回 **Clash / sing-box / 通用 base64**，无需 `?target=`。
- 🎛️ **Editorial 控制台**：暖纸张·墨黑·朱红的 Swiss 风格。左栏成员名册、右栏「网络优选」仪表盘（存活率甜甜圈、优选历史 sparkline、按延迟排序节点条、12h 自动优选周期），设置收进齿轮抽屉。
- 🪪 **好友导入页 + 二维码**：朋友用浏览器打开订阅链接，看到的是按名问候的导入卡片（一键导入各客户端 + **可扫描二维码** + 三步指引），而非裸 YAML；真实客户端按 UA 仍拿原始订阅。
- ⚡ **优选 IP 全自动**：后台（`waitUntil`）每 12h 多源拉取 + `connect()` **TCP 测延迟 + 连通性自检剔除失效**，按延迟排序缓存，并留近 12 次存活数环形缓冲供图表。
- 🔁 **proxyIP 回退**：直连受限目标时自动走中转。
- ✅ **可验证**：`npm run check` 重建面板 + QR 解码测试(jsQR) + 三格式订阅校验 + 打包 worker。

---

<details>
<summary><b>📦 部署细节 / 管理面板用法</b></summary>

### 准备
一个 GitHub 账号、一个 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)。两条路线见上方「傻瓜式开始」。

### 管理面板
打开你收藏的管理链接 `https://<域名>/<口令>`：
- **成员名册**：输入名称回车「添加」，自动分配独立 UUID/订阅；点成员弹抽屉，含复制订阅、Clash/sing-box/v2rayN 一键导入、**扫码导入**、停用/启用、移除。站长账号受保护不可删。
- **网络优选仪表盘**：可视化自动维护的优选数据（甜甜圈/历史/延迟条/周期），底部「立即优选」可手动触发。
- **齿轮设置**：自动优选开关、订阅名、优选来源（支持多源逗号分隔）、中转 IP，保存即时生效。

> API（可脚本化）：`POST /<口令>/api/refresh` 立即优选；`GET/POST /<口令>/api/settings` 读取/覆盖默认。

### 本地开发 / 验证
```bash
npm install
npm run check    # 重建面板 + QR 测试 + 三格式订阅校验 + esbuild 打包
npm run dev      # 本地起服务器(含本地 KV)，访问 / 走初始化
```
UI 源在 `panel/`（`agora.css`/`agora-views.css`/`app.prod.js`/`*.tmpl`），改完跑 `npm run build:panel` 重生成 `src/panel.mjs`。
</details>

<details>
<summary><b>📲 朋友端：导入 Clash</b></summary>

把订阅链接发给朋友，或让他们**扫码**。请用 **Clash Meta 内核**客户端：

| 平台 | 客户端 |
| --- | --- |
| Win/Mac/Linux | [Clash Verge Rev](https://github.com/clash-verge-rev/clash-verge-rev) |
| Android/全平台 | [FlClash](https://github.com/chen08209/FlClash) · [mihomo](https://github.com/MetaCubeX/mihomo) |
| iOS | Shadowrocket / Stash（付费），或用 `?target=v2ray` |

- 一条订阅 URL 通吃：服务端按 UA 自动返回 Clash YAML / sing-box JSON / base64。
- 电脑点「导入Clash」(`clash://`) 一键导入；手机直接**扫二维码**打开导入页。
- 连不上？多半是 `*.pages.dev` 被阻断 → 让管理员绑自定义域名（见下）；或换个节点。
- 游戏/语音不通：CF 免费层不支持 UDP，浏览/视频不受影响。
</details>

<details>
<summary><b>🌐 零成本自定义域名（解决 *.pages.dev 被墙）</b></summary>

大陆网络下 `*.pages.dev`/`*.workers.dev` 的 SNI 常被阻断，绑定自定义域名即可绕过，且可完全免费：

1. 申请一个免费子域名：[DigitalPlat FreeDomain](https://domain.digitalplat.org/)(`*.dpdns.org`)、[US.KG](https://us.kg/)、[nic.eu.org](https://nic.eu.org/) 等。
2. 把域名接入 Cloudflare（免费 Plan）：Add a site → 改 NS 到 Cloudflare 给的两个。
3. Pages 项目 → **Custom domains** → 添加你的域名（自动签发证书）。
4. 之后用自定义域名访问订阅/管理面板即可。

进阶：在面板「优选来源」可填你实测的 Cloudflare 优选 IP（CloudflareSpeedTest），节点 `server` 用优选 IP、SNI/Host 仍用域名。
</details>

<details>
<summary><b>🗂️ 项目结构</b></summary>

```
_worker.js              VLESS-over-WS 服务端 + 订阅路由 + KV 管理面板/API + 好友页 + 二维码端点
src/sub.mjs             纯函数订阅生成器（Clash/sing-box/base64，worker 与离线脚本共用）
src/panel.mjs           GENERATED：面板/初始化/好友页的 CSS+JS+模板（由 panel/ 生成）
src/qr.mjs              自包含 QR 编码器（字节模式·EC-M·版本 1-10，输出 SVG）
panel/                  可编辑 UI 源 + 原型 HTML
clash/template.yaml     Clash Meta 配置模板（与 sub.mjs 内联模板一致，有守卫校验）
scripts/build-panel.mjs 由 panel/ 重建 src/panel.mjs
scripts/setup.mjs       一键创建 KV + 部署 + 自动初始化
scripts/gen-sub.mjs     离线生成 + 校验
scripts/test-qr.mjs     用 jsQR 解码验证二维码可扫
wrangler.toml           Cloudflare 部署配置
```
</details>

---

## ⚙️ 技术说明与限制

- 协议为 **VLESS + WebSocket + TLS**（由 Cloudflare 边缘提供 443 TLS）。
- CF 免费层**不支持 UDP**：不支持 Reality / Hysteria2 / 依赖 UDP 的游戏与语音；浏览、流媒体、下载不受影响。
- `*.pages.dev` / `*.workers.dev` 在部分地区被 SNI 阻断，建议绑定自定义域名（见上）。

## ⚠️ 使用须知 / 合规

- 本项目用于**个人隐私保护与网络访问**，面向自己及少数朋友，**非大规模公开服务**。
- 用 Cloudflare Workers/CDN 代理流量属其 ToS 灰色地带；请控制流量规模，避免账号被限制。
- 使用者须遵守所在地法律法规，并自行承担使用责任。本项目不对任何滥用行为负责。
