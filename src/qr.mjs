// src/qr.mjs — 自包含 QR Code 编码器（字节模式 · EC 级别 M · 版本 1–10）。
// 零依赖，可在 Cloudflare Workers 与 Node 运行；输出模块矩阵或 SVG。
// 足以编码订阅 URL（EC-M 版本 10 字节容量约 213 字符）。

// ---------- GF(256) ----------
const EXP = new Uint8Array(512);
const LOG = new Uint8Array(256);
(function () {
  let x = 1;
  for (let i = 0; i < 255; i++) {
    EXP[i] = x;
    LOG[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
})();
function gmul(a, b) {
  if (a === 0 || b === 0) return 0;
  return EXP[LOG[a] + LOG[b]];
}
function rsGen(degree) {
  let poly = [1];
  for (let i = 0; i < degree; i++) {
    const np = new Array(poly.length + 1).fill(0);
    for (let j = 0; j < poly.length; j++) {
      np[j] ^= poly[j];
      np[j + 1] ^= gmul(poly[j], EXP[i]);
    }
    poly = np;
  }
  return poly;
}
function rsEncode(data, ecLen) {
  const gen = rsGen(ecLen); // gen[0] === 1
  const res = new Array(data.length + ecLen).fill(0);
  for (let i = 0; i < data.length; i++) res[i] = data[i];
  for (let i = 0; i < data.length; i++) {
    const coef = res[i];
    if (coef !== 0) for (let j = 0; j < gen.length; j++) res[i + j] ^= gmul(gen[j], coef);
  }
  return res.slice(data.length);
}

// ---------- 版本表（EC 级别 M） ----------
const EC_M = {
  1: { ec: 10, groups: [[1, 16]] },
  2: { ec: 16, groups: [[1, 28]] },
  3: { ec: 26, groups: [[1, 44]] },
  4: { ec: 18, groups: [[2, 32]] },
  5: { ec: 24, groups: [[2, 43]] },
  6: { ec: 16, groups: [[4, 27]] },
  7: { ec: 18, groups: [[4, 31]] },
  8: { ec: 22, groups: [[2, 38], [2, 39]] },
  9: { ec: 22, groups: [[3, 36], [2, 37]] },
  10: { ec: 26, groups: [[4, 43], [1, 44]] },
};
const ALIGN = {
  1: [], 2: [6, 18], 3: [6, 22], 4: [6, 26], 5: [6, 30],
  6: [6, 34], 7: [6, 22, 38], 8: [6, 24, 42], 9: [6, 26, 46], 10: [6, 28, 50],
};
const FORMAT_M = [0x5412, 0x5125, 0x5e7c, 0x5b4b, 0x45f9, 0x40ce, 0x4f97, 0x4aa0];

function dataCodewords(v) {
  return EC_M[v].groups.reduce((s, [n, d]) => s + n * d, 0);
}

// ---------- 比特编码 ----------
function buildBitstream(bytes, version) {
  const bits = [];
  const push = (val, len) => {
    for (let i = len - 1; i >= 0; i--) bits.push((val >> i) & 1);
  };
  push(0b0100, 4); // 字节模式
  push(bytes.length, version <= 9 ? 8 : 16);
  for (const b of bytes) push(b, 8);

  const cap = dataCodewords(version) * 8;
  push(0, Math.min(4, cap - bits.length)); // 终止符
  while (bits.length % 8 !== 0) bits.push(0);

  const cw = [];
  for (let i = 0; i < bits.length; i += 8) {
    let v = 0;
    for (let j = 0; j < 8; j++) v = (v << 1) | bits[i + j];
    cw.push(v);
  }
  const pad = [0xec, 0x11];
  for (let i = 0; cw.length < dataCodewords(version); i++) cw.push(pad[i % 2]);
  return cw;
}

function interleave(codewords, version) {
  const spec = EC_M[version];
  const blocks = [];
  let idx = 0;
  for (const [num, dpb] of spec.groups) {
    for (let b = 0; b < num; b++) {
      const data = codewords.slice(idx, idx + dpb);
      idx += dpb;
      blocks.push({ data, ec: rsEncode(data, spec.ec) });
    }
  }
  const out = [];
  const maxData = Math.max(...blocks.map((b) => b.data.length));
  for (let i = 0; i < maxData; i++) for (const b of blocks) if (i < b.data.length) out.push(b.data[i]);
  for (let i = 0; i < spec.ec; i++) for (const b of blocks) out.push(b.ec[i]);
  const fb = [];
  for (const c of out) for (let i = 7; i >= 0; i--) fb.push((c >> i) & 1);
  return fb;
}

// ---------- 矩阵 ----------
function chooseVersion(len) {
  for (let v = 1; v <= 10; v++) {
    const cci = v <= 9 ? 8 : 16;
    if (4 + cci + len * 8 <= dataCodewords(v) * 8) return v;
  }
  throw new Error("QR: 数据过长");
}

function newGrid(size) {
  const m = [];
  for (let i = 0; i < size; i++) m.push(new Uint8Array(size));
  return m;
}

function placeFunctionPatterns(modules, isFunc, version, size) {
  const set = (r, c, v) => {
    modules[r][c] = v;
    isFunc[r][c] = 1;
  };
  // finder + separators
  const finder = (r, c) => {
    for (let dr = -1; dr <= 7; dr++) {
      for (let dc = -1; dc <= 7; dc++) {
        const rr = r + dr, cc = c + dc;
        if (rr < 0 || cc < 0 || rr >= size || cc >= size) continue;
        const inRing =
          (dr >= 0 && dr <= 6 && (dc === 0 || dc === 6)) ||
          (dc >= 0 && dc <= 6 && (dr === 0 || dr === 6));
        const inCore = dr >= 2 && dr <= 4 && dc >= 2 && dc <= 4;
        set(rr, cc, inRing || inCore ? 1 : 0);
      }
    }
  };
  finder(0, 0);
  finder(0, size - 7);
  finder(size - 7, 0);

  // timing
  for (let i = 8; i < size - 8; i++) {
    const v = i % 2 === 0 ? 1 : 0;
    set(6, i, v);
    set(i, 6, v);
  }

  // alignment
  const pos = ALIGN[version];
  for (const r of pos)
    for (const c of pos) {
      if ((r === 6 && c === 6) || (r === 6 && c === size - 7) || (r === size - 7 && c === 6)) continue;
      for (let dr = -2; dr <= 2; dr++)
        for (let dc = -2; dc <= 2; dc++)
          set(r + dr, c + dc, Math.max(Math.abs(dr), Math.abs(dc)) !== 1 ? 1 : 0);
    }

  // dark module
  set(size - 8, 8, 1);

  // reserve format info areas
  for (let i = 0; i < 9; i++) {
    if (i !== 6) {
      isFunc[8][i] = 1;
      isFunc[i][8] = 1;
    }
  }
  for (let i = 0; i < 8; i++) {
    isFunc[8][size - 1 - i] = 1;
    isFunc[size - 1 - i][8] = 1;
  }

  // version info (v>=7)
  if (version >= 7) {
    let rem = version;
    for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >>> 11) * 0x1f25);
    const bits = (version << 12) | rem;
    for (let i = 0; i < 18; i++) {
      const bit = (bits >> i) & 1;
      const a = size - 11 + (i % 3);
      const b = Math.floor(i / 3);
      set(a, b, bit);
      set(b, a, bit);
    }
  }
}

