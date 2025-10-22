// newAlg.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseTopLevel,
  evaluateTopLevel,
  tokenizeFlat,
  evaluateExpression,
  _internals
} = require('./newAlg.js');

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

  // NOTE: 'x' is both a token and a delimiter
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
  assert.throws(() => parseTopLevel('(12.34'), /Unmatched/);
  assert.throws(() => parseTopLevel('(12.(34)'), /Unmatched/);
  assert.throws(() => parseTopLevel(')'), /Unmatched/);
});

/* ---------------------
 * slice postfix tests
 * --------------------- */

test('postfix slice on flat expr', () => {
  // Base list: ["23","78","x","1289"]
  const out = evaluateExpression('23.78x1289[1:3]');
  assert.deepEqual(out, ['78', 'x']); // slice 1..3 (exclusive stop)
});

test('postfix slice with negative end index -1', () => {
  // Base list: ["23","78","x","1289"]
  const out = evaluateExpression('23.78x1289[:-1]');
  assert.deepEqual(out, ['23', '78', 'x']);
});

test('postfix slice with negative end index -2', () => {
  // Base list: ["23","78","x","1289"]
  const out = evaluateExpression('23.78x1289[:-2]');
  assert.deepEqual(out, ['23', '78']);
});

test('postfix slice with end < start', () => {
  // Base list: ["23","78","x","1289"]
  const out = evaluateExpression('23.78x1289[2:1]');
  assert.deepEqual(out, ['x', '78']);
});

test('postfix slice with end < start 2', () => {
  // Base list: ["23","78","x","1289"]
  const out = evaluateExpression('23.78x1289[2:0]');
  assert.deepEqual(out, ['x', '78', '23']);
});

test('postfix reverse slice [-]', () => {
  const out = evaluateExpression('(1.2.3.4)[-]');
  assert.deepEqual(out, ['4', '3', '2', '1']);
});

test('postfix circular forward [i:>k]', () => {
  const out = evaluateExpression('(a.b.c.d)[2:>3]');
  assert.deepEqual(out, ['c', 'd', 'a']);
});

test('postfix circular backward [i:<]', () => {
  const out = evaluateExpression('(a.b.c)[1:<]');
  // full backward rotation from index 1: [b, a, c]
  assert.deepEqual(out, ['b', 'a', 'c']);
});

test('chained postfix slices', () => {
  // Start: ["1","2","3","4","5"]
  // [1:4] -> ["2","3","4"]
  // then [-] -> ["4","3","2"]
  const out = evaluateExpression('(1.2.3.4.5)[1:4][-]');
  assert.deepEqual(out, ['4', '3', '2']);
});

test('chained postfix slices double negative', () => {
  const out = evaluateExpression('(1.2.3.4.5)[1:4][-][-]');
  assert.deepEqual(out, ['2', '3', '4']);
});

test('chained postfix slices double negative with slice in between', () => {
  const out = evaluateExpression('(1.2.3.4.5)[-][1:3][-]');
  assert.deepEqual(out, ['3', '4']);
});

test('postfix slice respects x as token+delimiter', () => {
  // Base: "12.x.34" -> ["12","x","34"]
  const out = evaluateExpression('12.x.34[:2]');
  assert.deepEqual(out, ['12', 'x']);
});
