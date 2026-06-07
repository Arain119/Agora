// scripts/test-qr.mjs — 用 jsQR 解码自家编码器的输出，证明二维码真的可扫。
import jsQR from "jsqr";
import { qrMatrix } from "../src/qr.mjs";

function rasterize(text, scale = 6, margin = 4) {
  const { size, modules } = qrMatrix(text);
  const dim = (size + margin * 2) * scale;
  const data = new Uint8ClampedArray(dim * dim * 4).fill(255); // 全白
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++) {
      if (!modules[r][c]) continue;
      for (let yy = 0; yy < scale; yy++)
        for (let xx = 0; xx < scale; xx++) {
          const px = ((r + margin) * scale + yy) * dim + ((c + margin) * scale + xx);
          data[px * 4] = data[px * 4 + 1] = data[px * 4 + 2] = 0; // 黑
        }
    }
  return { data, dim };
}

const cases = [
  "https://agora.pages.dev/05785a28-11bc-4d42-b830-1e13b8b5f1d9",
  "https://my-custom-domain.example.com/b6c3603d-2298-4d2e-b83d-a3df5630a427",
  "clash://install-config?url=https%3A%2F%2Fagora.pages.dev%2F05785a28-11bc-4d42-b830-1e13b8b5f1d9&name=Agora-%E5%BC%A0%E4%B8%89",
  "https://x.pages.dev/00000000-0000-0000-0000-000000000000?target=singbox",
  "short",
];

let ok = 0;
for (const text of cases) {
  const { data, dim } = rasterize(text);
  const res = jsQR(data, dim, dim);
  const pass = res && res.data === text;
  console.log((pass ? "✓" : "✗") + " (" + text.length + "b) " + text.slice(0, 48) + (text.length > 48 ? "…" : ""));
  if (!pass) {
    console.error("  decoded:", res ? JSON.stringify(res.data) : "null");
    process.exitCode = 1;
  } else ok++;
}
console.log(ok + "/" + cases.length + " 二维码可被 jsQR 正确解码");
if (ok !== cases.length) process.exitCode = 1;
