// src/sub.mjs
// 纯函数订阅生成器（不依赖任何 Cloudflare 运行时 API）。
// 同时被 _worker.js（运行时）与 scripts/gen-sub.mjs（离线验证）使用。
//
// 注意：CLASH_TEMPLATE 必须与 clash/template.yaml 保持逐字节一致，
// scripts/gen-sub.mjs 中有一个守卫测试会校验两者相同，防止配置漂移。

export const DEFAULT_PORT = 443;

// Cloudflare 优选 IP / 域名：客户端会对这些地址测速择优。
// 这些都是公开的、指向 Cloudflare 边缘的地址，可按需增删。
export const DEFAULT_PREFERRED_ADDRS = [
  { addr: "104.16.0.0", note: "CF-104.16" },
  { addr: "104.17.0.0", note: "CF-104.17" },
  { addr: "104.18.0.0", note: "CF-104.18" },
  { addr: "172.64.0.0", note: "CF-172.64" },
  { addr: "icook.hk", note: "CF-优选域名HK" },
  { addr: "time.is", note: "CF-优选域名" },
];

// Clash Meta (mihomo) 配置模板。
// 使用 mihomo 内置 GEOSITE/GEOIP 数据做分流，避免依赖外部 rule-provider 拉取，最稳。
// 占位符：#{PROXIES} 注入节点列表；#{PROXY_NAMES} 注入策略组里的节点名。
export const CLASH_TEMPLATE = `# Agora 自动生成的 Clash Meta 订阅，请勿手动编辑节点部分
mixed-port: 7890
allow-lan: false
mode: rule
log-level: info
ipv6: false
find-process-mode: strict
unified-delay: true
tcp-concurrent: true
global-client-fingerprint: chrome
geodata-mode: true
geox-url:
  geoip: "https://mirror.ghproxy.com/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geoip.dat"
  geosite: "https://mirror.ghproxy.com/https://github.com/MetaCubeX/meta-rules-dat/releases/download/latest/geosite.dat"

profile:
  store-selected: true
  store-fake-ip: true

dns:
  enable: true
  ipv6: false
  enhanced-mode: fake-ip
  fake-ip-range: 198.18.0.1/16
  fake-ip-filter:
    - "*.lan"
    - "*.local"
    - "localhost.ptlogin2.qq.com"
  default-nameserver:
    - 223.5.5.5
    - 119.29.29.29
  nameserver:
    - https://223.5.5.5/dns-query
    - https://1.1.1.1/dns-query
  proxy-server-nameserver:
    - https://223.5.5.5/dns-query
  nameserver-policy:
    "geosite:cn,private":
      - https://223.5.5.5/dns-query
      - https://119.29.29.29/dns-query

proxies:
#{PROXIES}

proxy-groups:
  - name: 🚀 节点选择
    type: select
    proxies:
      - ♻️ 自动选择
      - DIRECT
#{PROXY_NAMES}
  - name: ♻️ 自动选择
    type: url-test
    url: https://www.gstatic.com/generate_204
    interval: 300
    tolerance: 50
    proxies:
#{PROXY_NAMES}
  - name: 🌍 国外媒体
    type: select
    proxies:
      - 🚀 节点选择
      - ♻️ 自动选择
      - DIRECT
#{PROXY_NAMES}
  - name: 📲 电报信息
    type: select
    proxies:
      - 🚀 节点选择
      - DIRECT
#{PROXY_NAMES}
  - name: 🛑 广告拦截
    type: select
    proxies:
      - REJECT
      - DIRECT
  - name: 🎯 全球直连
    type: select
    proxies:
      - DIRECT
      - 🚀 节点选择
  - name: 🐟 漏网之鱼
    type: select
    proxies:
      - 🚀 节点选择
      - DIRECT

rules:
  - GEOSITE,category-ads-all,🛑 广告拦截
  - GEOSITE,youtube,🌍 国外媒体
  - GEOSITE,netflix,🌍 国外媒体
  - GEOSITE,disney,🌍 国外媒体
  - GEOSITE,telegram,📲 电报信息
  - GEOSITE,google,🚀 节点选择
  - GEOSITE,github,🚀 节点选择
  - GEOSITE,geolocation-!cn,🚀 节点选择
  - GEOSITE,cn,🎯 全球直连
  - GEOIP,telegram,📲 电报信息,no-resolve
  - GEOIP,CN,🎯 全球直连,no-resolve
  - MATCH,🐟 漏网之鱼
`;

// 生成单条 vless 分享链接
export function buildVlessLink({ uuid, address, port, host, path, name }) {
  const params = new URLSearchParams({
    encryption: "none",
    security: "tls",
    sni: host,
    fp: "chrome",
    type: "ws",
    host,
    path,
  });
  return `vless://${uuid}@${address}:${port}?${params.toString()}#${encodeURIComponent(name)}`;
}

