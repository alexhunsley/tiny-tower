// notation.js
// Place notation utilities with tokenization and row generation.

const STAGE_SYMBOLS = "1234567890ET"; // 1..12  (10=0, 11=E, 12=T)

export function clampStage(n) {
  const v = Number(n);
  return Math.max(4, Math.min(12, Number.isFinite(v) ? v : 6));
}
export function roundsForStage(stage) {
  const s = clampStage(stage);
  return STAGE_SYMBOLS.substring(0, s);
}

export function tokenizePlaceNotation(pnString) {
  const src = String(pnString || "").trim();
  if (!src) return [];
  const allowed = new Set([...STAGE_SYMBOLS, "e","t","E","T"]);
  const tokens = [];
  let buf = "";
  const flush = () => { if (buf) { tokens.push(buf); buf = ""; } };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];
    if (ch === ".") { flush(); continue; }
    if (ch === "x" || ch === "X") { flush(); tokens.push("x"); continue; }
    if (/\s/.test(ch)) continue;
    if (allowed.has(ch)) {
      buf += (ch === "e") ? "E" : (ch === "t" ? "T" : ch);
    }
  }
  flush();
  return tokens;
}

// Exported: needed by player to map symbols to 1-based place indexes
export function symbolToIndex(sym) {
  const idx = STAGE_SYMBOLS.indexOf(sym);
  return idx >= 0 ? idx + 1 : null;
}

function applyTokenToRow(row, token, stage) {
  const n = row.length;
  const src = row.split("");
  const out = src.slice();

  if (token === "x") {
    for (let i = 0; i + 1 < n; i += 2) {
      out[i] = src[i + 1];
      out[i + 1] = src[i];
    }
    return out.join("");
  }

  const places = new Set();
  for (const ch of token) {
    const pos = symbolToIndex(ch);
    if (pos && pos >= 1 && pos <= stage) places.add(pos);
  }

  let i = 1; // 1-based
  while (i <= n) {
    const j = i + 1;

    if (places.has(i)) {
      out[i - 1] = src[i - 1];
      i += 1;
      continue;
    }
    if (j > n) {
      out[i - 1] = src[i - 1];
      i += 1;
      continue;
    }
    if (places.has(j)) {
      out[i - 1] = src[i - 1];
      i += 1;
      continue;
    }

    out[i - 1] = src[j - 1];
    out[j - 1] = src[i - 1];
    i += 2;
  }
  return out.join("");
}

export function generateList({ pnString, stage }) {
  const s = clampStage(stage);
  const rounds = roundsForStage(s);
  const tokens = tokenizePlaceNotation(pnString);

  const rows = [rounds];
  for (const t of tokens) {
    const prev = rows[rows.length - 1];
    rows.push(applyTokenToRow(prev, t, s));
  }
  return rows;
}