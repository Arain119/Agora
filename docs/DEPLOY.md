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

## 2. 创建并绑定 KV（自适应管理，默认启用）

本项目默认带一个管理面板，可在线增删用户、改优选 IP/proxyIP，**免改代码、免重新部署**。
这需要一个 KV 存储：

1. 控制台 → **Workers & Pages** → **KV** → **Create a namespace**，命名如 `AGORA_KV`。
2. 回到本 Pages 项目 → **Settings** → **Functions** → **KV namespace bindings** → **Add binding**：
   - Variable name：`AGORA_KV`
   - KV namespace：选刚创建的 `AGORA_KV`
3. 保存。

> 不绑定也能跑：会自动降级为「仅站长一个 UUID」的单用户模式，但管理面板不可用。
> 推荐绑定，KV 免费额度（每天 10 万次读）对自用场景绰绰有余。

## 3. 配置环境变量

进入该 Pages 项目 → **Settings** → **Variables and Secrets** → 添加：

| 变量名 | 必填 | 示例 | 说明 |
| --- | --- | --- | --- |
| `UUID` | ✅ | `11111111-2222-3333-4444-555555555555` | 站长的 VLESS ID，同时是其订阅 token |
| `ADMIN_TOKEN` | ✅ | 一个长随机串，如 `kJ8s...x2` | 管理面板访问令牌，**请用长随机串并保密** |
| `PROXYIP` | 否 | `8.8.8.8` 或 `proxyip.example.com:443` | 直连失败时的中转地址（也可在面板里改） |
| `SUB_NAME` | 否 | `Agora` | 节点名前缀（也可在面板里改） |
| `PREFERRED` | 否 | `104.16.0.0#CF1,time.is#CF2` | 默认优选地址（也可在面板里改） |

保存后到 **Deployments** → 对最新部署点 **Retry deployment**，让变量与 KV 绑定生效。

> `PROXYIP` 可填社区公开的 proxyIP（搜索 “cloudflare proxyip”）。不填也能用，只是少数 CF 回源受限的站点可能连不上。
> `ADMIN_TOKEN` 出现在管理面板 URL 里，知道它的人即可管理用户，务必使用长随机串。

---

## 4. 获取订阅链接

部署完成后你会得到一个地址，如 `https://agora-xxx.pages.dev`。

- **Clash 订阅**（默认）：`https://agora-xxx.pages.dev/<你的UUID>`
- **通用 base64 订阅**：`https://agora-xxx.pages.dev/<你的UUID>?target=v2ray`

在浏览器打开 Clash 订阅链接，应能看到一段 YAML，即表示成功。

> ⚠️ 中国大陆网络下 `*.pages.dev` 的 SNI 常被阻断，可能无法直接连通。
> 解决办法见 [DOMAIN.md](./DOMAIN.md)：绑定一个**免费自定义域名**即可稳定使用。

把订阅链接发给朋友导入即可（客户端用法见 [USAGE.md](./USAGE.md)）。

---

## 5. 管理面板：增删用户、改设置（默认功能）

打开 `https://<你的域名>/<ADMIN_TOKEN>` 即进入管理面板，无需登录（令牌即在 URL 里）。

面板能做：

- **用户管理**：点「+ 添加用户」自动生成一个新 UUID，每个用户有独立订阅链接，直接复制发给对应的朋友；可「停用/启用」或「删除」（删除后其订阅与连接立即失效）。
- **设置**：在线修改订阅名前缀、`proxyIP`、优选地址列表，保存后**立即对所有订阅生效**，无需重新部署。
- 站长（环境变量 `UUID`）始终有效，且不能在面板里删除，避免误操作把自己锁出。

> 也可用 API 脚本化管理（面板即调用这些接口）：
> `GET /<ADMIN_TOKEN>/api/users`、`POST .../api/users {name}`、
> `DELETE/PATCH .../api/users/<id>`、`GET/POST .../api/settings`。
>
> 提示：KV 是最终一致的，新增/删除用户后偶尔需几秒才全局生效。

---

## 6. 本地开发与验证（可选）

```bash
npm install
# 离线生成 + 校验订阅（不需要部署）
npm run gen -- your-app.pages.dev <你的UUID>
# 打包 worker，确认无语法/导入错误
npm run check
# 本地起开发服务器（含本地 KV，可试用管理面板）
npx wrangler pages dev . --kv AGORA_KV
# 然后访问 http://127.0.0.1:8788/<ADMIN_TOKEN>
```

本地调试时把 `UUID` / `ADMIN_TOKEN` 写进 `.dev.vars`（已在 `.gitignore` 中，不会提交）：

```
UUID=11111111-2222-3333-4444-555555555555
ADMIN_TOKEN=secret-admin-xyz
```

`npm run gen` 会在 `out/` 下生成 `clash.yaml` 与 `v2ray.txt`，并执行两项守卫检查：
模板一致性、YAML 可解析性。
