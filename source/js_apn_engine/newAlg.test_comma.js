
/* ---------------------
 * comma operator tests
 * --------------------- */

import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';
util.inspect.defaultOptions = { depth: null, maxArrayLength: null, breakLength: Infinity };

import {
  evaluateExpression,
  getStage
} from './newAlg.js';

test('comma operator: example from spec', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('1x45.89,29');
  // left: ["1","x","45","89"] -> doubled: ["1","x","45","89","45","x","1"]
  // right: ["29"] -> len<=1 -> no-op
  assert.deepEqual(out, ['1','x','45','89','45','x','1','29']);
});

test('comma operator with empty left', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression(',29');
  assert.deepEqual(out, ['29']);
});

test('comma operator with empty right', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('12.34,');
  // left doubled: ["12","34","12"]
  assert.deepEqual(out, ['12','34','12']);
});

test('comma operator both sides multi + slices per side', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(a.b.c)[1:3],(x.y)[-]');
  // left base -> ["b","c"] -> doubled -> ["b","c","b"]
  // right base -> ["y","x"] (reverse) -> len>1 -> ["y","x","y"]
  assert.deepEqual(out, ['b','c','b','y','x','y']);
});

test('comma chaining is left-associative', () => {
  // ((a , b) , c)
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('a,b,c');
  // a -> ["a"] (no-op), b -> ["b"] (no-op) => ["a","b"]
  // then with c -> left ["a","b"] doubled -> ["a","b","a"]
  // right ["c"] -> ["c"]
  assert.deepEqual(out, ['a','b','a','c']);
});

test('comma respects low precedence vs dots and slices', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
});

test('pipe to set stage does not break processing', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('6|(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
  assert.equal(getStage(), 6);
});

test('pipe to set stage does not break processing 2', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('5|(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2', '5']);
  assert.equal(getStage(), 5);
});

test('pipe to set stage: >1 char throws error', () => {
  assert.throws(() => evaluateExpression('1E|'), /Couldn't parse stage/i);
  assert.throws(() => evaluateExpression('51|x='), /Couldn't parse stage/i);
  assert.throws(() => evaluateExpression('51E|x='), /Couldn't parse stage/i);
  assert.throws(() => evaluateExpression('51Efdjrghdfs|x='), /Couldn't parse stage/i);
});

test('pipe to set stage: unrecognized place char throws error', () => {
  assert.throws(() => evaluateExpression('x|'), /Couldn't parse stage/i);
  assert.throws(() => evaluateExpression('z|'), /Couldn't parse stage/i);
});

test('double comma', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('1.2.45,,');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1',   '2', '45', '2', '1' ]);
});

test('double comma with brackets', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(1.2.45,),');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1',  '2', '45', '2', '1' ]);
});

test('double comma with brackets either side', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(1.2.45,),(6.8.34)');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6' ]);
});

test('double comma with brackets either side', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('(1.2.45,),(6.8.34,)');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6', '8', '34', '8', '6' ]);
});
