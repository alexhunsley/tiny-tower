//////////////////////////////////
// perm cycles (differential detection, etc.)

/**
 * derivePermCycles("21453") -> { cycles: ["12", "345"], period: 6 }
 * The permutation string is a one-line image of the first n symbols of `alphabet`.
 * Position i (1-based) maps to the symbol at oneLine[i-1], which must be among the first n symbols.
 */

import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';
import {
    evaluatePNAndStage, derivePermCycles, arePermCyclesConsideredDifferential
} from './newAlg.js';

util.inspect.defaultOptions = {depth: null, maxArrayLength: null, breakLength: Infinity};

////////////////////////////////////////////////
// perm cycle tests (differential detection)

// test('identity is detected with period 1 and returns every char as separate cycle in one-char strings', () => {
//   const { cycles, period } = derivePermCycles('123456');
//   // for identity no-perm, each char is in its own separate cycle in the list
//     assertAllEqualCanon(cycles, ['1', '2', '3', '4', '5', '6']);
//   assert.equal(period, 1);
// });

test('example: "234561" → ["654321"], period 6', () => {
    const {cycles, period} = derivePermCycles('234561');
    assert.deepEqual(cycles, ['654321']);
    assert.equal(period, 6);
});

test('example: "345612" → ["631", "642"], period 6', () => {
    const {cycles, period} = derivePermCycles('345612');
    assert.deepEqual(cycles, ['531', '642']);
    assert.equal(period, 3);
});

// TODO only assert on lexicographic equals (i.e. sort both strings same lexicographic order, then assert equals)
test('example: "612345" → ["654321"], period 6', () => {
    const {cycles, period} = derivePermCycles('612345');
    assert.deepEqual(cycles, ['234561']);
    assert.equal(period, 6);
});

// /**
//  * Assert that `value` and every string in `list` are equal **after applying `fn`**.
//  *
//  * @param {string} value       The reference string
//  * @param {string[]} list      Strings to compare against
//  * @param {Function} fn        Transform function applied to both sides
//  */
// export function assertAllEqualTransformed(value, list, fn) {
//     const mappedValue = fn(value);
//     for (const s of list) {
//         console.log("input, mapped = ", mappedValue, fn(s));
//         assert.deepEqual(mappedValue, fn(s));
//     }
// }
//
// export function assertAllEqualCanon(value, list) {
//     return assertAllEqualTransformed(value, list, canonicalRotation)
// }

// test('example: "21453" → ["12","354"], period 6', () => {
//   const { cycles, period } = derivePermCycles('21453');
//   assert.deepEqual(cycles, ['12', '354']);
//   assert.equal(period, 6);
// });

//
// test('identity permutation returns singletons; period 1', () => {
//   const { cycles, period } = derivePermCycles('12345');
//   assert.deepEqual(cycles, ['1','2','3','4','5']);
//   assert.equal(period, 1);
// });
//
// test('reverse permutation "54321" → ["15","24","3"]; period 2', () => {
//   const { cycles, period } = derivePermCycles('54321');
//   assert.deepEqual(cycles, ['15','24','3']);
//   assert.equal(period, 2);
// });
//
// test('reverse permutation with non-numeric chars "DCBATE0987654321" → ["1D", "2C", "3B", "4A", "5T", "6E", "70", "89"]; period 2', () => {
//   const { cycles, period } = derivePermCycles('DCBATE0987654321');
//   assert.deepEqual(cycles, ['1D', '2C', '3B', '4A', '5T', '6E', '70', '89']);
//   assert.equal(period, 2);
// });
//
// test('large LCM: cycles (12)(345)(6789) → period 12', () => {
//   // Images: 1→2,2→1,3→4,4→5,5→3,6→7,7→8,8→9,9→6
//   const { cycles, period } = derivePermCycles('214537896');
//   assert.deepEqual(cycles, ['12','345','6789']);
//   assert.equal(period, 12);
// });
//
// test('custom/extended alphabet: rotation on first 12 symbols "1234567890ET"', () => {
//   // Use a rotation by +1: 1→2, 2→3, ... T→1
//   const alphabet = '1234567890ET';
//   const oneLine = '234567890ET1';
//   const { cycles, period } = derivePermCycles(oneLine, alphabet);
//   assert.deepEqual(cycles, [alphabet]);  // single 12-cycle
//   assert.equal(period, 12);
// });
//
// test('invalid: not a permutation (duplicate symbol)', () => {
//   assert.throws(() => derivePermCycles('1123'), /not a permutation/i);
// });
//
// test('invalid: symbol not in subset (n too small)', () => {
//   // n=4 so subset is "1234"; 'E' is invalid here
//   assert.throws(() => derivePermCycles('12E3'), /Invalid symbol/i);
// });

// Optional: ensure extended rounds alphabet is respected when globally defined
test('criteria for differential detection behave as expected', () => {
    // no cycles is considered no-differential
    assert.equal(arePermCyclesConsideredDifferential([]), false);

    assert.equal(arePermCyclesConsideredDifferential(["12345"]), false);
    assert.equal(arePermCyclesConsideredDifferential(["2345", "1"]), false);

    assert.equal(arePermCyclesConsideredDifferential(["534", "1", "2"]), false);
    assert.equal(arePermCyclesConsideredDifferential(["54", "1", "2", "3"]), false);

    assert.equal(arePermCyclesConsideredDifferential(["123", "45"]), true);
    assert.equal(arePermCyclesConsideredDifferential(["123", "45", "6", "7", "8"]), true);

    // cycles all being 1 is considered a differential
    assert.equal(arePermCyclesConsideredDifferential(["6", "7", "8"]), true);

    // single cycle of length 1 is NOT considered a differential
    assert.equal(arePermCyclesConsideredDifferential(["1"]), false);

    // two cycles of length 1 are considered a differential
    assert.equal(arePermCyclesConsideredDifferential(["1", "2"]), true);
});

