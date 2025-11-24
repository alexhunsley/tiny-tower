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
