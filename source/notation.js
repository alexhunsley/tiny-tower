// notation.js
// - Tokenization: '.' splits, 'x' is a token+split, whitespace ignored, E/T normalized.
// - NEW: commas split the PN into segments; each segment is tokenized then mirrored
//        (palindrome without duplicating the last token). If no commas present, no mirroring.
// - Row generation: start at rounds; apply each token; repeat whole "lead token list"
//   until back to rounds or safety cutoff (maxLeads).

const STAGE_SYMBOLS = "1234567890ET"; // positions: 1..12 (10=0, 11=E, 12=T)

export function clampStage(n) {
  const v = Number(n);
  return Math.max(4, Math.min(12, Number.isFinite(v) ? v : 6));
}

export function roundsForStage(stage) {
  const s = clampStage(stage);
  return STAGE_SYMBOLS.substring(0, s);
}

// ---- Base tokenizer for a single segment (no commas) ----
// Splits on '.' and treats 'x'/'X' as its own token AND delimiter. Keeps 'x' tokens.
function tokenizeSegment(pnSegment) {
  const src = String(pnSegment || "").trim();
  if (!src) return [];
  const allowed = new Set([...STAGE_SYMBOLS, "e", "t", "E", "T"]);
  const tokens = [];
  let buf = "";

  const flush = () => { if (buf) { tokens.push(buf); buf = ""; } };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (ch === ".") { flush(); continue; }
    if (ch === "x" || ch === "X") { flush(); tokens.push("x"); continue; }
    if (/\s/.test(ch)) continue;

    if (allowed.has(ch)) {
      const norm = ch === "e" ? "E" : ch === "t" ? "T" : ch;
      buf += norm;
      continue;
    }
    // Ignore any other characters silently
  }
  flush();
  return tokens;
}

// ---- Expand PN with comma semantics ----
// If there are commas: split, tokenize each, then mirror each segment
// by appending reverse(tokensWithoutLast). Concatenate all segments.
// If no commas: just tokenize the whole string (no mirroring).
function expandPlaceNotation(pnString) {
  const raw = String(pnString || "").trim();
  if (!raw) return [];

  if (!raw.includes(",")) {
    return tokenizeSegment(raw);
  }

  const segments = raw.split(",").map(s => s.trim()).filter(Boolean);
  const out = [];

  for (const seg of segments) {
    const toks = tokenizeSegment(seg);
    if (!toks.length) continue;
    // Mirror without duplicating the last token (palindrome)
    const mirror = toks.slice(0, -1).reverse();
    out.push(...toks, ...mirror);
  }
  return out;
}

// ---- Utilities used by row application ----
export function symbolToIndex(sym) {
  const idx = STAGE_SYMBOLS.indexOf(sym);
  return idx >= 0 ? idx + 1 : null; // 1-based
}

// Apply a single token to a row per your rules:
// 1) token === "x": swap adjacent pairs, last stays if odd.
// 2) token like "34": those places stay; all other adjacent pairs swap.
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

  let i = 1; // 1-based walk
  while (i <= n) {
    const j = i + 1;

    if (places.has(i)) { out[i - 1] = src[i - 1]; i += 1; continue; }
    if (j > n)         { out[i - 1] = src[i - 1]; i += 1; continue; }
    if (places.has(j)) { out[i - 1] = src[i - 1]; i += 1; continue; }

    out[i - 1] = src[j - 1];
    out[j - 1] = src[i - 1];
    i += 2;
  }
  return out.join("");
}

/**
 * Generate rows by repeating the lead token list until we return to rounds,
 * or we hit maxLeads (default 12).
 *
 * @param {Object} opts
 * @param {string} opts.pnString - place notation (commas optional)
 * @param {number} opts.stage - 4..12
 * @param {number} [opts.maxLeads=12] - safety cutoff (# of full PN passes)
 * @returns {string[]} rows beginning with rounds; includes the final rounds if reached
 */
export function generateList({ pnString, stage, maxLeads = 12 }) {
  const s = clampStage(stage);
  const rounds = roundsForStage(s);

  const leadTokens = expandPlaceNotation(pnString); // NEW comma-aware expansion
  if (!leadTokens.length) return [rounds];

  const rows = [rounds];
  let current = rounds;
  let leads = 0;

  while (leads < maxLeads) {
    for (const t of leadTokens) {
      current = applyTokenToRow(current, t, s);
      rows.push(current);
    }
    leads += 1;
    if (current === rounds) break; // back to rounds
  }
  return rows;
}