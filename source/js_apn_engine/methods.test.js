import test from 'node:test';
import assert from 'node:assert/strict';

import util from 'node:util';

util.inspect.defaultOptions = {depth: null, maxArrayLength: null, breakLength: Infinity};

import {stedmanPNForStage} from "./methods.js";

test('stedman PN generation', () => {
    assert.deepEqual(stedmanPNForStage(5), '3.1.5.3.1.3.1.3.5.1.3.1');
    assert.deepEqual(stedmanPNForStage(7), '3.1.7.3.1.3.1.3.7.1.3.1');
    assert.deepEqual(stedmanPNForStage(9), '3.1.9.3.1.3.1.3.9.1.3.1');
    assert.deepEqual(stedmanPNForStage(11), '3.1.E.3.1.3.1.3.E.1.3.1');
    assert.deepEqual(stedmanPNForStage(13), '3.1.A.3.1.3.1.3.A.1.3.1');
});
