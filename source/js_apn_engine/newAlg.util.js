export function reverseString(s) {
    return s.split("").reverse().join("");
}

/**
 * Return a canonical representative of a string under rotation:
 * the lexicographically smallest rotation.
 *
 * @param {string} s
 * @returns {string}
 */
export function canonicalRotation(s) {
    const n = s.length;
    let best = s;

    for (let i = 1; i < n; i++) {
        const r = s.slice(i) + s.slice(0, i);
        if (r < best) best = r;
    }
    return best;
}

// not used, but something similar be good for perm tests to ensure
// we test the cycle regardless of order return (do canonicalRotatiojn as the transform).
// also need to pass two lists into this! (instead of value and list)

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
