/* ---------------------
 * slice postfix tests
 * --------------------- */

const test = require('node:test');
const assert = require('node:assert/strict');

const util = require('node:util');
util.inspect.defaultOptions = { depth: null, maxArrayLength: null, breakLength: Infinity };

const {
  evaluateExpression
} = require('./newAlg.js');

test('postfix slice on flat expr', () => {
  const {pnTokens: out, resolvedStage} = evaluateExpression('23.78x1289[1:3]');
  assert.deepEqual(out, ['78', 'x']);
});

test('postfix slice with negative end index -1', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('23.78x1289[:-1]');
  assert.deepEqual(out, ['23', '78', 'x']);
  // assert.deepEqual(stageFromPipe, null);
});

test('postfix slice with negative end index -2', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('23.78x1289[:-2]');
  assert.deepEqual(out, ['23', '78']);
});

test('postfix slice with end < start', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('23.78x1289[2:1]');
  assert.deepEqual(out, ['x', '78']);
});

test('postfix slice with end < start 2', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('23.78x1289[2:0]');
  assert.deepEqual(out, ['x', '78', '23']);
});

test('postfix reverse slice [-]', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(1.2.3.4)[-]');
  assert.deepEqual(out, ['4', '3', '2', '1']);
});

test('postfix circular forward [i:>k]', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(a.b.c.d)[2:>3]');
  assert.deepEqual(out, ['c', 'd', 'a']);
});

test('postfix circular backward [i:<]', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(a.b.c)[1:<]');
  assert.deepEqual(out, ['b', 'a', 'c']);
});

test('chained postfix slices', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(1.2.3.4.5)[1:4][-]');
  assert.deepEqual(out, ['4', '3', '2']);
});

test('chained postfix slices double negative', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(1.2.3.4.5)[1:4][-][-]');
  assert.deepEqual(out, ['2', '3', '4']);
});

test('chained postfix slices double negative with slice in between', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(1.2.3.4.5)[-][1:3][-]');
  assert.deepEqual(out, ['3', '4']);
});

test('postfix slice respects x as token+delimiter', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('12.x.34[:2]');
  assert.deepEqual(out, ['12', 'x']);
});
