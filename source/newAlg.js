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

/* -------------------------------------------------------
 * Low-precedence comma support
 * ----------------------------------------------------- */

// Split by top-level commas, respecting (...) and [...] (slices)
function splitTopLevelByComma(s) {
  const parts = [];
  let depthPar = 0;
  let depthSq = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depthPar++;
    else if (ch === ')') depthPar--;
    else if (ch === '[') depthSq++;
    else if (ch === ']') depthSq--;
    else if (ch === ',' && depthPar === 0 && depthSq === 0) {
      parts.push(s.slice(start, i));
      start = i + 1;
    }
  }
  if (start <= s.length) parts.push(s.slice(start));
  // keep empties (empty side is allowed -> [])
  return parts.map(p => p.trim());
}

/** Mirror/double-up: if len <= 1 -> no-op; else L ++ reverse(L).drop(1). */
function doubleUp(list) {
  if (list.length <= 1) return list.slice();
  const tailRev = list.slice(0, -1).reverse();
  return list.concat(tailRev);
}

// Evaluate an expression that has NO commas.
// Supports:
//  • If the input includes any parentheses: treat '.' as segment separators,
//    allow per-segment trailing slice chains (as before).
//  • If the input has NO parentheses: treat the whole thing as one flat base,
//    so trailing slices apply to the entire flat list (e.g. "12.x.34[:2]").
function evaluateSegmentsNoComma(input) {
  const trimmed = input.trim();
  if (trimmed.length === 0) return []; // empty side of comma => []

  const hasParens = trimmed.includes('(') || trimmed.includes(')');

  // Case A: no parentheses -> whole flat base + trailing slices for the WHOLE expr
  if (!hasParens) {
    const { base, slices } = splitTrailingSlices(trimmed);

    // Tokenize the entire flat base ('.' delimiter; 'x' token+delimiter)
    let list = base.length === 0 ? [] : tokenizeFlat(base);

    // Apply trailing slice chain to the whole list
    for (const spec of slices) {
      list = slice_custom(list, spec);
    }
    return list;
  }

  // Case B: parentheses present -> split by top-level '.' into segments,
  // and let each segment have its own trailing slices (existing behavior).
  const parts = splitTopLevelByDot(trimmed);
  const results = [];

  for (const part of parts) {
    const { base, slices } = splitTrailingSlices(part.trim());

    let list;
    if (base.includes('(') || base.includes(')')) {
      const ast = parseTopLevel(base);
      list = evaluateTopLevel(ast);
    } else if (base.length === 0 && slices.length > 0) {
      list = [];
    } else {
      list = tokenizeFlat(base);
    }

    for (const spec of slices) {
      list = slice_custom(list, spec);
    }

    results.push(...list);
  }

  return results;
}

/**
 * Full expression evaluator:
 *   - First split by top-level commas (lowest precedence).
 *   - Evaluate each side (dot segments + slices).
 *   - For each comma operation (left fold), double-up each operand and concatenate.
 */
function evaluateExpression(input) {
  const commaParts = splitTopLevelByComma(input.trim());

  // If no comma present, just evaluate segments
  if (commaParts.length === 1) {
    return evaluateSegmentsNoComma(commaParts[0]);
  }

  // Left-fold over commas
  let acc = evaluateSegmentsNoComma(commaParts[0]);
  for (let i = 1; i < commaParts.length; i++) {
    const right = evaluateSegmentsNoComma(commaParts[i]);
    const leftDoubled = doubleUp(acc);
    const rightDoubled = doubleUp(right);
    acc = leftDoubled.concat(rightDoubled);
  }
  return acc;
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
  _internals: {
    parseGroupInner,
    evalGroup,
    evalElement,
    splitTopLevelByDot,
    validateParens,
    findMatchingParen,
    splitTrailingSlices,
    splitTopLevelByComma,
    doubleUp,
    slice_custom,
    evaluateSegmentsNoComma
  }
};
