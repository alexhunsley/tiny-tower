
/* ----------------------------------------
 * 87s at back detection tests (odd stages) 
 * ---------------------------------------- */

import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';
util.inspect.defaultOptions = { depth: null, maxArrayLength: null, breakLength: Infinity };

import {
  measureTopPairDistances
} from './newAlg.js';

////// tenor dist measurement tests

// Helper: approx compare arrays of numbers
function approxEqualArray(actual, expected, eps = 1e-9) {
  assert.equal(actual.length, expected.length, 'length mismatch');
  for (let i = 0; i < actual.length; i++) {
    assert.ok(Math.abs(actual[i] - expected[i]) <= eps, `idx ${i}: ${actual[i]} ≉ ${expected[i]}`);
  }
}

test('stage 7: basic distribution for top two bells (7 & 6)', () => {
  const rows = [
    '1234567', // dist 1  (7@6, 6@5)
    '1234657', // dist 2  (7@6, 6@4)
    '1273456', // dist 4  (7@2, 6@6)
    '7123456', // dist 6  (7@0, 6@6)
    '1234567', // dist 1
  ];
  const out = measureTopPairDistances(7, rows);

  // Expect percentages over 5 rows
  const expected = [0, 40, 20, 0, 20, 0, 20];
  // Compare after rounding to whole percentages for readability
  const rounded = out.map(x => Math.round(x));
  assert.deepEqual(rounded, expected);

  // Also sanity: sum ≈ 100
  const sum = out.reduce((a, b) => a + b, 0);
  assert.ok(Math.abs(sum - 100) < 1e-9);
});

test('stage 12: uses E and T (top two), multiple separations', () => {
  // Alphabet slice(0,12) = "1234567890ET"  => highest=T, below=E
  const rows = [
    '1234567890ET', // dist 1  (T@11, E@10)
    '123456789E0T', // dist 2  (T@11, E@9)
    'T123456789E0', // dist 10 (T@0,  E@10)
  ];
  const out = measureTopPairDistances(12, rows);

  // Expect 3 distances each 1/3 of rows: indices 1, 2, 10 -> 33.333...%
  const expectedSpots = { 1: 1/3*100, 2: 1/3*100, 10: 1/3*100 };
  approxEqualArray(
    out.map((p, i) => (expectedSpots[i] ?? 0)),
    out,
    1e-6
  );

  // Quick checks:
  assert.ok(out[1] > 33 && out[1] < 34);
  assert.ok(out[2] > 33 && out[2] < 34);
  assert.ok(out[10] > 33 && out[10] < 34);
});

test('empty rows returns all zeros', () => {
  const out = measureTopPairDistances(8, []);
  assert.equal(out.length, 8);
  assert.ok(out.every(x => x === 0));
});
