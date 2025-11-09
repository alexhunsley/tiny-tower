// newAlg.js
/**
 * Parsing to AST + Evaluation to flat string[] + postfix slice operator(s) + low-precedence comma.
 *
 * AST:
 *   Group = { type: 'Group', items: Element[] }
 *   Element = string | Group
 *
 * Operators:
 *   - Dot segmentation (.) at top level (outside parens) groups segments.
 *   - Postfix slices: Segment [slice] [slice] ...
 *       slice ∈ [start:stop], [start:], [:stop], [:], [i:>k], [i:<k], [-]
 *   - Low-precedence infix comma: left , right
 *       Evaluate left and right to lists, "double up" each side, then concatenate.
 *       Doubling rule: if len <= 1, no-op; else L ++ reverse(L).drop(1)
 *       Either side may be empty -> that side yields [].
 */

import { clampStage, STAGE_SYMBOLS } from "./notation.js";

// Character set for stage-based inversion (prefix subset by stage)
const ROUNDS_CHARS = "1234567890ETABCDFGHJKLMNPQRSUV";

// Global parser context
const ParserContext = {
  stage: null
};

function getStage() { return ParserContext.stage; }

function parseTopLevel(input) {
  const src = input.trim();
  validateParens(src);
  const parts = splitTopLevelByDot(src);
  return parts.map(part => {
    const trimmed = part.trim();
    if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
      throw new Error(`Expected a bracketed group at top level, got: ${trimmed}`);
    }
    return parseGroup(trimmed);
  });
}

function splitTopLevelByDot(s) {
  const parts = [];
  let depthPar = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depthPar++;
    else if (ch === ')') depthPar--;
    else if (ch === '.' && depthPar === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  if (start <= s.length) parts.push(s.slice(start));
  return parts.filter(p => p.length > 0);
}

function parseGroup(groupText) {
  if (groupText[0] !== '(' || groupText[groupText.length - 1] !== ')') {
    throw new Error(`Group must start with '(' and end with ')': ${groupText}`);
  }
  const inner = groupText.slice(1, -1);
  const items = parseGroupInner(inner);
  return { type: 'Group', items };
}

function parseGroupInner(s) {
  const items = [];
  let i = 0;
  let buf = "";

  const flushBuf = () => {
    if (buf.length > 0) {
      items.push(buf);
      buf = "";
    }
  };

  while (i < s.length) {
    const ch = s[i];

    if (ch === '(') {
      const end = findMatchingParen(s, i); // throws if unmatched
      flushBuf();
      const nestedText = s.slice(i, end + 1);
      items.push(parseGroup(nestedText));
      i = end + 1;
      continue;
    }

    if (ch === ')') {
      throw new Error("Unexpected ')' inside group");
    }

    if (ch === '.') {
      flushBuf();  // delimiter only
      i++;
      continue;
    }

    if (ch === 'x' || ch === 'X' || ch == '-') {
      flushBuf();      // split before x
      items.push('x'); // literal token
      i++;
      continue;
    }

    buf += ch;
    i++;
  }

  flushBuf();
  return items.filter(tok => !(typeof tok === 'string' && tok.length === 0));
}

/** Validate parentheses globally; throw clear "Unmatched" errors. */
function validateParens(s) {
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') stack.push(i);
    else if (ch === ')') {
      if (stack.length === 0) throw new Error(`Unmatched ")" at index ${i}`);
      stack.pop();
    }
  }
  if (stack.length) {
    const openIdx = stack[stack.length - 1];
    throw new Error(`Unmatched "(" at index ${openIdx}`);
  }
}

function findMatchingParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  throw new Error(`Unmatched "(" at index ${openIdx}`);
}

/* ---------------------
 * Evaluation (flatten)
 * --------------------- */

function evalElement(el) {
  if (typeof el === 'string') {
    return el.length ? [el] : [];
  }
  return evalGroup(el);
}

function evalGroup(group) {
  const out = [];
  for (const item of group.items) {
    const part = evalElement(item);
    if (part.length) out.push(...part);
  }
  return out;
}

function evaluateTopLevel(groups) {
  const out = [];
  for (const g of groups) out.push(...evalGroup(g));
  return out;
}

