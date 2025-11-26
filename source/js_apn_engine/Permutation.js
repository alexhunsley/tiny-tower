/**
 * @typedef {ReturnType<typeof Perm>} PermType
 */

/**
 * Create a Perm value-type.
 *
 * @param {string[][]} cycles - A list of lists of strings.
 * @returns {PermType} Perm value object
 */
export function Perm(cycles) {
    // private memoised string, lives in the closure, not on the object
    let _string = null;

    const obj = {
        cycles,

        // Lazily computed, memoised single line
        toString() {
            if (_string === null) {
                console.log("EXECUTING TO string");
                _string = '(' + cycles.map(c => c.join('')).join(' ') + ')';
            }
            return _string;
        },

        equals(other) {
            const a = this.cycles;
            const b = other.cycles;

            if (a.length !== b.length) return false;

            for (let i = 0; i < a.length; i++) {
                const ai = a[i];
                const bi = b[i];

                if (ai.length !== bi.length) return false;

                for (let j = 0; j < ai.length; j++) {
                    if (ai[j] !== bi[j]) return false;
                }
            }

            return true;
        }
    };
    return Object.freeze(obj);
}

/**
 * Compose two permutations P and Q given as arrays of cycle strings.
 * Returns an array of cycle strings for Q ∘ P (apply P first, then Q).
 *
 * Example:
 *   P = ["1","472","653"]
 *   Q = ["1","473652"]
 *   composePerms(P, Q)  // => ["1","435627"]
 */
export function composePerms(permA, permB) {
    // Alphabet: all symbols that appear anywhere, in first-seen order
    const alphabet = [
        ...new Set(permA.join("") + permB.join(""))
    ];

    // Build mapping for P and Q
    const mapA = cyclesToMapping(permA);
    const mapB = cyclesToMapping(permB);

    console.log("maps: ", mapA, mapB);

    // Compose: (Q ∘ P)(x) = Q(P(x))
    const composed = new Map();
    for (const x of alphabet) {
        const y = mapA.get(x) ?? x;      // P_a(x)
        const z = mapB.get(y) ?? y;      // P_b(P_a(x))
        composed.set(x, z);
    }
    // Turn mapping back into cycle strings
    return mappingToCycles(composed, alphabet);
}

/**
 * Convert a list of cycle strings into a mapping value -> image.
 *
 * Example: ["472","653"] means (4 7 2)(6 5 3)
 */
function cyclesToMapping(cycles) {
    const mapping = new Map();

    for (const cyc of cycles) {
        const n = cyc.length;
        if (n === 0) continue;
        for (let i = 0; i < n; i++) {
            const from = cyc[i];
            const to   = cyc[(i + 1) % n];
            mapping.set(from, to);
        }
    }

    return mapping;
}

/**
 * Convert a mapping back into an array of cycle strings.
 * `alphabet` controls which symbols to consider and in what order.
 */
function mappingToCycles(mapping, alphabet) {
    const visited = new Set();
    const cycles = [];

    for (const start of alphabet) {
        if (visited.has(start)) continue;

        let cur = start;
        const cyc = [];
        while (!visited.has(cur)) {
            visited.add(cur);
            cyc.push(cur);
            const next = mapping.get(cur) ?? cur; // identity if not moved
            cur = next;
        }

        if (cyc.length > 1) {
            cycles.push(cyc.join(""));
        } else {
            // 1-cycle: record it explicitly as a string of length 1
            cycles.push(cyc[0]);
        }
    }

    return cycles;
}

// compose an array of permutations, each as array-of-cycle-strings
export function composeManyCycles(listOfPerms) {
    if (listOfPerms.length === 0) {
        throw new Error("Need at least one permutation");
    }
    return listOfPerms.reduce((acc, perm) => composePerms(acc, perm));
}
