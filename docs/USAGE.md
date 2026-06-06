# 使用说明（导入 Clash）

把朋友发给你的**订阅链接**导入支持 Clash 的客户端即可。

> 本订阅基于 Clash Meta（mihomo）内核，请使用 **Meta 内核**的客户端，普通老版 Clash 可能不支持 VLESS。

---

## 推荐客户端

| 平台 | 客户端 | 下载 |
| --- | --- | --- |
| Windows / macOS / Linux | **Clash Verge Rev** | <https://github.com/clash-verge-rev/clash-verge-rev> |
| Android / Windows / macOS / Linux | **FlClash** | <https://github.com/chen08209/FlClash> |
| 全平台 / 命令行 | **mihomo** | <https://github.com/MetaCubeX/mihomo> |
| iOS | Shadowrocket / Stash（付费）；或用 `?target=v2ray` 订阅 | App Store |

---

## 导入步骤（以 Clash Verge Rev 为例）

1. 安装并打开客户端。
2. 左侧 **订阅（Profiles）** → 顶部输入框粘贴订阅链接 → 点 **导入（Import）**。
   - 订阅链接形如：`https://<域名>/<UUID>`
3. 导入成功后选中该订阅。
4. 左侧 **代理（Proxy）** → 在「🚀 节点选择」里选一个节点，或选「♻️ 自动选择」自动测速。
5. 左侧 **设置** → 打开 **系统代理（System Proxy）** 或 **Tun 模式**。
6. 打开浏览器访问 <https://www.cloudflare.com/cdn-cgi/trace>，
   若 `ip=` 显示的是节点 IP、能正常打开外网，即成功。

---

## 分流说明

订阅内置了基于 mihomo 内置 GEOSITE/GEOIP 的智能分流：

- 国内网站/服务 → 直连（不走代理，速度快）
- 国外网站、YouTube/Netflix 等 → 走代理
- 广告域名 → 拦截
- Telegram → 单独策略组

首次启动 mihomo 会自动下载 geoip/geosite 数据库，需要联网片刻。

---

## 常见问题

- **导入后没有节点？** 确认用的是 Meta 内核客户端；确认订阅链接里的 UUID 正确。
- **连不上 / 一直转圈？**
  - `*.pages.dev` 可能被墙 → 让管理员绑定自定义域名（见 DOMAIN.md）。
  - 换一个节点（订阅里有多个优选 IP 节点）。
- **游戏/语音不通？** CF 免费层不支持 UDP，这是协议限制，浏览/视频不受影响。
- **想更新节点？** 在客户端点订阅的「更新」按钮即可（订阅默认 24 小时自动更新）。
