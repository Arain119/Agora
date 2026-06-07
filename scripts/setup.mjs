// scripts/setup.mjs
// 一键初始化：自动创建并绑定 KV，然后部署到 Cloudflare Pages。
// 把原本在控制台点的 ~6 步合并为一条命令。
//
// 用法：
//   npx wrangler login           # 仅首次，授权一次
//   node scripts/setup.mjs                 # 实际执行
//   node scripts/setup.mjs --dry-run       # 演练，不调用 wrangler、不改动账号
//   node scripts/setup.mjs --project myname # 自定义 Pages 项目名（默认 agora）
//
// 完成后，打开输出的网址 → 设置一次管理口令（TOFU）即可，无需手动配任何环境变量。

import { readFileSync, writeFileSync } from "node:fs";
import { execFileSync } from "node:child_process";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = join(__dirname, "..");
const TOML = join(root, "wrangler.toml");

const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const projIdx = args.indexOf("--project");
const project = projIdx >= 0 ? args[projIdx + 1] : "agora";

function wrangler(argv) {
  // 通过 npx 调用本地/最新 wrangler
  return execFileSync("npx", ["--yes", "wrangler@latest", ...argv], {
    cwd: root,
    encoding: "utf-8",
    stdio: ["inherit", "pipe", "inherit"],
  });
}

// 把 KV id 写入 wrangler.toml（确保存在一个未注释的 kv_namespaces 块）
export function updateTomlKvId(toml, id) {
  const block = `[[kv_namespaces]]\nbinding = "AGORA_KV"\nid = "${id}"`;
  // 已有未注释块 → 替换其 id
  if (/^\[\[kv_namespaces\]\]/m.test(toml)) {
    return toml.replace(/^id\s*=\s*".*"/m, `id = "${id}"`);
  }
  // 否则在文末追加一个新块
  return toml.replace(/\s*$/, "") + "\n\n" + block + "\n";
}

function extractKvId(output) {
  const m = output.match(/id\s*=\s*"([0-9a-fA-F]{16,})"/);
  return m ? m[1] : null;
}

async function main() {
  console.log(`▶ Agora 一键初始化（project=${project}${dryRun ? ", dry-run" : ""}）`);

  if (dryRun) {
    console.log("· [dry-run] 跳过 wrangler 调用");
    const fakeId = "0123456789abcdef0123456789abcdef";
    const updated = updateTomlKvId(readFileSync(TOML, "utf-8"), fakeId);
    if (!updated.includes(fakeId)) throw new Error("toml 更新失败");
    console.log("· [dry-run] wrangler.toml 将写入 KV id =", fakeId);
    console.log("· [dry-run] 将执行：wrangler pages deploy . --project-name", project);
    console.log("✓ dry-run 通过");
    return;
  }

  // 1) 确认已登录
  try {
    wrangler(["whoami"]);
  } catch {
    console.error("✗ 未登录 Cloudflare，请先运行：npx wrangler login");
    process.exit(1);
  }

  // 2) 创建 KV namespace
  console.log("· 创建 KV namespace AGORA_KV ...");
  let kvOut = "";
  try {
    kvOut = wrangler(["kv", "namespace", "create", "AGORA_KV"]);
  } catch (e) {
    kvOut = (e.stdout || "").toString();
  }
  const id = extractKvId(kvOut);
  if (!id) {
    console.error("✗ 未能解析 KV id，请手动在控制台创建并绑定 AGORA_KV。原始输出：\n", kvOut);
    process.exit(1);
  }
  console.log("· KV id =", id);

  // 3) 写入 wrangler.toml
  writeFileSync(TOML, updateTomlKvId(readFileSync(TOML, "utf-8"), id));
  console.log("· 已写入 wrangler.toml");

  // 4) 部署 Pages（不存在则自动创建项目）
  console.log("· 部署到 Cloudflare Pages ...");
  const out = wrangler(["pages", "deploy", ".", "--project-name", project]);
  process.stdout.write(out);

  const urlMatch = out.match(/https:\/\/[a-z0-9.-]+\.pages\.dev/i);
  const url = urlMatch ? urlMatch[0] : `https://${project}.pages.dev`;

  // 5) 自动初始化（免去手动点按钮）：轮询 POST /__setup__
  console.log("· 正在自动初始化…");
  let cred = null,
    already = false;
  for (let i = 0; i < 8; i++) {
    try {
      const r = await fetch(url + "/__setup__", { method: "POST" });
      const d = await r.json().catch(() => ({}));
      if (r.ok) {
        cred = d;
        break;
      }
      if (r.status === 409) {
        already = true;
        break;
      }
    } catch {
      // 部署可能尚未生效，稍后重试
    }
    await new Promise((s) => setTimeout(s, 3000));
  }

  console.log("\n✅ 部署完成！");
  if (cred) {
    console.log("请立即收藏以下两条凭证（含口令 · 仅显示一次 · 切勿外泄）：\n");
    console.log("  管理面板：" + url + cred.adminUrl);
    console.log("  站长订阅：" + url + "/" + cred.ownerUuid);
  } else if (already) {
    console.log("该部署此前已初始化（管理口令在首次部署时已显示，请使用当时保存的链接）。");
  } else {
    console.log("自动初始化未完成（部署或网络延迟）。请打开 " + url + "/ 点一下「初始化」按钮。");
  }
}

main().catch((e) => {
  console.error("✗ 失败：", e.message);
  process.exit(1);
});