/** Tokenize a flat (non-parenthesized) segment using inner rules. */
function tokenizeFlat(s) {
  const items = parseGroupInner(s);
  const flatten = el => (typeof el === 'string' ? [el] : evalGroup(el));
  return items.flatMap(flatten);
}

/* -------------------------------------------------------
 * Postfix slice parsing and application
 * ----------------------------------------------------- */

/** Pull off any trailing chained [..] slices from a segment. */
function splitTrailingSlices(input) {
  const slices = [];
  let i = input.length - 1;
  while (i >= 0) {
    if (input[i] !== ']') break;
    let depth = 0;
    let j = i;
    while (j >= 0) {
      const ch = input[j];
      if (ch === ']') depth++;
      else if (ch === '[') {
        depth--;
        if (depth === 0) break;
      }
      j--;
    }
    if (j < 0 || input[j] !== '[') break;
    const sliceSpec = input.slice(j, i + 1);
    slices.unshift(sliceSpec);
    i = j - 1;
    while (i >= 0 && /\s/.test(input[i])) i--;
  }
  const base = input.slice(0, i + 1).trim();
  return { base, slices };
}


// helper

// Expand a token by adding the stage-mirror of each digit it contains,
// then return a single string with unique chars sorted by the stage subset order.
// Non-subset characters are ignored for '=' expansion.
function mirrorExpandToken(str) {
  if (str.toUpperCase() == "X") { return "x" }
  const stage = getStage?.() ?? null;
  // console.log("In mirror for =, found stage = ", stage);

  if (!stage || stage < 1) {
    throw new Error("'=' operator requires a valid stage (use '<n>|' prefix).");
  }
  const subset = ROUNDS_CHARS.slice(0, Math.min(stage, ROUNDS_CHARS.length));
  const last = subset.length - 1;

  const present = new Set();
  for (const ch of str) {
    const idx = subset.indexOf(ch);
    if (idx !== -1) {
      present.add(ch);
      present.add(subset[last - idx]); // add mirror char
    }
  }

  // Emit in canonical subset order
  let out = '';
  for (const ch of subset) {
    if (present.has(ch)) out += ch;
  }
  return out;
}

// Detects N(<...>) where '(' at that position closes at the very end
function matchRepeatOuter(base) {
  const s = base.trim();
  const open = s.indexOf('(');
  if (open <= 0) return null;                 // must have digits before '('
  const prefix = s.slice(0, open).trim();
  if (!/^\d+$/.test(prefix)) return null;     // prefix must be an integer
  const end = findMatchingParen(s, open);     // throws if unmatched
  if (end !== s.length - 1) return null;      // '(' must match the last ')'
  return { count: parseInt(prefix, 10), inner: s.slice(open + 1, end).trim() };
}

function repeatList(list, n) {
  if (n <= 0 || list.length === 0) return [];
  const out = [];
  for (let i = 0; i < n; i++) out.push(...list);
  return out;
}

// Returns true iff s is exactly one balanced (...) pair (no extra chars outside)
function isSingleOuterParens(s) {
  if (!s || s[0] !== '(' || s[s.length - 1] !== ')') return false;
  try {
    const end = findMatchingParen(s, 0);
    return end === s.length - 1;
  } catch {
    return false;
  }
}

// Invert every char using the first `stage` chars of ROUNDS_CHARS,
// then reverse the whole string to preserve inherent order.
// If stage is not set and this is used (for ';'), we throw.
function invertTokenWithStage(str) {
  const stage = getStage?.() ?? null;
  if (!stage || stage < 1) {
    throw new Error("';' operator requires a valid stage (use '<n>|' prefix).");
  }
  const subset = ROUNDS_CHARS.slice(0, Math.min(stage, ROUNDS_CHARS.length));
  const last = subset.length - 1;

  const mapped = Array.from(str, ch => {
    const idx = subset.indexOf(ch);
    if (idx === -1) return ch;                 // leave unknown chars unchanged
    return subset[last - idx];                 // mirror across subset
  }).join("");

  // reverse the mapped string
  return mapped.split("").reverse().join("");
}

// Like doubleUp, but invert each item of the appended reversed tail.
function doubleUpWithInvert(list) {
  if (list.length <= 1) return list.slice();
  const tail = list.slice(0, -1).reverse().map(invertTokenWithStage);
  return list.concat(tail);
}

