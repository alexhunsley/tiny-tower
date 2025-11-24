/* ---------------------
 * multiplier N(<expr>) tests
 * --------------------- */

import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';

util.inspect.defaultOptions = {depth: null, maxArrayLength: null, breakLength: Infinity};

import {
    evaluatePNAndStage, getStage
} from './newAlg.js';

test('multiplier: basic repetition', () => {
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('3(12.56)');
    assert.deepEqual(out, ['12', '56', '12', '56', '12', '56']);
});

test('multiplier: applies before per-segment slice', () => {
    // 2 * (1.2.3) => [1,2,3,1,2,3], then [1:3] => [2,3]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('2(1.2.3)[1:3]');
    assert.deepEqual(out, ['2', '3']);
});

test('multiplier: left of comma (comma doubles AFTER multiplier+slice)', () => {
    // left: 2(1.2) => [1,2,1,2] ; right: 3
    // comma result = doubleUp(left) ++ doubleUp([3])
    // doubleUp(left): [1,2,1,2,1,2,1]
    // doubleUp([3]) is just [3]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('2(1.2),3');
    assert.deepEqual(out, ['1', '2', '1', '2', '1', '2', '1', '3']);
});

test('multiplier: left of semicolon with stage=6 (invert tail items)', () => {
    // left: 2(12) => ["12","12"]
    // ';' tail = ["12"] inverted@6 => "56"
    // result: ["12","12","56"]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('6|2(12);');
    assert.deepEqual(out, ['12', '12', '56']);
});

test('multiplier: nested multipliers', () => {
    // 2(3(1)) => 2 * [1,1,1] => [1,1,1,1,1,1]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('2(3(1))');
    assert.deepEqual(out, ['1', '1', '1', '1', '1', '1']);
});

test('multiplier inside parentheses alongside another multiplied segment', () => {
    // (2(1.2).3(4.5)) => [1,2,1,2,4,5,4,5,4,5]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('(2(1.2).3(4.5))');
    assert.deepEqual(out, ['1', '2', '1', '2', '4', '5', '4', '5', '4', '5']);
});

test('multiplier with slice and comma precedence', () => {
    // 3(1.2)[-],3
    // left: 3*(1,2) => [1,2,1,2,1,2] then reverse [-] => [2,1,2,1,2,1]
    // comma doubles left then appends right (single element)
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('3(1.2)[-],3');
    assert.deepEqual(out, ['2', '1', '2', '1', '2', '1', '2', '1', '2', '1', '2', '3']);
});

test('multiplier with per-segment slice in the middle of dot chain', () => {
    // (1.2).2(3.4)[1:3].(5) =>
    // segment1: [1,2]
    // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
    // segment3: [5]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('(1.2).2(3.4)[1:3].(5)');
    assert.deepEqual(out, ['1', '2', '4', '3', '5']);
});


test('two times PB4 minus 1 notate at end, plus something else', () => {
    // (1.2).2(3.4)[1:3].(5) =>
    // segment1: [1,2]
    // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
    // segment3: [5]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('4|2(x14x14x14x12)[:-1].1234');
    assert.deepEqual(out, ['x', '14', 'x', '14', 'x', '14', 'x', '12', 'x', '14', 'x', '14', 'x', '14', 'x', '1234']);
});

test('two times PB4 (as palindrome) minus 1 notate at end, plus something else', () => {
    // (1.2).2(3.4)[1:3].(5) =>
    // segment1: [1,2]
    // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
    // segment3: [5]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('4|2(x14x14,12)[:-1].1234');
    assert.deepEqual(out, ['x', '14', 'x', '14', 'x', '14', 'x', '12', 'x', '14', 'x', '14', 'x', '14', 'x', '1234']);
});

test('two times double PB4 (as ,,) minus 1 notate at end, plus something else', () => {
    // (1.2).2(3.4)[1:3].(5) =>
    // segment1: [1,2]
    // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
    // segment3: [5]
    const {pnTokens: out, resolvedStage: stageFromPipe} = evaluatePNAndStage('4|2(((x14,).34),12)[:-1].1234');
    assert.deepEqual(out, ['x', '14', 'x', '34', 'x', '14', 'x', '12', 'x', '14', 'x', '34', 'x', '14', 'x', '1234']);
});
