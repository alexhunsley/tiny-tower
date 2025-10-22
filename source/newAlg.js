/**
 * Parsing to AST (same as before) + Evaluation to flat string[]
 *
 * AST:
 *   Group = { type: 'Group', items: Element[] }
 *   Element = string | Group
 */

function parseTopLevel(input) {
  const parts = splitTopLevelByDot(input.trim());
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
      const end = findMatchingParen(s, i);
      if (end < 0) throw new Error("Unmatched '(' in group");
      flushBuf();
      const nestedText = s.slice(i, end + 1);
      items.push(parseGroup(nestedText));
      i = end + 1;
      continue;
    }

    if (ch === ')') throw new Error("Unexpected ')' inside group");

    if (ch === '.') {
      flushBuf();  // delimiter only
      i++;
      continue;
    }

    if (ch === 'x' || ch === 'X') {
      flushBuf();      // split boundary before x
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

function findMatchingParen(s, openIdx) {
  let depth = 0;
  for (let i = openIdx; i < s.length; i++) {
    if (s[i] === '(') depth++;
    else if (s[i] === ')') {
      depth--;
      if (depth === 0) return i;
    }
  }
  return -1;
}

/* ---------------------
 * Evaluation (flatten)
 * --------------------- */

// Evaluate a single Element -> string[]
function evalElement(el) {
  if (typeof el === 'string') {
    // tokens (including "x") become singleton lists
    return el.length ? [el] : [];
  }
  // el is a Group
  return evalGroup(el);
}

// Evaluate a Group (concatenate evaluated items in order)
function evalGroup(group) {
  const out = [];
  for (const item of group.items) {
    const part = evalElement(item);
    if (part.length) out.push(...part);
  }
  return out;
}

// Evaluate the whole parsed top-level -> string[]
function evaluateTopLevel(groups) {
  const out = [];
  for (const g of groups) out.push(...evalGroup(g));
  return out;
}

/* ---------------------
 * Demos
 * --------------------- */

function demoEval(input) {
  const ast = parseTopLevel(input);
  const flat = evaluateTopLevel(ast);
  console.log(`Input: ${input}`);
  console.log(`Flat:  ${JSON.stringify(flat)}`);
}

// Your examples:
demoEval("(23.45).(67x)");     // -> ["23","45","67","x"]
demoEval("(45.12)");           // -> ["45","12"]
demoEval("(45x89.12)");        // -> ["45","x","89","12"]
demoEval("(12.x)");            // -> ["12"]

demoEval("(12...xx)");            // -> ["12xx"]


// Nested:
demoEval("((34.16).(7x)).(9)"); // -> ["34","16","7","x","9"]
