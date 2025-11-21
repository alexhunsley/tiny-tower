import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';
util.inspect.defaultOptions = { depth: null, maxArrayLength: null, breakLength: Infinity };

import {
  evaluateExpression
} from './newAlg.js';


////////////////////////////////////////////////
// mirror tests ('=' operator)

test('equals operator: parsing digit and non-digit stage chars', () => {
  assert.deepEqual(evaluateExpression('8|7=').pnTokens, ['27']);
  assert.deepEqual(evaluateExpression('0|1=').pnTokens, ['10']);
  assert.deepEqual(evaluateExpression('D|ET=').pnTokens, ['56ET']);
});

test('equals operator: x mirrors to x on any stage', () => {
  assert.deepEqual(evaluateExpression('4|x=').pnTokens, ['x']);
  assert.deepEqual(evaluateExpression('6|x=').pnTokens, ['x']);
  assert.deepEqual(evaluateExpression('8|x=').pnTokens, ['x']);
  assert.deepEqual(evaluateExpression('0|x=').pnTokens, ['x']);
  assert.deepEqual(evaluateExpression('T|x=').pnTokens, ['x']);
  assert.deepEqual(evaluateExpression('D|x=').pnTokens, ['x']);

  // shouldn't be using x on odd stages, but check it goes to 'x' anyway
  assert.deepEqual(evaluateExpression('5|x=').pnTokens, ['x']);
  assert.deepEqual(evaluateExpression('C|x=').pnTokens, ['x']);
});

test('equals operator: stage 12, single token 120 -> 1230ET', () => {
  assert.deepEqual(evaluateExpression('T|120=').pnTokens, ['1230ET']);
});

test('equals operator: stage 12, single token 36 -> 3670', () => {
  assert.deepEqual(evaluateExpression('T|36=').pnTokens, ['3670']);
});

test('equals operator: leaves right side unchanged (passes through)', () => {
  // Left: 36 -> 3670 (mirrored per stage 12); Right: "x" stays "x"

  // First '=' with empty right part due to ',', then ',' doubles acc and right.
  // We only assert the immediate '=' behavior by isolating it:
  assert.deepEqual(evaluateExpression('T|36=').pnTokens, ['3670']);
  // And check that ',' still composes with an unmodified right:
   // dot means simple concat of "x" segment after '=' result
  assert.deepEqual(evaluateExpression('T|36=.x').pnTokens, ['3670', 'x']);
});

test('equals operator: empty right is allowed', () => {
  assert.deepEqual(evaluateExpression('T|120=').pnTokens, ['1230ET']);
});

test('equals operator: mirror can go right to left', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('T|0ET=');
  assert.deepEqual(out, ['1230ET']);
});

test('equals operator: requires that stage is set', () => {
  assert.throws(() => evaluateExpression('1='), /'=' operator requires a valid stage/i);
  assert.throws(() => evaluateExpression('9.8='), /'=' operator requires a valid stage/i);
  
  assert.throws(() => evaluateExpression('120='), /'=' operator requires a valid stage/i);
});

test('equals operator: multiple tokens on left (applies per-token)', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('T|(12.36)=');
  assert.deepEqual(out, ['12ET', '3670']);
});

test('equals operator: works on 16', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('D|1236=');
  assert.deepEqual(out, ['1236EBCD']);
});

// for methods with internal symmetry, ',' and ';' are equivalent
test('equals operator: can make double eire minor using (=);', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('6|(3.1.3=);x');
  //34.16.34,x => 34.16.34.16.34.x
  assert.deepEqual(out, ['34', '16', '34', '16', '34', 'x']);
});

// for methods with internal symmetry, ',' and ';' are equivalent
test('equals operator: can make double eire minor using (=),', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluateExpression('6|(3.1.3=),x');
  //34.16.34,x => 34.16.34.16.34.x
  assert.deepEqual(out, ['34', '16', '34', '16', '34', 'x']);
});

