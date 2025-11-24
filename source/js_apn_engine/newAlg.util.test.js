import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';

util.inspect.defaultOptions = {depth: null, maxArrayLength: null, breakLength: Infinity};

import {canonicalRotation} from './newAlg.util.js';

test('string canonicalisation', () => {
    assert.deepEqual(canonicalRotation(''), '');

    assert.deepEqual(canonicalRotation('34512'), '12345');
    assert.deepEqual(canonicalRotation('45123'), '12345');
    assert.deepEqual(canonicalRotation('51234'), '12345');

    assert.notDeepEqual(canonicalRotation('5123x4'), '12345');
    assert.notDeepEqual(canonicalRotation(''), '12345');
});
