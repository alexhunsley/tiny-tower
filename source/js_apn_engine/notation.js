const MAX_STAGE = 30;
const MIN_STAGE = 1;

// note the lack of I, O in PN chars -- that's standard
export const STAGE_SYMBOLS = "1234567890ETABCDFGHJKLMNPQRSU";

const X_CHARS = new Set(["X", "-"]);

export function clampStage(n) {
  console.log("clampStage: ", n);

  const v = Number(n);
  return Math.max(MIN_STAGE, Math.min(v, MAX_STAGE));
}

export function isXChar(ch) {
  return X_CHARS.has(ch.toUpperCase());
}


export function roundsForStage(stage) {
  const s = clampStage(stage);
  return STAGE_SYMBOLS.substring(0, s);
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
    const isNum = t => !isXChar(t);
    if (prev && isNum(prev) && isNum(tok)) {
      out += ".";
    }
    out += tok;
  }
  return out;
}

/* ---------------- Generate rows by repeating the lead token list ---------------- */
export function generateList({ leadTokens, stage, maxChanges = 6000 }) {
  const s = clampStage(stage);
  const rounds = roundsForStage(s);

  // NOTE: expandPlaceNotation now needs stage (for the ';' mapping)
  // const leadTokens = expandPlaceNotation(pnString, s);

  console.log("calling evaluateExpression with pnString = ", leadTokens);

  // const leadTokens = evaluateExpression(pnString);

  if (!leadTokens.length) return [rounds];

  console.log("Expanded PN tokens:", collapsePlaceNotation(leadTokens));

  const rows = [rounds];
  let current = rounds;
  let leads = 0;

  while (rows.length <= maxChanges) {
    for (const t of leadTokens) {
      current = applyTokenToRow(current, t, s);
      rows.push(current);
    }
    leads += 1;
    if (current === rounds) break; // back to rounds
  }
  return rows;
}

/* ---------------- Apply a token to a row (unchanged) ---------------- */
function applyTokenToRow(row, token, stage) {
  const n = row.length;
  const src = row.split("");
  const out = src.slice();

  if (isXChar(token)) {
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
  if (isXChar(token)) return token;
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

// standard ',' format for palindromic PN
export function expandCommaPlaceNotation(pnString, stage) {
    const raw = String(pnString || "").trim();
  if (!raw) return [];

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
}

// xx ok, defo need to handle half lead being different from lead.
// to keep consistent order with ',',
// we will list half lead, lead end after the ';' when there are two
// (otherwise derived first from second).
//
// So double oxford is this:
//    x14x36x;78;12
//
// 
/* ---------------- Expand with commas and the special ';' semantics ---------------- */
// If there's exactly one ';', apply the special rule described.
// Otherwise, old behavior:
//   - with commas: per-segment palindromes (tokens + reverse(tokensWithoutLast))
//   - without commas: just tokenize (no mirroring)
export function expandPlaceNotation(pnString, stage) {
  let raw = String(pnString || "").trim().toUpperCase();
  if (!raw) return [];

  // Handle special ';' case
  const semiIdx = raw.indexOf(";");
  if (semiIdx !== -1) {
    // split into LEFT ; RIGHT (ignore any extra ';' beyond the first)
    const leftRaw  = raw.slice(0, semiIdx).trim();
    const rightRaw = raw.slice(semiIdx + 1).trim();

    const leftTokens = tokenizeSegment(leftRaw);
    const rightMirroredTokens = mirroredNotate(rightRaw, clampStage(stage));

    console.log("right raw, right mirrored = ", rightRaw, " ", rightMirroredTokens);

    // this -1-stage%2 is needed for now for e.g. plain hunt on 7,
    // but I'm barking up the wrong tree; see (A,b),c idea etc.
    const leftTail = leftTokens.slice(0, -1-stage%2)
    // const leftTail = leftTokens.slice(0, -1)
      .reverse()
      .map(tok => mirrorPlacesWithinToken(tok, clampStage(stage)));

    console.log("  left tail: ", leftTail);

    const part1_part2 = [...leftTokens, ...leftTail];

    const comma_notation_left = [...part1_part2, rightMirroredTokens];
    raw = collapsePlaceNotation(comma_notation_left) + "," + rightRaw;
    console.log(" ; HANDLING: made comma version of ", raw);
  }

  // Legacy comma behavior (unchanged)
  if (raw.includes(",")) {
    const expandedCommaNotationTokens = expandCommaPlaceNotation(raw, stage);
    return expandedCommaNotationTokens;
  }

  // No commas: simple tokenize, no mirroring
  return tokenizeSegment(raw);
}


