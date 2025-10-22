// newAlg.js
/**
 * Parsing to AST + Evaluation to flat string[]
 *
 * AST:
 *   Group = { type: 'Group', items: Element[] }
 *   Element = string | Group
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

module.exports = {
  parseTopLevel,
  evaluateTopLevel,
  tokenizeFlat,
  // internals (handy for deeper tests if needed)
  _internals: {
    parseGroupInner,
    evalGroup,
    evalElement,
    splitTopLevelByDot,
    validateParens,
    findMatchingParen
  }
};