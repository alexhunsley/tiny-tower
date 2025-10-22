// newAlg.test.js
const test = require('node:test');
const assert = require('node:assert/strict');
const {
  parseTopLevel,
  evaluateTopLevel,
  tokenizeFlat,
  evaluateExpression,
  getStage,
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
  const out = evaluateExpression('23.78x1289[1:3]');
  assert.deepEqual(out, ['78', 'x']);
});

test('postfix slice with negative end index -1', () => {
  const out = evaluateExpression('23.78x1289[:-1]');
  assert.deepEqual(out, ['23', '78', 'x']);
});

test('postfix slice with negative end index -2', () => {
  const out = evaluateExpression('23.78x1289[:-2]');
  assert.deepEqual(out, ['23', '78']);
});

test('postfix slice with end < start', () => {
  const out = evaluateExpression('23.78x1289[2:1]');
  assert.deepEqual(out, ['x', '78']);
});

test('postfix slice with end < start 2', () => {
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
  assert.deepEqual(out, ['b', 'a', 'c']);
});

test('chained postfix slices', () => {
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
  const out = evaluateExpression('12.x.34[:2]');
  assert.deepEqual(out, ['12', 'x']);
});

/* ---------------------
 * comma operator tests
 * --------------------- */

test('comma operator: example from spec', () => {
  const out = evaluateExpression('1x45.89,29');
  // left: ["1","x","45","89"] -> doubled: ["1","x","45","89","45","x","1"]
  // right: ["29"] -> len<=1 -> no-op
  assert.deepEqual(out, ['1','x','45','89','45','x','1','29']);
});

test('comma operator with empty left', () => {
  const out = evaluateExpression(',29');
  assert.deepEqual(out, ['29']);
});

test('comma operator with empty right', () => {
  const out = evaluateExpression('12.34,');
  // left doubled: ["12","34","12"]
  assert.deepEqual(out, ['12','34','12']);
});

test('comma operator both sides multi + slices per side', () => {
  const out = evaluateExpression('(a.b.c)[1:3],(x.y)[-]');
  // left base -> ["b","c"] -> doubled -> ["b","c","b"]
  // right base -> ["y","x"] (reverse) -> len>1 -> ["y","x","y"]
  assert.deepEqual(out, ['b','c','b','y','x','y']);
});

test('comma chaining is left-associative', () => {
  // ((a , b) , c)
  const out = evaluateExpression('a,b,c');
  // a -> ["a"] (no-op), b -> ["b"] (no-op) => ["a","b"]
  // then with c -> left ["a","b"] doubled -> ["a","b","a"]
  // right ["c"] -> ["c"]
  assert.deepEqual(out, ['a','b','a','c']);
});

test('comma respects low precedence vs dots and slices', () => {
  const out = evaluateExpression('(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
});

test('pipe to set stage does not break processing', () => {
  const out = evaluateExpression('6|(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
  assert.equal(getStage(), 6);
});

test('pipe to set stage does not break processing 2', () => {
  const out = evaluateExpression('5|(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
  assert.equal(getStage(), 5);
});

test('double comma', () => {
  const out = evaluateExpression('1.2.45,,');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1',   '2', '45', '2', '1' ]);
});

test('double comma with brackets', () => {
  const out = evaluateExpression('(1.2.45,),');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1',  '2', '45', '2', '1' ]);
});

test('double comma with brackets either side', () => {
  const out = evaluateExpression('(1.2.45,),(6.8.34)');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6' ]);
});

test('double comma with brackets either side', () => {
  const out = evaluateExpression('(1.2.45,),(6.8.34,)');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6', '8', '34', '8', '6' ]);
});
