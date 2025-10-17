const STAGE_SYMBOLS = "1234567890ET"; // positions: 1..12 (10=0, 11=E, 12=T)

export function clampStage(n) {
  const v = Number(n);
  return Math.max(4, Math.min(12, Number.isFinite(v) ? v : 6));
}

export function roundsForStage(stage) {
  const s = clampStage(stage);
  return STAGE_SYMBOLS.substring(0, s);
}

const X_CHARS = new Set(["x", "X", "-"]);

export function isXChange(ch) {
  return X_CHARS.has(ch);
}

/* ---------------- Base tokenizer for a single segment (no commas) ---------------- */
// Splits on '.' and treats 'x'/'X' as its own token AND delimiter. Keeps 'x' tokens.
export function tokenizeSegment(pnSegment) {
  const src = String(pnSegment || "").trim();
  if (!src) return [];
  const allowed = new Set([...STAGE_SYMBOLS, "e", "t", "E", "T"]);
  const tokens = [];
  let buf = "";

  const flush = () => { if (buf) { tokens.push(buf); buf = ""; } };

  for (let i = 0; i < src.length; i++) {
    const ch = src[i];

    if (ch === ".") { flush(); continue; }
    if (isXChange(ch)) { flush(); tokens.push(ch); continue; }
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

// Utility: symbol <-> index (1-based)
export function symbolToIndex(sym) {
  const idx = STAGE_SYMBOLS.indexOf(sym);
  return idx >= 0 ? idx + 1 : null; // 1-based
}
function indexToSymbol(pos) {
  // pos is 1..12
  return STAGE_SYMBOLS[pos - 1] || "";
}

function mirroredNotate(notate, stage) {
  const mirroredTokens = [...notate].reverse().map(tok => mirrorPlacesWithinToken(tok, clampStage(stage)));
  console.log("Mirrored tokens = ", mirroredTokens);
  console.log("Mirrored tokens.join() = ", mirroredTokens.join(""));
  return mirroredTokens.join("");
}

/* ----------- NEW: map token's places via i -> (stage + 1 - i), keep 'x' ----------- */
function mirrorPlacesWithinToken(token, stage) {
  if (isXChange(token)) return token;
  const places = [];
  for (const ch of token) {
    const i = symbolToIndex(ch);
    if (!i) continue;
    const j = stage + 1 - i;      // position reversal within the stage
    places.push(j);
  }
  // Sort ascending and convert back to symbols (so 5,1 -> "14"; 8,7 -> "78")
  places.sort((a, b) => a - b);
  return places.map(indexToSymbol).join("");
}

/* ---------------- Expand with commas and the special ';' semantics ---------------- */
// If there's exactly one ';', apply the special rule described.
// Otherwise, old behavior:
//   - with commas: per-segment palindromes (tokens + reverse(tokensWithoutLast))
//   - without commas: just tokenize (no mirroring)
export function expandPlaceNotation(pnString, stage) {
  const raw = String(pnString || "").trim();
  if (!raw) return [];

  // Handle special ';' case
  const semiIdx = raw.indexOf(";");
  if (semiIdx !== -1) {
    // split into LEFT ; RIGHT (ignore any extra ';' beyond the first)
    const leftRaw  = raw.slice(0, semiIdx).trim();
    const rightRaw = raw.slice(semiIdx + 1).trim();

    const leftTokens = tokenizeSegment(leftRaw);
    const rightTokens = mirroredNotate(rightRaw, clampStage(stage));

    console.log("right raw, right tokens = ", rightRaw, ",", rightTokens);

    // Build S1: leftTokens + reverse(leftTokensWithoutLast) with per-token place reversal

    const leftTail = leftTokens.slice(0, -1-stage%2).reverse()
    // odd stages
    // const leftTail = leftTokens.slice(0, -2).reverse()
    // even stages
    // const leftTail = leftTokens.slice(0, -1).reverse()

    // const leftTail = leftTokens.reverse()
      .map(tok => mirrorPlacesWithinToken(tok, clampStage(stage)));
    const S1 = [...leftTokens, ...leftTail];

    // Final lead token list per your spec:
    // S1 + RIGHT + reverse(S1) + RIGHT
    const S1rev = S1.slice().reverse();
    return [...S1, rightTokens, ...S1rev, rightRaw];
  }

  // Legacy comma behavior (unchanged)
  if (raw.includes(",")) {
    const segments = raw.split(",").map(s => s.trim()).filter(Boolean);
    const out = [];
    for (const seg of segments) {
      const toks = tokenizeSegment(seg);
      if (!toks.length) continue;
      const mirror = toks.slice(0, -1).reverse(); // plain mirror (no place reversal)
      out.push(...toks, ...mirror);
    }
    return out;
  }

  // No commas: simple tokenize, no mirroring
  return tokenizeSegment(raw);
}

/* ---------------- Apply a token to a row (unchanged) ---------------- */
function applyTokenToRow(row, token, stage) {
  const n = row.length;
  const src = row.split("");
  const out = src.slice();

  if (isXChange(token)) {
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

/* ---------------- Generate rows by repeating the lead token list ---------------- */
export function generateList({ pnString, stage, maxLeads = 12 }) {
  const s = clampStage(stage);
  const rounds = roundsForStage(s);

  // NOTE: expandPlaceNotation now needs stage (for the ';' mapping)
  const leadTokens = expandPlaceNotation(pnString, s);
  if (!leadTokens.length) return [rounds];

  console.log("Expanded PN tokens:", collapsePlaceNotation(leadTokens));

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

/**
 * Collapse an expanded token list back into a compact PN string.
 * Example: ["x","12","56","x","78"] => "x12.56x78"
 */
export function collapsePlaceNotation(tokens) {
  if (!tokens || !tokens.length) return "";
  let out = "";
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i];
    const prev = i > 0 ? tokens[i - 1] : null;

    // If both prev and current are numbers/places, insert a dot
    const isNum = t => !isXChange(t);
    if (prev && isNum(prev) && isNum(tok)) {
      out += ".";
    }
    out += tok;
  }
  return out;
}
