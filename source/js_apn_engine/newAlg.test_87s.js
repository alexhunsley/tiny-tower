
/* ----------------------------------------
 * 87s at back detection tests (odd stages) 
 * ---------------------------------------- */

import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';
util.inspect.defaultOptions = { depth: null, maxArrayLength: null, breakLength: Infinity };

import {
  count87s
} from './newAlg.js';

test('count87s identifies bum music at backstroke', () => {
  assert.equal(count87s(["12345678", "12345687", "12345687", "12345678", "12345687", "12345678"], 8), 2);
});

test('count87s ignores bum music at handstroke', () => {
  assert.equal(count87s(["12345678", "21435687", "12345678", "21435678", "12345678"], 8), 0);
});

test("count87s doesn't flag innocent rows", () => {
  assert.equal(count87s(["12345678", "21345678", "21436578", "12346578"], 8), 0);
});

test("count87s doesn't flag backward tenors at backstroke on odd stages", () => {
  assert.equal(count87s(["1234567", "2134567", "2143576", "1234657"], 7), 0);
});