/* -------------------------------------------------------
 * Low-precedence comma support
 * ----------------------------------------------------- */

// Split by top-level commas, respecting (...) and [...] (slices)
// function splitTopLevelByComma(s) {
//   const parts = [];
//   let depthPar = 0;
//   let depthSq = 0;
//   let start = 0;
//   for (let i = 0; i < s.length; i++) {
//     const ch = s[i];
//     if (ch === '(') depthPar++;
//     else if (ch === ')') depthPar--;
//     else if (ch === '[') depthSq++;
//     else if (ch === ']') depthSq--;
//     else if (ch === ',' && depthPar === 0 && depthSq === 0) {
//       parts.push(s.slice(start, i));
//       start = i + 1;
//     }
//   }
//   if (start <= s.length) parts.push(s.slice(start));
//   // keep empties (empty side is allowed -> [])
//   return parts.map(p => p.trim());
// }

// Split by top-level low-precedence ops (',' and ';'), respecting (...) and [...]
function splitTopLevelByLowOps(s) {
  const parts = [];
  const ops = [];
  let depthPar = 0, depthSq = 0;
  let start = 0;

  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depthPar++;
    else if (ch === ')') depthPar--;
    else if (ch === '[') depthSq++;
    else if (ch === ']') depthSq--;
    else if ((ch === ',' || ch === ';' || ch === '=') && depthPar === 0 && depthSq === 0) {
      parts.push(s.slice(start, i));
      ops.push(ch);
      start = i + 1;
    }
  }

  if (start <= s.length) parts.push(s.slice(start));
  // Keep empties (empty side allowed)
  return { parts: parts.map(p => p.trim()), ops };
}

/** Mirror/double-up: if len <= 1 -> no-op; else L ++ reverse(L).drop(1). */
function doubleUp(list) {
  if (list.length <= 1) return list.slice();
  const tailRev = list.slice(0, -1).reverse();
  return list.concat(tailRev);
}

function evaluateSegmentsNoComma(input) {
  const trimmed = input.trim();
  if (trimmed.length === 0) return []; // empty side of a low-precedence op => []

  const hasParens = trimmed.includes('(') || trimmed.includes(')');

  // Case A: no parentheses -> treat the whole thing as one flat base,
  // and apply any trailing slice chain to the WHOLE list.
  if (!hasParens) {
    const { base, slices } = splitTrailingSlices(trimmed);
    let list = base.length === 0 ? [] : tokenizeFlat(base);
    for (const spec of slices) {
      list = slice_custom(list, spec);
    }
    return list;
  }

  // Case B: parentheses present -> split by top-level '.' into segments,
  // and let each segment have its own trailing slice chain.
  const parts = splitTopLevelByDot(trimmed);
  const results = [];

  for (const part of parts) {
    const { base, slices } = splitTrailingSlices(part.trim());

    let list;

    // Multiplier N(<...>) has high precedence within a segment
    const rep = matchRepeatOuter(base);
    if (rep) {
      const innerList = evaluateExpressionInternal(rep.inner); // no stage parsing here
      list = repeatList(innerList, rep.count);
    } else if (isSingleOuterParens(base)) {
      // Evaluate inside a single outer paren pair (no stage parsing here)
      const inner = base.slice(1, -1).trim();
      list = evaluateExpressionInternal(inner);
    } else if (base.includes('(') || base.includes(')')) {
      // Fallback path for complex/nested cases via AST
      const ast = parseTopLevel(base);
      list = evaluateTopLevel(ast);
    } else if (base.length === 0 && slices.length > 0) {
      list = [];
    } else {
      // Plain flat tokens ('.' delimiter; 'x' token+delimiter)
      list = tokenizeFlat(base);
    }

    // Apply this segment’s trailing slice chain AFTER multiplier/parens
    for (const spec of slices) {
      list = slice_custom(list, spec);
    }

    results.push(...list);
  }

  return results;
}