function placeData(modules, isFunc, bits, size) {
  let i = 0;
  for (let right = size - 1; right >= 1; right -= 2) {
    if (right === 6) right = 5;
    for (let vert = 0; vert < size; vert++) {
      for (let j = 0; j < 2; j++) {
        const col = right - j;
        const upward = ((right + 1) & 2) === 0;
        const row = upward ? size - 1 - vert : vert;
        if (!isFunc[row][col]) {
          modules[row][col] = i < bits.length ? bits[i] : 0;
          i++;
        }
      }
    }
  }
}

function maskCond(m, x, y) {
  switch (m) {
    case 0: return (x + y) % 2 === 0;
    case 1: return y % 2 === 0;
    case 2: return x % 3 === 0;
    case 3: return (x + y) % 3 === 0;
    case 4: return (Math.floor(y / 2) + Math.floor(x / 3)) % 2 === 0;
    case 5: return ((x * y) % 2) + ((x * y) % 3) === 0;
    case 6: return (((x * y) % 2) + ((x * y) % 3)) % 2 === 0;
    case 7: return (((x + y) % 2) + ((x * y) % 3)) % 2 === 0;
  }
  return false;
}

function placeFormat(modules, fmt, size) {
  const bit = (i) => (fmt >> i) & 1;
  // 第一份：列 8 自上而下 + 行 8 自右向左
  for (let i = 0; i <= 5; i++) modules[i][8] = bit(i);
  modules[7][8] = bit(6);
  modules[8][8] = bit(7);
  modules[8][7] = bit(8);
  for (let i = 9; i < 15; i++) modules[8][14 - i] = bit(i);
  // 第二份：行 8 右侧 + 列 8 底部
  for (let i = 0; i < 8; i++) modules[8][size - 1 - i] = bit(i);
  for (let i = 8; i < 15; i++) modules[size - 15 + i][8] = bit(i);
  modules[size - 8][8] = 1;
}

