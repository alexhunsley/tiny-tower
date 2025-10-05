// notation.js
// Tokenization + row generation with repeated leads until rounds is reached again,
// or a safety cutoff of 12 leads.

// 1..12 symbols: 10=0, 11=E, 12=T
const STAGE_SYMBOLS = "1234567890ET";

export function clampStage(n) {
  const v = Number(n);
  return Math.max(4, Math.min(12, Number.isFinite(v) ? v : 6));
}

export function roundsForStage(stage) {
  console.debug("ROUNDS FOR STAGE!");

  // tittums style order
  // return "1627384950"

  const s = clampStage(stage);
  return STAGE_SYMBOLS.substring(0, s);
}

// --- Tokenize: split on '.' and 'x'; '.' removed, 'x' kept as its own token
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

// Expose for other modules
export function symbolToIndex(sym) {
  const idx = STAGE_SYMBOLS.indexOf(sym);
  return idx >= 0 ? idx + 1 : null; // 1-based
}

// Apply one token to a row per the specified rules
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

  // token like "34": those places stay; all others swap in adjacent pairs
  const places = new Set();
  for (const ch of token) {
    const pos = symbolToIndex(ch);
    if (pos && pos >= 1 && pos <= stage) places.add(pos);
  }

  let i = 1; // 1-based scan
  while (i <= n) {
    const j = i + 1;

    if (places.has(i)) { out[i - 1] = src[i - 1]; i += 1; continue; }
    if (j > n)         { out[i - 1] = src[i - 1]; i += 1; continue; }
    if (places.has(j)) { out[i - 1] = src[i - 1]; i += 1; continue; }

    // swap i and j
    out[i - 1] = src[j - 1];
    out[j - 1] = src[i - 1];
    i += 2;
  }
  return out.join("");
}

/**
 * Generate rows by repeating the place-notation tokens (leads) until we return to rounds,
 * or we hit maxLeads (default 12).
 *
 * @param {Object} opts
 * @param {string} opts.pnString - place notation, e.g. "x14x14x14x14x12"
 * @param {number} opts.stage - 4..12
 * @param {number} [opts.maxLeads=12] - safety cutoff (# of full PN passes)
 * @returns {string[]} rows beginning with rounds; includes the final rounds if reached
 */
export function generateList({ pnString, stage, maxLeads = 12 }) {
  const s = clampStage(stage);
  const rounds = roundsForStage(s);
  const tokens = tokenizePlaceNotation(pnString);

  // If no tokens, just return rounds
  if (!tokens.length) return [rounds];

  const rows = [rounds];
  let current = rounds;
  let leads = 0;

  // Repeat applying the entire token list (one "lead") until we reach rounds again
  // or we exhaust the safety cutoff.
  while (leads < maxLeads) {
    for (const t of tokens) {
      current = applyTokenToRow(current, t, s);
      rows.push(current);
    }
    leads += 1;
    if (current === rounds) break; // reached back to rounds
  }

  return rows;
}