import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';
util.inspect.defaultOptions = { depth: null, maxArrayLength: null, breakLength: Infinity };

import {
  evaluatePNAndStage
} from './newAlg.js';


////////////////////////////////////////////////
// mirror tests ('=' operator)

test('equals operator: parsing digit and non-digit stage chars', () => {
  assert.deepEqual(evaluatePNAndStage('8|7=').pnTokens, ['27']);
  assert.deepEqual(evaluatePNAndStage('0|1=').pnTokens, ['10']);
  assert.deepEqual(evaluatePNAndStage('D|ET=').pnTokens, ['56ET']);
});

test('equals operator: x mirrors to x on any stage', () => {
  assert.deepEqual(evaluatePNAndStage('4|x=').pnTokens, ['x']);
  assert.deepEqual(evaluatePNAndStage('6|x=').pnTokens, ['x']);
  assert.deepEqual(evaluatePNAndStage('8|x=').pnTokens, ['x']);
  assert.deepEqual(evaluatePNAndStage('0|x=').pnTokens, ['x']);
  assert.deepEqual(evaluatePNAndStage('T|x=').pnTokens, ['x']);
  assert.deepEqual(evaluatePNAndStage('D|x=').pnTokens, ['x']);

  // shouldn't be using x on odd stages, but check it goes to 'x' anyway
  assert.deepEqual(evaluatePNAndStage('5|x=').pnTokens, ['x']);
  assert.deepEqual(evaluatePNAndStage('C|x=').pnTokens, ['x']);
});

test('equals operator: stage 12, single token 120 -> 1230ET', () => {
  assert.deepEqual(evaluatePNAndStage('T|120=').pnTokens, ['1230ET']);
});

test('equals operator: stage 12, single token 36 -> 3670', () => {
  assert.deepEqual(evaluatePNAndStage('T|36=').pnTokens, ['3670']);
});

test('equals operator: leaves right side unchanged (passes through)', () => {
  // Left: 36 -> 3670 (mirrored per stage 12); Right: "x" stays "x"

  // dot after = still works
  assert.deepEqual(evaluatePNAndStage('T|36=.x').pnTokens, ['3670', 'x']);
});

test('equals operator: 2nd, 3rd ones have no extra effect', () => {
    assert.deepEqual(evaluatePNAndStage('T|(36=)=').pnTokens, ['3670']);
    assert.deepEqual(evaluatePNAndStage('6|(1=)=').pnTokens, ['16']);

    assert.deepEqual(evaluatePNAndStage('T|((36=)=)=').pnTokens, ['3670']);
    assert.deepEqual(evaluatePNAndStage('6|((1=)=)=').pnTokens, ['16']);
});

test('equals operator: empty right is allowed', () => {
  assert.deepEqual(evaluatePNAndStage('T|120=').pnTokens, ['1230ET']);
});

test('equals operator: mirror can go right to left', () => {
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('T|0ET=');
  assert.deepEqual(out, ['1230ET']);
});

test('equals operator: requires that stage is set', () => {
  assert.throws(() => evaluatePNAndStage('1='), /'=' operator requires a valid stage/i);
  assert.throws(() => evaluatePNAndStage('9.8='), /'=' operator requires a valid stage/i);
  
  assert.throws(() => evaluatePNAndStage('120='), /'=' operator requires a valid stage/i);
});

test('equals operator: multiple tokens on left (applies per-token)', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('T|(12.36)=');
  assert.deepEqual(out, ['12ET', '3670']);
});

test('equals operator: works on 16', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('D|1236=');
  assert.deepEqual(out, ['1236EBCD']);
});

// for methods with internal symmetry, ',' and ';' are equivalent
test('equals operator: can make double eire minor using (=);', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('6|(3.1.3=);x');
  //34.16.34,x => 34.16.34.16.34.x
  assert.deepEqual(out, ['34', '16', '34', '16', '34', 'x']);
});

// for methods with internal symmetry, ',' and ';' are equivalent
test('equals operator: can make double eire minor using (=),', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('6|(3.1.3=),x');
  //34.16.34,x => 34.16.34.16.34.x
  assert.deepEqual(out, ['34', '16', '34', '16', '34', 'x']);
});

