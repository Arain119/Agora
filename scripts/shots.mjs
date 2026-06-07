// scripts/shots.mjs — 用真实生产 UI（src/panel.mjs + src/qr.mjs）配真实风格数据，
// 渲染并截图到 assets/。需要 playwright（运行：npm i --no-save playwright 后 node scripts/shots.mjs）。
import { writeFileSync, mkdirSync } from "node:fs";
import { chromium } from "playwright";
import { PANEL_CSS, PANEL_JS, adminPanelHTML, friendPageHTML } from "../src/panel.mjs";
import { qrSVG } from "../src/qr.mjs";

const HOST = "agora.pages.dev";
const FRIEND_ID = "b6c3603d-2298-4d2e-b83d-a3df5630a427";

// 真实风格数据：CF 标签（非假城市名）、实测延迟、历史环形缓冲
const DEMO = {
  users: [
    { id: "05785a28-11bc-4d42-b830-1e13b8b5f1d9", name: "站长", owner: true, enabled: true },
    { id: FRIEND_ID, name: "林小满", enabled: true },
    { id: "aa11bb22-cc33-dd44-ee55-ff6600112233", name: "周深", enabled: true },
    { id: "99887766-5544-3322-1100-aabbccddeeff", name: "阿岚", enabled: false },
  ],
  settings: { subName: "Agora", proxyIP: "", sourceUrl: "", autoRefresh: true },
  auto: {
    updated: Date.now() - 14 * 60000,
    count: 7, alive: 7, checked: 12, sources: 2,
    nodes: [
      { addr: "104.16.0.0", note: "CF-104.16", ms: 38 },
      { addr: "104.17.58.160", note: "CF-104.17", ms: 45 },
      { addr: "172.64.0.0", note: "CF-172.64", ms: 61 },
      { addr: "104.18.0.0", note: "CF-104.18", ms: 73 },
      { addr: "time.is", note: "CF-优选域名", ms: 96 },
      { addr: "104.19.147.253", note: "CF-104.19", ms: 118 },
      { addr: "icook.hk", note: "CF-优选域名HK", ms: 134 },
    ],
    history: [6, 7, 5, 7, 8, 6, 7, 7].map((a, i) => ({ t: i, alive: a })),
  },
};

const QR_SVG = qrSVG("https://" + HOST + "/" + FRIEND_ID);

const STUB =
  "<script>" +
  "var DEMO=" + JSON.stringify(DEMO) + ";var QR=" + JSON.stringify(QR_SVG) + ";" +
  "function J(o){return new Response(JSON.stringify(o),{headers:{'content-type':'application/json'}})}" +
  "window.fetch=async function(u,opt){u=String(u);" +
  "if(u.indexOf('/api/users')>=0)return J({users:DEMO.users});" +
  "if(u.indexOf('/api/settings')>=0)return (opt&&opt.method==='POST')?J({ok:true,settings:DEMO.settings}):J({settings:DEMO.settings,auto:DEMO.auto});" +
  "if(u.indexOf('/api/refresh')>=0)return J({ok:true,count:7});return J({})};" +
  "new MutationObserver(function(){var q=document.querySelector('#sh-qr img');if(q&&q.parentNode){q.parentNode.innerHTML=QR}}).observe(document.documentElement,{subtree:true,childList:true});" +
  "</script>";

function consoleHTML() {
  let h = adminPanelHTML("/demo", HOST);
  // 用函数式替换，避免替换串里的 $$ 被 String.replace 当作特殊模式（生产 worker 直接发送，不受影响）
  h = h.replace('<link rel="stylesheet" href="/demo/app.css">', () => "<style>" + PANEL_CSS + "</style>");
  h = h.replace('<script src="/demo/app.js"></script>', () => STUB + "<script>" + PANEL_JS + "</script>");
  return h;
}

mkdirSync("/tmp/shots", { recursive: true });
writeFileSync("/tmp/shots/console.html", consoleHTML());
writeFileSync("/tmp/shots/friend.html", friendPageHTML(FRIEND_ID, HOST, "Agora", "林小满"));

mkdirSync("assets", { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 920 }, deviceScaleFactor: 2 });
await page.emulateMedia({ reducedMotion: "reduce" });

async function settle(ms = 1200) {
  await page.waitForLoadState("networkidle").catch(() => {});
  await page.waitForTimeout(ms);
}

await page.goto("file:///tmp/shots/console.html");
await settle();
await page.screenshot({ path: "assets/console.jpg", quality: 82, fullPage: true });
console.log("✓ assets/console.jpg");

await page.locator(".mrow").nth(1).click(); // 打开「林小满」成员抽屉
await page.waitForTimeout(800);
// 修正展示链接的协议（file:// 是本地预览产物，生产为 https://）
await page.evaluate((id) => {
  const e = document.querySelector("#sh-link");
  if (e) e.textContent = "https://agora.pages.dev/" + id;
}, FRIEND_ID);
await page.screenshot({ path: "assets/member.jpg", quality: 82 });
console.log("✓ assets/member.jpg");

await page.goto("file:///tmp/shots/friend.html");
await settle();
await page.screenshot({ path: "assets/friend.jpg", quality: 82, fullPage: true });
console.log("✓ assets/friend.jpg");

await browser.close();
console.log("done");
