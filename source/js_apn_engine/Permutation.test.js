//////////////////////////////////////////////////////
// permutation cycles (differential detection, etc.)

import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';

import {Perm} from './Permutation.js';

util.inspect.defaultOptions = {depth: null, maxArrayLength: null, breakLength: Infinity};

////////////////////////////////////////////////
// perm cycle tests (differential detection)

test('example: "234561" → ["654321"], period 6', () => {
    let p = Perm.fromOneLine('234561');
    assert.deepEqual(p.cycles, ['654321']);
    assert.equal(p.period(), 6);
});

test('example: "345612" → ["531", "642"], period 6', () => {
    let p = Perm.fromOneLine('345612');
    assert.deepEqual(p.cycles, ['531', '642']);
    assert.equal(p.period(), 3);
});

// // TODO only assert on lexicographic equals (i.e. sort both strings same lexicographic order, then assert equals)
test('example: "612345" → ["654321"], period 6', () => {
    let p = Perm.fromOneLine('612345');
    assert.deepEqual(p.cycles, ['234561']);
    assert.equal(p.period(), 6);
});

test('example: "21453" → ["12","543"], period 6', () => {
    let p = Perm.fromOneLine('21453');
    assert.deepEqual(p.cycles, ['21', '543']);
    assert.equal(p.period(), 6);
});


test('identity permutation returns singletons; period 1', () => {
    let p = Perm.fromOneLine('12345');
    assert.deepEqual(p.cycles, ['1','2','3','4','5']);
    assert.equal(p.period(), 1);
});

test('reverse permutation "54321" → ["51","42","3"]; period 2', () => {
    let p = Perm.fromOneLine('54321');
    assert.deepEqual(p.cycles, ['51','42','3']);
    assert.equal(p.period(), 2);
});

test('reverse permutation with non-numeric chars "DCBATE0987654321" → ["1D", "2C", "3B", "4A", "5T", "6E", "70", "89"]; period 2', () => {
    let p = Perm.fromOneLine('DCBATE0987654321');
    assert.deepEqual(p.cycles, ['D1', 'C2', 'B3', 'A4', 'T5', 'E6', '07', '98']);
    assert.equal(p.period(), 2);
});

test('large LCM: cycles (12)(345)(6789) → period 12', () => {
    let p = Perm.fromOneLine('214537896');
    assert.deepEqual(p.cycles, ['21','543','9876']);
    assert.equal(p.period(), 12);
});

test('custom/extended alphabet: rotation on first 12 symbols "1234567890ET"', () => {
    // use L instead of 1 in the alphabet
    const explicitAlphabet = 'L234567890ET';
    let p = Perm.fromOneLine('234567890ETL', explicitAlphabet);
    assert.deepEqual(p.cycles, ['TE098765432L']);
    assert.equal(p.period(), 12);
});

test('invalid: not a permutation (duplicate symbol)', () => {
  assert.throws(() => Perm.fromOneLine('1123'), /not a permutation/i);
});

test('invalid: symbol not in subset (n too small)', () => {
  // n=4 so subset is "1234"; 'E' is invalid here
  assert.throws(() => Perm.fromOneLine('12E3'), /Invalid symbol/i);
});

// // Optional: ensure extended rounds alphabet is respected when globally defined
test('criteria for differential detection behave as expected (oneLine inputs)', () => {

    // all hunts bells should be considered differential
    assert.equal(Perm.fromOneLine('12345').isConsideredDifferential(), true);

    // one hunt bells and full cycle is not differential
    assert.equal(Perm.fromOneLine('13452').isConsideredDifferential(), false);

    // two hunt bells and full cycle is not differential
    assert.equal(Perm.fromOneLine('12453').isConsideredDifferential(), false);

    // three hunt bells and full cycle is not differential
    assert.equal(Perm.fromOneLine('12354').isConsideredDifferential(), false);

});

test('criteria for differential detection behave as expected (cycle inputs)', () => {

    assert.equal(Perm(["12345"]).isConsideredDifferential(), false);
    assert.equal(Perm(["2345", "1"]).isConsideredDifferential(), false);

    assert.equal(Perm(["534", "1", "2"]).isConsideredDifferential(), false);
    assert.equal(Perm(["54", "1", "2", "3"]).isConsideredDifferential(), false);
    assert.equal(Perm(["123", "45"]).isConsideredDifferential(), true);

    assert.equal(Perm(["123", "45", "6", "7", "8"]).isConsideredDifferential(), true);

    // cycles all being 1 is considered a differential
    assert.equal(Perm(["6", "7", "8"]).isConsideredDifferential(), true);

    // single cycle of length 1 is NOT considered a differential
    assert.equal(Perm(["1"]).isConsideredDifferential(), false);

    // two cycles of length 1 are considered a differential
    assert.equal(Perm(["1", "2"]).isConsideredDifferential(), true);
});