// 生成 base64 通用订阅（v2rayN / Shadowrocket 等）
export function buildBase64Sub(opts) {
  const links = buildNodes(opts).map((n) => buildVlessLink(n)).join("\n");
  return base64Encode(links);
}

// 把节点参数展开为节点列表（每个优选地址一个节点）
export function buildNodes({ uuid, host, path, subName, preferred, port }) {
  const p = port || DEFAULT_PORT;
  const addrs = preferred && preferred.length ? preferred : DEFAULT_PREFERRED_ADDRS;
  return addrs.map((a, i) => ({
    uuid,
    address: a.addr,
    port: p,
    host,
    path,
    name: `${subName || "Agora"}-${a.note || i + 1}`,
  }));
}

// 生成 Clash Meta YAML
export function buildClashYaml(opts) {
  const nodes = buildNodes(opts);
  const proxiesYaml = nodes
    .map(
      (n) =>
        `  - name: "${n.name}"\n` +
        `    type: vless\n` +
        `    server: ${n.address}\n` +
        `    port: ${n.port}\n` +
        `    uuid: ${n.uuid}\n` +
        `    network: ws\n` +
        `    tls: true\n` +
        `    udp: false\n` +
        `    servername: ${n.host}\n` +
        `    client-fingerprint: chrome\n` +
        `    skip-cert-verify: false\n` +
        `    ws-opts:\n` +
        `      path: "${n.path}"\n` +
        `      headers:\n` +
        `        Host: ${n.host}`
    )
    .join("\n");

  const namesYaml = nodes.map((n) => `      - "${n.name}"`).join("\n");

  return CLASH_TEMPLATE.replaceAll("#{PROXIES}", proxiesYaml).replaceAll(
    "#{PROXY_NAMES}",
    namesYaml
  );
}

// 生成 sing-box JSON 配置（最小可用、跨版本兼容，不含已弃用字段）
export function buildSingboxJson(opts) {
  const nodes = buildNodes(opts);
  const tags = nodes.map((n) => n.name);
  const proxyOutbounds = nodes.map((n) => ({
    type: "vless",
    tag: n.name,
    server: n.address,
    server_port: n.port,
    uuid: n.uuid,
    tls: {
      enabled: true,
      server_name: n.host,
      utls: { enabled: true, fingerprint: "chrome" },
    },
    transport: { type: "ws", path: n.path, headers: { Host: n.host } },
  }));

  const config = {
    log: { level: "info", timestamp: true },
    dns: {
      servers: [
        { tag: "remote", address: "https://1.1.1.1/dns-query", detour: "🚀 选择节点" },
        { tag: "local", address: "223.5.5.5", detour: "direct" },
      ],
      final: "remote",
      strategy: "ipv4_only",
    },
    inbounds: [
      { type: "mixed", tag: "mixed-in", listen: "127.0.0.1", listen_port: 2080 },
    ],
    outbounds: [
      { type: "selector", tag: "🚀 选择节点", outbounds: ["♻️ 自动选择", ...tags], default: "♻️ 自动选择" },
      {
        type: "urltest",
        tag: "♻️ 自动选择",
        outbounds: tags,
        url: "https://www.gstatic.com/generate_204",
        interval: "5m",
        tolerance: 50,
      },
      ...proxyOutbounds,
      { type: "direct", tag: "direct" },
    ],
    route: {
      rules: [{ ip_is_private: true, outbound: "direct" }],
      final: "🚀 选择节点",
      auto_detect_interface: true,
    },
  };
  return JSON.stringify(config, null, 2);
}

// 根据客户端 User-Agent 自动选择订阅格式
// 返回 "clash" | "singbox" | "base64"
export function pickFormatByUA(ua) {
  const s = (ua || "").toLowerCase();
  if (!s) return "clash";
  if (/sing-?box|singbox/.test(s)) return "singbox";
  if (/clash|mihomo|meta|stash|flclash/.test(s)) return "clash";
  if (/v2ray|shadowrocket|quantumult|surfboard|nekobox|sing/.test(s)) return "base64";
  // 浏览器或未知客户端：给最通用的 Clash
  return "clash";
}

// 跨运行时的 base64 编码（Node 与 Workers 都可用）
function base64Encode(str) {
  if (typeof btoa === "function") {
    // Workers / 浏览器：先转 UTF-8 再编码
    return btoa(unescape(encodeURIComponent(str)));
  }
  // Node
  return Buffer.from(str, "utf-8").toString("base64");
}
