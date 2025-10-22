// newAlg.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const { parseTopLevel, evaluateTopLevel, tokenizeFlat } = require('./newAlg.js');

test('basic bracketed examples', () => {
  {
    const ast = parseTopLevel('(23.45).(67x)');
    const out = evaluateTopLevel(ast);
    assert.deepEqual(out, ['23', '45', '67', 'x']);
  }

  {
    const ast = parseTopLevel('(45.12)');
    const out = evaluateTopLevel(ast);
    assert.deepEqual(out, ['45', '12']);
  }

  {
    const ast = parseTopLevel('(45x89.12)');
    const out = evaluateTopLevel(ast);
    assert.deepEqual(out, ['45', 'x', '89', '12']);
  }

  {
    const ast = parseTopLevel('(12.x)');
    const out = evaluateTopLevel(ast);
    assert.deepEqual(out, ['12', 'x']);
  }
});

test('nested example', () => {
  const ast = parseTopLevel('((34.16).(7x)).(9)');
  const out = evaluateTopLevel(ast);
  assert.deepEqual(out, ['34', '16', '7', 'x', '9']);
});

test('flat tokenizer: "12.34.....xx87x.x"', () => {
  const out = tokenizeFlat('12.34.....xx87x.x');
  assert.deepEqual(out, ['12', '34', 'x', 'x', '87', 'x', 'x']);
});

test('throws on unmatched parentheses', () => {
  // Now this will trip validateParens() first and match /Unmatched/
  assert.throws(() => parseTopLevel('(12.34'), /Unmatched/);

  // Also verify nested unmatched inside a group triggers "Unmatched"
  assert.throws(() => parseTopLevel('(12.(34)'), /Unmatched/);

  // And unmatched closing paren
  assert.throws(() => parseTopLevel(')'), /Unmatched/);

  assert.throws(() => parseTopLevel('18)'), /Unmatched/);

  assert.throws(() => parseTopLevel(')12'), /Unmatched/);
});

