
/* ---------------------
 * comma operator tests
 * --------------------- */

import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';
util.inspect.defaultOptions = { depth: null, maxArrayLength: null, breakLength: Infinity };

import {
  evaluatePNAndStage,
  getStage
} from './newAlg.js';

test('comma operator: typical paldindromic use', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('1x45.89,29');
  // left: ["1","x","45","89"] -> doubled: ["1","x","45","89","45","x","1"]
  // right: ["29"] -> len<=1 -> no-op
  assert.deepEqual(out, ['1','x','45','89','45','x','1','29']);
});

test('comma operator: paldindromic use with length one item on left (like Grandsire)', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('3,1.5.1');
  // left: ["1","x","45","89"] -> doubled: ["1","x","45","89","45","x","1"]
  // right: ["29"] -> len<=1 -> no-op
  assert.deepEqual(out, ['3', '1', '5', '1', '5', '1']);
});

// this fails, as I suspected it would.
// In conventional PN I'm not sure if multiple commas is defined?
// do I need something different to comma?
// RWS crashes on multiple commas.
// complib replaces all commas after first one with '.' before any other processing.
// 
// It would be perfectly meaningful to say that multiple commas just apply the reversal
// to all parts, without applying double-reversal to bits not at the end.
// i.e. this test would pass.
// test('comma operator: simple two commas with stuff between', () => {
//   const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('3,7.5,1');
//   // left: ["1","x","45","89"] -> doubled: ["1","x","45","89","45","x","1"]
//   // right: ["29"] -> len<=1 -> no-op
//   assert.deepEqual(out, ['3',   '7', '5', '7',   '1']);
// });

test('comma operator with empty left', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage(',29');
  assert.deepEqual(out, ['29']);
});

test('comma operator with empty right', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('12.34,');
  // left doubled: ["12","34","12"]
  assert.deepEqual(out, ['12','34','12']);
});

test('comma operator both sides multi + slices per side', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('(a.b.c)[1:3],(x.y)[-]');
  // left base -> ["b","c"] -> doubled -> ["b","c","b"]
  // right base -> ["y","x"] (reverse) -> len>1 -> ["y","x","y"]
  assert.deepEqual(out, ['b','c','b','y','x','y']);
});

test('multiple symmetry operators at same level throws', () => {
  // ((a , b) , c)
  // const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('a,b,c');
  assert.throws(() => evaluatePNAndStage('a,b,c'));
});

test('comma respects low precedence vs dots and slices', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
});

test('pipe to set stage does not break processing', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('6|(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
  assert.equal(getStage(), 6);
});

test('pipe to set stage does not break processing 2', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('5|(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2', '5']);
  assert.equal(getStage(), 5);
});

test('pipe to set stage: >1 char throws error', () => {
  assert.throws(() => evaluatePNAndStage('1E|'), /Couldn't parse stage/i);
  assert.throws(() => evaluatePNAndStage('51|x='), /Couldn't parse stage/i);
  assert.throws(() => evaluatePNAndStage('51E|x='), /Couldn't parse stage/i);
  assert.throws(() => evaluatePNAndStage('51Efdjrghdfs|x='), /Couldn't parse stage/i);
});

test('pipe to set stage: unrecognized place char throws error', () => {
  assert.throws(() => evaluatePNAndStage('x|'), /Couldn't parse stage/i);
  assert.throws(() => evaluatePNAndStage('z|'), /Couldn't parse stage/i);
});

test('consecutive commas at same level throws', () => {
  assert.throws(() => evaluatePNAndStage('1.2.45,,'));
  assert.throws(() => evaluatePNAndStage(',,'));
  assert.throws(() => evaluatePNAndStage(',,1.2.45'));
  assert.throws(() => evaluatePNAndStage('3,,1.2'));
});

test('double comma with brackets', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('(1.2.45,),');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1',  '2', '45', '2', '1' ]);
});

test('double comma with brackets either side', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('(1.2.45,),(6.8.34)');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6' ]);
});

test('double comma with brackets either side', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('(1.2.45,),(6.8.34,)');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6', '8', '34', '8', '6' ]);
});