// Internal evaluator that NEVER parses n| and NEVER resets stage.
// Used by recursive calls (e.g., when evaluating inside single outer parens).
function evaluateExpressionInternal(src) {
  console.log("evaluateExpressionInternal, src = ", src);

  const { parts, ops } = splitTopLevelByLowOps(src.trim());

  if (ops.length === 0) {
    return evaluateSegmentsNoComma(parts[0]);
  }

  // Left-associative fold over , and ;
  let acc = evaluateSegmentsNoComma(parts[0]);
  for (let i = 0; i < ops.length; i++) {
    const right = evaluateSegmentsNoComma(parts[i + 1]);
    const op = ops[i];
    if (op === ',') {
      acc = doubleUp(acc).concat(doubleUp(right));
    } else if (op === ';') {
      acc = doubleUpWithInvert(acc).concat(doubleUpWithInvert(right));
    } else if (op === '=') {
      // '=' only affects the left: mirror-expand each left token; right passes through unchanged
      const leftMirrored = acc.map(mirrorExpandToken);
      acc = leftMirrored.concat(right);
    } else {
      throw new Error(`Unknown operator: ${op}`);
    }
  }
  return acc;
}

// the the input pn doesn't contain a stage (using pipe "N|") then fallbackStage is used
// (which comes from the stage text box)
function evaluateExpression(input, fallbackStage) {
  console.log("evaluateExpression, fallbackStage = ", fallbackStage, " passed input =", input);
  let src = input.trim();
  console.log("evaluateExpression, passed input =", input, " src = ", src);

  ParserContext.stage = fallbackStage;

  // If a pipe exists anywhere, we treat it as the (only) stage delimiter.
  // The *only* valid form is exactly one char before the first pipe: "<char>|".
  const pipeIndex = src.indexOf('|');
  console.log(" PIPE INDEX: ", pipeIndex, " on src = ", src);

  if (pipeIndex !== -1) {
    // Must be exactly one character before the pipe.
    if (pipeIndex !== 1) {
      throw new Error("Couldn't parse stage");
    }

    const ch = src[0];
    const stageIndex = ROUNDS_CHARS.indexOf(ch);
    if (stageIndex === -1) {
      throw new Error("Couldn't parse stage");
    }

    // Set stage from the single char and strip "<char>|"
    ParserContext.stage = stageIndex + 1;
    src = src.slice(2);

    console.log("Parsing this: ", input, " stage is : ", ParserContext.stage);
  }
  else {
    ParserContext.stage = clampStage(fallbackStage);
    console.log("Using stage from UI textbox: ", ParserContext.stage)
  }

  // From here on, do NOT parse "<char>|" again.
  return {pnTokens: evaluateExpressionInternal(src), resolvedStage: ParserContext.stage};
}

/* -------------------------------------------------------
 * slice_custom (ported to JS)
 * ----------------------------------------------------- */

