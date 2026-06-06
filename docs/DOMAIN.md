# 零成本自定义域名（解决 *.pages.dev 被墙）

中国大陆网络下，`*.pages.dev` 与 `*.workers.dev` 的 SNI 常被阻断，导致无法连通。
绑定一个**自定义域名**即可绕过，且可以**完全免费**。

---

## 方案 A：免费子域名（推荐，零成本）

常见的免费域名/子域名提供商（任选其一）：

| 提供商 | 域名样式 | 地址 |
| --- | --- | --- |
| DigitalPlat FreeDomain | `xxx.dpdns.org` | <https://domain.digitalplat.org/> |
| US.KG | `xxx.us.kg` | <https://us.kg/> |
| EU.org | `xxx.eu.org` | <https://nic.eu.org/> （审核较慢） |
| GitHub Student Pack | 多种 | 学生可领取 |

步骤：

1. 在上述任一平台申请一个免费域名/子域名。
2. 把域名接入 **Cloudflare**（免费 Plan）：
   - Cloudflare 控制台 → **Add a site** → 输入你的域名 → 选 **Free** 套餐。
   - 按提示把域名的 **Nameserver（NS）** 改成 Cloudflare 提供的两个 NS（在域名提供商后台修改）。
   - 等待 NS 生效（几分钟到数小时）。
3. 把域名绑定到 Pages 项目：
   - Pages 项目 → **Custom domains** → **Set up a custom domain** → 输入你的域名（或子域名）。
   - Cloudflare 会自动添加 CNAME 记录并签发证书。
4. 之后用自定义域名访问订阅：`https://<你的域名>/<UUID>`。

---

## 方案 B：优选 IP + 自定义域名（最佳体验）

绑定自定义域名后，再配合**优选 IP** 进一步提速、抗阻断：

- 本项目订阅默认已内置一组优选地址（见 `src/sub.mjs` 的 `DEFAULT_PREFERRED_ADDRS`）。
- 你也可以用 `PREFERRED` 环境变量自定义，例如填入你实测延迟低的 Cloudflare IP：
  ```
  PREFERRED = "104.16.123.96#优选1,104.17.55.12#优选2"
  ```
- 优选 IP 可用社区工具实测获取（搜索 “CloudflareSpeedTest”）。
- 原理：Clash 节点的 `server` 用优选 IP，`servername` / `Host` 仍用你的域名，
  TLS 握手与 WebSocket 路由都正确，只是入口 IP 换成了更快的那个。

---

## 常见问题

- **一定要自定义域名吗？** 如果你所在网络不封锁 `*.pages.dev`，可以直接用默认域名，省略本页。
- **域名会过期吗？** 免费子域名通常需定期续期（如每年/每几个月），按提供商提示续即可。
- **能用 Cloudflare 自带的 workers.dev 吗？** 可以拿到链接，但大陆易被阻断，不推荐作为主入口。
