# 部署教程（Cloudflare Pages，全程免费）

把 Agora 部署到 Cloudflare Pages，得到一个可导入 Clash 的订阅链接。
全程不需要服务器、不需要信用卡，**也几乎不需要配置环境变量**——口令和身份都自动生成。

> 适用范围：自己 + 少数朋友的小流量使用。请勿大规模公开拉人（见 README 风险说明）。

准备：一个 GitHub 账号、一个 [Cloudflare 账号](https://dash.cloudflare.com/sign-up)。

---

## 方式一：命令行一键部署（最快）

本机装好 Node 后：

```bash
npm install
npx wrangler login        # 仅首次，浏览器授权一次
npm run setup             # 自动创建并绑定 KV、部署 Pages
```

`npm run setup` 会自动：创建 KV namespace `AGORA_KV` → 写入 `wrangler.toml` → 部署到 Pages，
最后打印出你的网址。然后跳到下面 **第 3 步：一键初始化**。

> 想先演练不动账号：`node scripts/setup.mjs --dry-run`

---

## 方式二：网页控制台部署（无需命令行）

### 1. 连接仓库并部署

1. Cloudflare 控制台 → **Workers & Pages** → **Create** → **Pages** → **Connect to Git**。
2. 选择本仓库，分支 `main`（或你部署用的分支）。
3. 构建设置：**Framework preset** = None；**Build command** 留空；**Build output directory** = `/`。
   Cloudflare 会自动识别根目录 `_worker.js`（高级模式）并打包其 import。
4. **Save and Deploy**，等待部署完成。

### 2. 创建并绑定 KV

管理面板与自动口令都依赖一个 KV 存储：

1. 控制台 → **Workers & Pages** → **KV** → **Create a namespace**，命名 `AGORA_KV`。
2. 回到本 Pages 项目 → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**：
   - Variable name：`AGORA_KV`
   - KV namespace：选刚创建的 `AGORA_KV`
3. 保存后 **Deployments** → 对最新部署 **Retry deployment** 让绑定生效。

> 不绑定也能跑，但会退化为「无管理面板」的单用户模式，不推荐。
> KV 免费额度（每天 10 万次读）对自用场景绰绰有余。

---

## 3. 一键初始化（两种方式都到这一步）

部署完成后你会得到一个地址，如 `https://agora-xxx.pages.dev`。

1. **浏览器打开这个网址**，会看到「🔐 一键初始化」页面。
2. 点 **「🚀 生成并启用管理面板」**。系统会自动生成：
   - 一条**管理面板链接**（含随机高熵口令）——请**收藏保存，勿外泄**；
   - 你的**站长订阅链接**。
3. 完成。初始化页随后不再可用（口令已锁定）。

> 全自动：站长 UUID 自动生成、管理口令自动生成，**无需手动配置任何环境变量**。

---

## 4. 分发与使用

- 把**站长订阅链接**导入自己的 Clash（用法见 [USAGE.md](./USAGE.md)）。
- 打开**管理面板链接**，「+ 添加」朋友，把各自的订阅链接发给他们。
- 一条订阅 URL 通吃所有客户端：服务端按 User-Agent 自动返回 Clash / sing-box / 通用 base64，
  无需手动加 `?target=`（也支持 `?target=clash|singbox|v2ray` 显式指定）。

> ⚠️ 中国大陆网络下 `*.pages.dev` 的 SNI 常被阻断，可能连不上。
> 解决办法见 [DOMAIN.md](./DOMAIN.md)：绑定一个**免费自定义域名**即可稳定使用。

---

## 5. 管理面板（默认功能）

打开你收藏的管理链接 `https://<域名>/<口令>`，进入 **Editorial 风格控制台**（暖纸张 · 墨黑 · 朱红）：

- **左栏「成员名册」**：输入好友名称回车「添加」，自动分配独立 UUID/订阅；点任意成员弹出抽屉，含订阅链接复制、Clash/sing-box/v2rayN/通用 一键导入、停用/启用、移除。站长账号受保护不可删。
- **右栏「网络优选」仪表盘**：把自动维护的优选数据可视化——存活率甜甜圈、优选历史 sparkline、按延迟排序的节点延迟条、12h 自动优选周期进度，底部「立即优选」可手动触发。
- **设置**收在右上角齿轮抽屉里（自动优选开关、订阅名、优选来源、中转 IP），改动保存即时生效，无需重新部署。

> 当朋友用**浏览器**打开自己的订阅链接时，看到的是一张温暖的**好友导入页**（按名问候 + 各客户端一键导入 + 三步指引）；真实代理客户端按 User-Agent 仍拿到原始 YAML/JSON/base64。
> API 仍可脚本化：`POST /<口令>/api/refresh` 立即优选；`GET/POST /<口令>/api/settings` 读取/覆盖默认。

> 脚本化管理（面板即调用这些接口）：
> `GET /<口令>/api/users`、`POST .../api/users {name}`、
> `DELETE/PATCH .../api/users/<id>`、`GET/POST .../api/settings`。
> 提示：KV 最终一致，增删后偶尔需几秒全局生效。

---

## 6. （可选）固定环境变量

默认全自动即可。若你想用固定值，在 Pages **Settings → Variables and Secrets**（建议设为 Secret）配置：

| 变量名 | 说明 |
| --- | --- |
| `UUID` | 固定站长 ID/订阅 token（不设则自动生成存入 KV） |
| `ADMIN_TOKEN` | 固定管理口令（不设则用「一键初始化」生成） |
| `PROXYIP` / `SUB_NAME` / `PREFERRED` | 也都可在面板里改 |

> 切勿把这些写进 `wrangler.toml` 的 `[vars]`——那会被原样部署成**公开**的生产值。

---

## 7. 本地开发与验证（可选）

```bash
npm install
npm run gen -- your-app.pages.dev <uuid>   # 离线生成+校验订阅（clash/v2ray/singbox）
npm run check                              # 生成校验 + esbuild 打包 worker
npm run dev                                # 本地起服务器(含本地 KV)，访问 / 走一键初始化
```

`npm run gen` 会在 `out/` 下生成 `clash.yaml`、`v2ray.txt`、`singbox.json`，并执行守卫检查：
模板一致性、Clash YAML 可解析、sing-box JSON 可解析。
