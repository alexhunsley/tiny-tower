// notation.js
// Place notation utilities with tokenization and row generation.
// Rules implemented per user spec:
//  - Tokenization: split on '.' and 'x'; '.' is removed; 'x' is kept as a token.
//    Examples:
//      "x12x14"      -> ["x","12","x","14"]
//      "x12.16.34x"  -> ["x","12","16","34","x"]
//  - Row generation: start with rounds (prefix of "1234567890ET" up to 'stage'),
//    then for each token produce the next row:
//      1) token === "x"  -> swap every pair (odd stage: last stays).
//      2) token like "34" -> those places stay; all other adjacent pairs swap.

const STAGE_SYMBOLS = "1234567890ET"; // positions: 1..12 (10=0, 11=E, 12=T)

// Clamp stage to [4,12]
export function clampStage(n) {
  const v = Number(n);
  return Math.max(4, Math.min(12, Number.isFinite(v) ? v : 6));
}

// Rounds string for stage n (prefix of STAGE_SYMBOLS)
export function roundsForStage(stage) {
  const s = clampStage(stage);
  return STAGE_SYMBOLS.substring(0, s);
}

// ---- Tokenization ----
// Accepts letters/digits in STAGE_SYMBOLS (case-insensitive for E/T), 'x' or 'X' as cross,
// '.' as delimiter-only, whitespace ignored.
export function tokenizePlaceNotation(pnString) {
  const src = String(pnString || "").trim();
  if (!src) return [];
  const allowed = new Set([...STAGE_SYMBOLS, "e", "t", "E", "T"]);
  const tokens = [];
  let buf = "";

  const flushBuf = () => {
    if (buf.length) {
      tokens.push(buf);
      buf = "";
    }
  };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (ch === "." ) {         // delimiter only
      flushBuf();
      continue;
    }
    if (ch === "x" || ch === "X") { // delimiter + token 'x'
      flushBuf();
      tokens.push("x");
      continue;
    }
    if (/\s/.test(ch)) {       // ignore whitespace
      continue;
    }
    if (allowed.has(ch)) {
      // Normalize E/T to uppercase; everything else as-is
      const norm = (ch === "e") ? "E" : (ch === "t" ? "T" : ch);
      buf += norm;
      continue;
    }
    // Any other character is ignored (you could also choose to throw)
  }
  flushBuf();
  return tokens;
}

// ---- Apply a single token to a row ----
function symbolToIndex(sym) {
  // Returns 1-based place index from a symbol in STAGE_SYMBOLS (e.g., '0' => 10, 'E'=>11, 'T'=>12)
  const idx = STAGE_SYMBOLS.indexOf(sym);
  return idx >= 0 ? idx + 1 : null;
}

function applyTokenToRow(row, token, stage) {
  // row: string like "123456"; token: "x" or place string like "34"
  const n = row.length;
  if (n !== stage) throw new Error(`Row length (${n}) != stage (${stage})`);
  const src = row.split("");
  const out = src.slice();

  if (token === "x") {
    // Swap adjacent pairs across the row
    let i = 0;
    while (i + 1 < n) {
      out[i] = src[i + 1];
      out[i + 1] = src[i];
      i += 2;
    }
    // If odd, last stays as-is (already copied)
    return out.join("");
  }

  // Places token: characters are place symbols that should STAY (not swap).
  const places = new Set();
  for (const ch of token) {
    const pos = symbolToIndex(ch);
    if (pos && pos >= 1 && pos <= stage) places.add(pos); // 1-based
  }

  // Walk left-to-right, swapping adjacent non-place pairs.
  let i = 1; // 1-based
  while (i <= n) {
    const j = i + 1;

    if (places.has(i)) {
      // Place at i => stays
      out[i - 1] = src[i - 1];
      i += 1;
      continue;
    }

    if (j > n) {
      // Odd last position (no pair) => stays
      out[i - 1] = src[i - 1];
      i += 1;
      continue;
    }

    if (places.has(j)) {
      // Next is a place -> current also stays; no swap
      out[i - 1] = src[i - 1];
      // Do NOT consume j here; j will be handled in its own iteration
      i += 1;
      continue;
    }

    // Neither i nor j are places -> swap the pair
    out[i - 1] = src[j - 1];
    out[j - 1] = src[i - 1];
    i += 2;
  }

  return out.join("");
}

// ---- Public: generate the full list (rounds + per-token rows) ----
export function generateList({ pnString, stage }) {
  const s = clampStage(stage);
  const rounds = roundsForStage(s);
  const tokens = tokenizePlaceNotation(pnString);

  const rows = [rounds];
  for (const t of tokens) {
    const prev = rows[rows.length - 1];
    const next = applyTokenToRow(prev, t, s);
    rows.push(next);
  }
  return rows;
}