function penalty(m, size) {
  let p = 0;
  // rule 1: runs
  for (let dir = 0; dir < 2; dir++) {
    for (let a = 0; a < size; a++) {
      let run = 1, prev = -1;
      for (let b = 0; b < size; b++) {
        const v = dir === 0 ? m[a][b] : m[b][a];
        if (v === prev) {
          run++;
          if (run === 5) p += 3;
          else if (run > 5) p += 1;
        } else {
          run = 1;
          prev = v;
        }
      }
    }
  }
  // rule 2: 2x2
  for (let r = 0; r < size - 1; r++)
    for (let c = 0; c < size - 1; c++) {
      const v = m[r][c];
      if (v === m[r][c + 1] && v === m[r + 1][c] && v === m[r + 1][c + 1]) p += 3;
    }
  // rule 3: finder-like
  const pat1 = [1, 0, 1, 1, 1, 0, 1, 0, 0, 0, 0];
  const pat2 = [0, 0, 0, 0, 1, 0, 1, 1, 1, 0, 1];
  const match = (get, n, i) => {
    for (let k = 0; k < 11; k++) if (get(i + k) !== n[k]) return false;
    return true;
  };
  for (let r = 0; r < size; r++)
    for (let c = 0; c <= size - 11; c++) {
      if (match((x) => m[r][x], pat1, c) || match((x) => m[r][x], pat2, c)) p += 40;
    }
  for (let c = 0; c < size; c++)
    for (let r = 0; r <= size - 11; r++) {
      if (match((x) => m[x][c], pat1, r) || match((x) => m[x][c], pat2, r)) p += 40;
    }
  // rule 4: dark proportion
  let dark = 0;
  for (let r = 0; r < size; r++) for (let c = 0; c < size; c++) dark += m[r][c];
  const pct = (dark * 100) / (size * size);
  p += Math.floor(Math.abs(pct - 50) / 5) * 10;
  return p;
}

// 编码为模块矩阵（已选最优掩码、写入格式/版本信息）
export function qrMatrix(text) {
  const bytes = new TextEncoder().encode(text);
  const version = chooseVersion(bytes.length);
  const size = 17 + 4 * version;
  const cw = buildBitstream(bytes, version);
  const bits = interleave(cw, version);

  const base = newGrid(size);
  const isFunc = newGrid(size);
  placeFunctionPatterns(base, isFunc, version, size);
  placeData(base, isFunc, bits, size);

  let best = null, bestPen = Infinity;
  for (let mask = 0; mask < 8; mask++) {
    const cm = base.map((r) => Uint8Array.from(r));
    for (let r = 0; r < size; r++)
      for (let c = 0; c < size; c++)
        if (!isFunc[r][c] && maskCond(mask, c, r)) cm[r][c] ^= 1;
    placeFormat(cm, FORMAT_M[mask], size);
    const pen = penalty(cm, size);
    if (pen < bestPen) {
      bestPen = pen;
      best = cm;
    }
  }
  return { size, modules: best };
}

// 输出 SVG（1×1 模块路径，crispEdges）
export function qrSVG(text, opt = {}) {
  const { margin = 4, dark = "#1B1813", light = "#FFFFFF" } = opt;
  const { size, modules } = qrMatrix(text);
  const dim = size + margin * 2;
  let d = "";
  for (let r = 0; r < size; r++)
    for (let c = 0; c < size; c++)
      if (modules[r][c]) d += `M${c + margin} ${r + margin}h1v1h-1z`;
  return (
    `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${dim} ${dim}" ` +
    `shape-rendering="crispEdges" preserveAspectRatio="xMidYMid meet">` +
    `<rect width="${dim}" height="${dim}" fill="${light}"/>` +
    `<path d="${d}" fill="${dark}"/></svg>`
  );
}