function slice_custom(myList, sliceSpec) {
  const n = myList.length;

  const err = (msg) => { throw new Error(`slice_custom: ${msg}`); };

  // normalize for standard (non-circular) slices:
  //  - negatives wrap from end
  //  - positives clamp to [0..n] (DO NOT modulo-wrap stop==n to 0)
  const normStd = (i, len) => {
    if (len === 0) return 0;
    if (i < 0) {
      const m = i % len;              // negative or 0
      return m < 0 ? m + len : m;     // wrap from end
    }
    return i > len ? len : i;         // clamp (i==len stays len)
  };

  const isInt = (s) => /^[-+]?\d+$/.test(s);

  const s = sliceSpec.trim();
  if (!s.startsWith('[') || !s.endsWith(']')) {
    err(`spec must be like "[...]", got "${sliceSpec}"`);
  }
  const inner = s.slice(1, -1).trim();

  // Reverse shorthand: [-]
  if (inner === '-') {
    const out = myList.slice();
    out.reverse();
    return out;
  }

  const colonIdx = inner.indexOf(':');
  if (colonIdx === -1) err(`missing ":" in spec "${sliceSpec}"`);
  const leftRaw = inner.slice(0, colonIdx).trim();
  const rightRaw = inner.slice(colonIdx + 1).trim();

  // Circular mode?
  const isCircular = rightRaw.startsWith('>') || rightRaw.startsWith('<');
  if (isCircular) {
    if (n === 0) err('cannot perform circular slice on empty list');

    const dir = rightRaw[0]; // '>' or '<'
    const countStr = rightRaw.slice(1).trim();

    if (!isInt(leftRaw)) err(`circular start must be an integer, got "${leftRaw}"`);
    const startRaw = parseInt(leftRaw, 10);

    // For circular we DO want modulo wrapping for the starting index.
    const normalizeCircular = (i, len) => {
      if (len === 0) return 0;
      const m = i % len;
      return m < 0 ? m + len : m;
    };
    const start = normalizeCircular(startRaw, n);

    let count;
    if (countStr === '') count = n;
    else {
      if (!/^\d+$/.test(countStr)) err(`count must be a non-negative integer, got "${countStr}"`);
      count = parseInt(countStr, 10);
    }

    if (count === 0) return [];

    const out = [];
    if (dir === '>') {
      let idx = start;
      for (let t = 0; t < count; t++) {
        out.push(myList[idx]);
        idx = (idx + 1) % n;
      }
    } else {
      let idx = start;
      for (let t = 0; t < count; t++) {
        out.push(myList[idx]);
        idx = (idx - 1 + n) % n;
      }
    }
    return out;
  }

  // ---------- Standard (no wrap) ----------
  if (n === 0) return [];

  const leftIsEmpty = leftRaw === '';
  const rightIsEmpty = rightRaw === '';

  let startNorm = null;
  let stopNorm = null;

  if (!leftIsEmpty) {
    if (!isInt(leftRaw)) err(`invalid start index "${leftRaw}"`);
    startNorm = normStd(parseInt(leftRaw, 10), n);
  }
  if (!rightIsEmpty) {
    if (!isInt(rightRaw)) err(`invalid stop index "${rightRaw}"`);
    stopNorm = normStd(parseInt(rightRaw, 10), n);
  }

  const bothPresent = startNorm !== null && stopNorm !== null;

  if (!bothPresent) {
    // Forward, no wrap: inclusive start, exclusive stop
    const start = startNorm ?? 0;
    const stop = stopNorm ?? n;
    if (start >= stop) return [];
    return myList.slice(start, stop);
  } else {
    const start = startNorm;
    const stop = stopNorm;
    if (start === stop) return [];
    if (start < stop) {
      // Forward, exclusive stop
      return myList.slice(start, stop);
    } else {
      // Backward, inclusive both ends
      const out = [];
      for (let i = start; i >= stop; i--) out.push(myList[i]);
      return out;
    }
  }
}

//////////////////////////////////
// perm cycles (differential detection, etc.)

// Example (default): const ROUNDS_CHARS = "1234567890ETABCD";

/**
 * derivePermCycles("21453") -> { cycles: ["12", "345"], period: 6 }
 * The permutation string is a one-line image of the first n symbols of `alphabet`.
 * Position i (1-based) maps to the symbol at oneLine[i-1], which must be among the first n symbols.
 */
function derivePermCycles(oneLine, alphabetIn) {
  // console.log("alphabetIn = ", alphabetIn);
  console.log("oneLine = ", oneLine);

  // const alphabet = alphabetIn ?? globalThis.ROUNDS_CHARS ?? "1234567890ETABCD";
  const alphabet = alphabetIn ?? globalThis.ROUNDS_CHARS ?? "1234567890ETABCDFGHJKLMNPQRSU";

  // console.log("alphabet: ", alphabet);
  if (typeof oneLine !== "string" || oneLine.length === 0) {
    throw new Error("oneLine must be a non-empty string");
  }

  const n = oneLine.length;
  if (n > alphabet.length) {
    throw new Error(`Permutation length ${n} exceeds alphabet length ${alphabet.length}`);
  }

  // Use only the first n symbols of the alphabet
  const subset = alphabet.slice(0, n);

  // console.log("subset: ", subset);

  // Map symbol -> 1-based index within subset
  const idxOf = new Map();
  for (let i = 0; i < n; i++) idxOf.set(subset[i], i + 1);

  // Build mapping p: i -> p(i), with i in 1..n
  const p = new Array(n + 1);
  for (let i = 1; i <= n; i++) {
    const ch = oneLine[i - 1];
    const v = idxOf.get(ch);
    if (v == null) {
      throw new Error(`Invalid symbol '${ch}' at position ${i}; expected one of "${subset}"`);
    }
    p[i] = v;
  }

  // Validate it's a permutation (all images unique)
  const seenVals = new Set();
  for (let i = 1; i <= n; i++) {
    if (p[i] < 1 || p[i] > n) {
      throw new Error(`Image out of range at ${i}: ${p[i]}`);
    }
    seenVals.add(p[i]);
  }
  if (seenVals.size !== n) {
    throw new Error(`Input is not a permutation of the first ${n} symbols of the alphabet`);
  }

  // Extract cycles
  const visited = new Array(n + 1).fill(false);
  const cycles = [];
  const lengths = [];

  for (let start = 1; start <= n; start++) {
    if (visited[start]) continue;

    let cur = start;
    const cycleIdx = [];
    while (!visited[cur]) {
      visited[cur] = true;
      cycleIdx.push(cur);
      cur = p[cur];
    }

    // Convert indices to alphabet symbols for the cycle string
    const cycleStr = cycleIdx.map(i => subset[i - 1]).join("");
    cycles.push(cycleStr);
    lengths.push(cycleIdx.length);
  }

  // Period = LCM of cycle lengths
  const gcd = (a, b) => {
    while (b) [a, b] = [b, a % b];
    return a;
  };
  const lcm = (a, b) => (a === 0 || b === 0) ? 0 : (a / gcd(a, b)) * b;
  const period = lengths.reduce((acc, k) => lcm(acc, k), 1);

  return { cycles, period };
}

