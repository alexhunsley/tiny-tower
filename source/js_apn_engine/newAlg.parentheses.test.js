/* ---------------------
 * parentheses operator tests
 * --------------------- */

import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';

util.inspect.defaultOptions = {depth: null, maxArrayLength: null, breakLength: Infinity};

import {
    evaluatePNAndStage, getStage
} from './newAlg.js';

test(`parentheses: throw when unmatched '('`, () => {
    assert.throws(() => evaluatePNAndStage('('));
    assert.throws(() => evaluatePNAndStage('()('));
    assert.throws(() => evaluatePNAndStage('(()'));
    assert.throws(() => evaluatePNAndStage('((12x)'));
});

test(`parentheses: throw when unmatched '['`, () => {
    assert.throws(() => evaluatePNAndStage('['));
    assert.throws(() => evaluatePNAndStage('[]['));
    assert.throws(() => evaluatePNAndStage('[[T]'));
});

test(`parentheses: throw when unmatched ')'`, () => {
    assert.throws(() => evaluatePNAndStage('[])).('));
    assert.throws(() => evaluatePNAndStage('[)]).('));
});

test(`parentheses: throw when unmatched ']'`, () => {
    assert.throws(() => evaluatePNAndStage('][x]'));
    assert.throws(() => evaluatePNAndStage('()][x]'));
});
