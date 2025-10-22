// newAlg.js
/**
 * Parsing to AST + Evaluation to flat string[] + postfix slice operator(s).
 *
 * AST:
 *   Group = { type: 'Group', items: Element[] }
 *   Element = string | Group
 *
 * Postfix slices:
 *   BaseExpr [slice] [slice] ...
 *   where slice is your custom spec: [start:stop], [start:], [:stop], [:], [i:>k], [i:<k], [-]
 *
 * Rules:
 *   - If the input contains '(' or ')', we parse bracketed groups (top-level segments split by '.' outside parens).
 *   - Otherwise we treat it as a flat segment and use the inner tokenizer.
 *   - Any trailing [ ... ] blocks are parsed as postfix slice ops and applied in order (left-to-right).
 */

function parseTopLevel(input) {
  const src = input.trim();

  // 1) Validate parentheses up front so unmatched '(' throws clearly
  validateParens(src);

  // 2) Split top-level by '.' (dots outside parentheses)
  const parts = splitTopLevelByDot(src);
  return parts.map(part => {
    const trimmed = part.trim();
    // For this grammar we expect each top-level segment to be a bracketed group
    if (!trimmed.startsWith('(') || !trimmed.endsWith(')')) {
      throw new Error(`Expected a bracketed group at top level, got: ${trimmed}`);
    }
    return parseGroup(trimmed);
  });
}

