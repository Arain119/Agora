// scripts/gen-sub.mjs
// 离线生成并校验订阅，无需部署到 Cloudflare。
//
// 用法：
//   node scripts/gen-sub.mjs [host] [uuid]
// 产物：
//   out/clash.yaml  ——  Clash Meta 订阅
//   out/v2ray.txt   ——  base64 通用订阅
//
// 同时执行两个守卫检查：
//   1) clash/template.yaml 与 src/sub.mjs 内联模板逐字节一致（防漂移）
//   2) 生成的 YAML 能被解析（语法合法）

import { readFileSync, writeFileSync, mkdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";
import { buildClashYaml, buildBase64Sub, CLASH_TEMPLATE } from "../src/sub.mjs";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");

const host = process.argv[2] || "your-app.pages.dev";
const uuid = process.argv[3] || "00000000-0000-0000-0000-000000000000";

const opts = { uuid, host, path: "/?ed=2560", subName: "Agora", port: 443 };

// 守卫 1：模板一致性
const fileTemplate = readFileSync(join(root, "clash/template.yaml"), "utf-8");
if (fileTemplate !== CLASH_TEMPLATE) {
  console.error(
    "✗ 守卫失败：clash/template.yaml 与 src/sub.mjs 的 CLASH_TEMPLATE 不一致，请同步两者。"
  );
  process.exit(1);
}
console.log("✓ 模板一致性检查通过");

// 生成
const clashYaml = buildClashYaml(opts);
const v2ray = buildBase64Sub(opts);

// 守卫 2：YAML 可解析（用极简解析器做基本结构校验；如装了 js-yaml 则做完整校验）
basicYamlSanity(clashYaml);
try {
  const yaml = await import("js-yaml");
  const doc = yaml.load(clashYaml);
  if (!doc.proxies || doc.proxies.length === 0) throw new Error("proxies 为空");
  console.log(`✓ js-yaml 完整解析通过，共 ${doc.proxies.length} 个节点`);
} catch (e) {
  if (e.code === "ERR_MODULE_NOT_FOUND") {
    console.log("ℹ 未安装 js-yaml，已跳过完整解析（可 `npm i -D js-yaml` 启用）");
  } else {
    console.error("✗ YAML 解析失败：", e.message);
    process.exit(1);
  }
}

// 写出
mkdirSync(join(root, "out"), { recursive: true });
writeFileSync(join(root, "out/clash.yaml"), clashYaml);
writeFileSync(join(root, "out/v2ray.txt"), v2ray);
console.log("✓ 已写出 out/clash.yaml 与 out/v2ray.txt");

function basicYamlSanity(text) {
  const required = ["proxies:", "proxy-groups:", "rules:", "type: vless"];
  for (const k of required) {
    if (!text.includes(k)) {
      console.error(`✗ 基础校验失败：缺少 "${k}"`);
      process.exit(1);
    }
  }
  if (text.includes("#{")) {
    console.error("✗ 基础校验失败：仍有未替换的占位符 #{...}");
    process.exit(1);
  }
  console.log("✓ 基础结构检查通过");
}
