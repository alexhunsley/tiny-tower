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

    if (ch === 'x' || ch === 'X') {
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
  if (!stage || stage < 1) {
    throw new Error("'=' operator requires a valid stage (use '<n>|' prefix).");
  }
  const subset = ALPHABET.slice(0, Math.min(stage, ALPHABET.length));
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

// Character set for stage-based inversion (prefix subset by stage)
const ALPHABET = "1234567890ETABCD";

// Invert every char using the first `stage` chars of ALPHABET,
// then reverse the whole string to preserve inherent order.
// If stage is not set and this is used (for ';'), we throw.
function invertTokenWithStage(str) {
  const stage = getStage?.() ?? null;
  if (!stage || stage < 1) {
    throw new Error("';' operator requires a valid stage (use '<n>|' prefix).");
  }
  const subset = ALPHABET.slice(0, Math.min(stage, ALPHABET.length));
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

function evaluateExpression(input) {
  let src = input.trim();

  // Reset stage for this top-level expression,
  // and set it ONLY if we see the "<int>|" prefix.
  // const m = /^(\d+)\|/.exec(src);
  const m = /^([1234567890ETABCDetabcd]+)\|/.exec(src);
  if (m) {
    ParserContext.stage = null;                  // reset because we are consuming a new prefix
    ParserContext.stage = ALPHABET.indexOf(m[1]) + 1 // parseInt(m[1], 10);    // set stage from prefix
    src = src.slice(m[0].length);                // strip "n|"
  } else {
    ParserContext.stage = null;                  // no prefix at top-level => no stage for this expression
  }

  // From here on, do NOT parse n| again.
  return evaluateExpressionInternal(src);
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

/* -------------------------------------------------------
 * Exports
 * ----------------------------------------------------- */

module.exports = {
  parseTopLevel,
  evaluateTopLevel,
  tokenizeFlat,
  evaluateExpression,
  getStage,
  // matchRepeatOuter,
  // repeatList,
  _internals: {
    parseGroupInner,
    evalGroup,
    evalElement,
    splitTopLevelByDot,
    validateParens,
    findMatchingParen,
    splitTrailingSlices,
    doubleUp,
    slice_custom,
    evaluateSegmentsNoComma
  }
};