function splitTopLevelByDot(s) {
  const parts = [];
  let depth = 0;
  let start = 0;
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') depth++;
    else if (ch === ')') depth--;
    else if (ch === '.' && depth === 0) {
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
      // Should never occur here in a well-formed substring
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

/**
 * Throws if any '(' is unmatched or a ')' appears without a matching '('.
 * Gives a consistent "Unmatched" error message for tests.
 */
function validateParens(s) {
  const stack = [];
  for (let i = 0; i < s.length; i++) {
    const ch = s[i];
    if (ch === '(') stack.push(i);
    else if (ch === ')') {
      if (stack.length === 0) {
        throw new Error(`Unmatched ")" at index ${i}`);
      }
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
  // If we get here, no closing ')' was found for this '('
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

/**
 * Utility for testing flat tokenization of a *non-parenthesized* string.
 * Mirrors the inner tokenizer semantics ('.' is delimiter, 'x' is token+delimiter).
 */
function tokenizeFlat(s) {
  const items = parseGroupInner(s);
  const flatten = el => (typeof el === 'string' ? [el] : evalGroup(el));
  return items.flatMap(flatten);
}

/* -------------------------------------------------------
 * Postfix slice parsing and application
 * ----------------------------------------------------- */

/**
 * Extract trailing chained slice specs from an input.
 * Returns { base, slices[] } where slices are in left-to-right order.
 *
 * Example:
 *   "23.78x1289[2:5][-]" -> { base: "23.78x1289", slices: ["[2:5]", "[-]"] }
 */
function splitTrailingSlices(input) {
  const slices = [];
  let i = input.length - 1;
  while (i >= 0) {
    if (input[i] !== ']') break;
    // find matching '[' for this ']'
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
    if (j < 0 || input[j] !== '[') {
      // malformed trailing bracket region; stop and let main parser complain later if needed
      break;
    }
    // capture this slice
    const sliceSpec = input.slice(j, i + 1);
    slices.unshift(sliceSpec); // collect in order
    // move left past this slice
    i = j - 1;
    // continue while more trailing slices
    while (i >= 0 && /\s/.test(input[i])) i--;
  }
  const base = input.slice(0, i + 1).trim();
  return { base, slices };
}

/**
 * Evaluate a full expression with optional postfix slices.
 * - If base contains '(' or ')', use the bracketed-group parser/evaluator.
 * - Otherwise, treat base as a flat tokenizable segment.
 * - Then apply slices in order.
 */
function evaluateExpression(input) {
  const { base, slices } = splitTrailingSlices(input.trim());

  let list;
  if (base.includes('(') || base.includes(')')) {
    // bracketed groups at top level
    const ast = parseTopLevel(base);
    list = evaluateTopLevel(ast);
  } else if (base.length === 0 && slices.length > 0) {
    // e.g., "[:]": base empty is okay IF we treat empty as empty list
    list = [];
  } else {
    // flat segment like "23.78x1289"
    list = tokenizeFlat(base);
  }

  for (const spec of slices) {
    list = slice_custom(list, spec);
  }
  return list;
}

/* -------------------------------------------------------
 * Your slice_custom (ported to JS)
 * ----------------------------------------------------- */

/**
 * slice_custom(myList, sliceSpec)
 * Supports:
 *   Standard (no wrap):
 *     [start:stop], [start:], [:stop], [:]
 *       - Negative indices allowed; normalize BEFORE deciding direction
 *       - Forward: inclusive start, exclusive stop (like JS/Python)
 *       - Backward (when startNorm > stopNorm): inclusive BOTH ends
 *
 *   Circular / wrap:
 *     [i:>], [i:<]          // full rotation (n items)
 *     [i:>k], [i:<k]        // k items forward/backward with wrap
 *
 *   Reverse shorthand:
 *     [-]                   // reverse whole list
 *
 * Notes:
 *   - No step parameter.
 *   - Whitespace is ignored around tokens.
 *   - Empty list: standard slices return [], circular forms throw.
 */
function slice_custom(myList, sliceSpec) {
  const n = myList.length;

  const err = (msg) => { throw new Error(`slice_custom: ${msg}`); };

  const normalize = (i, len) => {
    if (len === 0) return 0;
    const m = i % len;
    return m < 0 ? m + len : m;
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
  if (colonIdx === -1) {
    err(`missing ":" in spec "${sliceSpec}"`);
  }
  const leftRaw = inner.slice(0, colonIdx).trim();
  const rightRaw = inner.slice(colonIdx + 1).trim();

  // Detect circular forms: right side starts with '>' or '<'
  const isCircular = rightRaw.startsWith('>') || rightRaw.startsWith('<');

  // ---------- Circular mode ----------
  if (isCircular) {
    if (n === 0) err('cannot perform circular slice on empty list');

    const dir = rightRaw[0]; // '>' or '<'
    const countStr = rightRaw.slice(1).trim(); // may be '' or digits

    if (!isInt(leftRaw)) err(`circular start must be an integer, got "${leftRaw}"`);
    const startRaw = parseInt(leftRaw, 10);
    const start = normalize(startRaw, n);

    let count;
    if (countStr === '') {
      count = n; // full rotation
    } else {
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
    } else { // dir === '<'
      let idx = start;
      for (let t = 0; t < count; t++) {
        out.push(myList[idx]);
        idx = (idx - 1 + n) % n;
      }
    }
    return out;
  }

  // ---------- Standard (no wrap) ----------
  if (n === 0) {
    return [];
  }

  const leftIsEmpty = leftRaw === '';
  const rightIsEmpty = rightRaw === '';

  let startNorm = null;
  let stopNorm = null;

  if (!leftIsEmpty) {
    if (!isInt(leftRaw)) err(`invalid start index "${leftRaw}"`);
    startNorm = normalize(parseInt(leftRaw, 10), n);
  }
  if (!rightIsEmpty) {
    if (!isInt(rightRaw)) err(`invalid stop index "${rightRaw}"`);
    stopNorm = normalize(parseInt(rightRaw, 10), n);
  }

  const bothPresent = startNorm !== null && stopNorm !== null;

  if (!bothPresent) {
    // Forward, no wrap
    const start = startNorm ?? 0;
    const stop = stopNorm ?? n;
    if (start >= stop) return [];
    return myList.slice(start, stop);
  } else {
    const start = startNorm;
    const stop = stopNorm;
    if (start === stop) {
      return [];
    }
    if (start < stop) {
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
  // original exports
  parseTopLevel,
  evaluateTopLevel,
  tokenizeFlat,
  // new convenience: full expression evaluator with postfix slice(s)
  evaluateExpression,
  // internals (handy for tests)
  _internals: {
    parseGroupInner,
    evalGroup,
    evalElement,
    splitTopLevelByDot,
    validateParens,
    findMatchingParen,
    splitTrailingSlices,
    slice_custom
  }
};