//   later!
// const MethodType = Object.freeze({
//   HUNTER:        0,
//   DIFFERENTIAL:  1 << 0,
//   PRINCIPAL:     1 << 1,
// });

// takes a list of strings representing perm cycles,
// e.g. PB4 has cycles ["1", "423"]
function arePermCyclesConsideredDifferential(permCycles) {
  // Edge case: technically a perm cycle list of one single char string isn't
  // a differential (e.g permCycle = ["1"]).
  // This check could be omitted if you never expect this to come up.
  if (permCycles.length == 0 || permCycles.length == 1 && permCycles[0].length == 1) {
    return false;
  }

  return permCycles.filter(cycle => cycle.length > 1).length != 1;
}

// test data: "5|45.1" has 5 backwards tenors at backstroke,
//            "7|67.1" has 3.
//
// No back tenors:
//            "4|x14x14,12" (PB4)
//            "4|12x14x14x14x" (PB4 rotated by 1)
//
function count87s(rows, stage) {
  if (stage % 2 === 1) { return 0; }

  const backwardTenors = ROUNDS_CHARS.slice(stage-2, stage).split('').reverse().join('');
  const res = rows.filter((row, i) => (i % 2 === 0) && row.endsWith(backwardTenors))
  // console.log(`Checking rows for ending with ${backwardTenors}, given stage ${stage}, row 1 = ${rows[1]}`);
  // console.log(`backwards tenors lists: ${res}`);
  return res.length;
}

/**
 * Measure separation between the highest bell and the one just below it
 * across a list of rows, and return the distribution as percentages.
 *
 * @param {number} stage - e.g. 7 for Triples, 8 for Major, 12 for Maximus
 * @param {string[]} rows - list of rows like ["1234567", "2143657", ...]
 * @returns {number[]} array of percentages, index = distance apart (1-based)
 */
export function measureTopPairDistances(stage, rows) {
  const alphabet = ROUNDS_CHARS.slice(0, stage);
  const hiChar = alphabet[stage - 1];
  const belowChar = alphabet[stage - 2];

  // all possible separations (1..stage-1)
  const counts = Array(stage).fill(0);

  for (const row of rows) {
    const hiIndex = row.indexOf(hiChar);
    const lowIndex = row.indexOf(belowChar);
    if (hiIndex === -1 || lowIndex === -1) continue;

    const distance = Math.abs(hiIndex - lowIndex); // 0-based separation
    counts[distance] += 1;
  }

  const total = rows.length || 1;
  const percents = counts.map(c => (c / total) * 100);

  return percents;
}

// composition stuff



/* -------------------------------------------------------
 * Exports
 * ----------------------------------------------------- */

export {
  parseTopLevel,
  evaluateTopLevel,
  tokenizeFlat,
  evaluateExpression,
  getStage,
  derivePermCycles,
  arePermCyclesConsideredDifferential,
  count87s
};

export const _internals = {
  parseGroupInner,
  evalGroup,
  evalElement,
  splitTopLevelByDot,
  validateParens,
  findMatchingParen,
  splitTrailingSlices,
  doubleUp,
  slice_custom,
  evaluateSegmentsNoComma,
};

