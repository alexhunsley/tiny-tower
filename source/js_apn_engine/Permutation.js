import {STAGE_SYMBOLS} from "./notation.js";

/**
 * @typedef {ReturnType<typeof Perm>} Perm
 */
/**
 * Create a Perm value-type.
 *
 * @param {string[][]} cycles - A list of lists of strings.
 * @returns {Perm} Perm value object
 */
export function Perm(cycles) {
    let _string = null;
    let _period = null;
    let _isConsideredDifferential = null;

    // Make a sorted copy of the incoming array
    const sortedCycles = [...cycles].sort();

    const obj = {
        cycles: sortedCycles,

        toString() {
            if (_string === null) {
                // using JSON.stringify to get sensible array of arrays to string
                _string = this.toOneLine() + '  ' +  this.permutationString()
                    // + '  ' + JSON.stringify(cycles.sort())
                    + '  period: ' + this.period() + (this.isConsideredDifferential() ? ' (diff)' : '');
            }
            return _string;
        },

        toOneLine() {
            const map = {};

            for (const cycle of cycles) {
                const len = cycle.length;
                for (let i = 0; i < len; i++) {
                    const from = cycle[i];
                    const to = cycle[(i + 1) % len];
                    // I swapped this, was from, to originally, but wrong way round
                    map[to] = from;
                }
            }

            // console.log("map: ", map);
            // FIX: cast keys to numbers
            const max = Math.max(...Object.keys(map).map(Number));

            let result = "";
            for (let i = 1; i <= max; i++) {
                result += map[i] ?? i;
            }
            return result;
        },

        permutationString() {
            return cycles.map(c => '(' + c + ')').sort().join(' ');
        },

        period() {
            if (_period === null) {
                // Period = LCM of cycle lengths
                const gcd = (a, b) => {
                    while (b) [a, b] = [b, a % b];
                    return a;
                };
                const lcm = (a, b) => (a === 0 || b === 0) ? 0 : (a / gcd(a, b)) * b;

                const cycleLengths = cycles.map(x => x.length);

                _period = cycleLengths.reduce((acc, k) => lcm(acc, k), 1);
            }
            return _period;
        },

        isConsideredDifferential() {
            if (_isConsideredDifferential === null) {
                // takes a list of strings representing perm cycles,
                // e.g. PB4 has cycles ["1", "423"]
                // Edge case: technically a perm cycle list of one single char string isn't
                // a differential (e.g. permCycle = ["1"]).
                // This check could be omitted if you never expect this to come up.
                if (cycles.length === 0 || cycles.length === 1 && cycles[0].length === 1) {
                    return false;
                }
                const filt = cycles.filter(cycle => cycle.length > 1);
                _isConsideredDifferential = filt.length !== 1;
            }
            return _isConsideredDifferential;
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

Perm.fromOneLine = function (oneLine, alphabetIn) {
    // return Perm(derivePermCycles(str));
    const alphabet = alphabetIn ?? STAGE_SYMBOLS;

    if (typeof oneLine !== "string" || oneLine.length === 0) {
        throw new Error("oneLine must be a non-empty string");
    }

    const n = oneLine.length;
    if (n > alphabet.length) {
        throw new Error(`Permutation length ${n} exceeds alphabet length ${alphabet.length}`);
    }

    // Use only the first n symbols of the alphabet
    const subset = alphabet.slice(0, n);

    // Map symbol -> 1-based index within subset
    const idxOf = new Map();
    for (let i = 0; i < n; i++) idxOf.set(subset[i], i + 1);

    // Build mapping p: i -> p(i), with i in 1..n
    const p = new Array(n + 1);
    for (let i = 1; i <= n; i++) {
        const ch = oneLine[i - 1];
        const v = idxOf.get(ch);
        if (v == null) {
            throw new Error(`Invalid symbol '${ch}' at position ${i}; expected one of "${subset}"`);
        }
        p[i] = v;
    }

    // Validate it's a permutation (all images unique)
    const seenVals = new Set();
    for (let i = 1; i <= n; i++) {
        if (p[i] < 1 || p[i] > n) {
            throw new Error(`Image out of range at ${i}: ${p[i]}`);
        }
        seenVals.add(p[i]);
    }
    if (seenVals.size !== n) {
        throw new Error(`Input is not a permutation of the first ${n} symbols of the alphabet`);
    }

    // Extract cycles
    const visited = new Array(n + 1).fill(false);
    const cycles = [];
    const lengths = [];

    for (let start = 1; start <= n; start++) {
        if (visited[start]) continue;

        let cur = start;
        const cycleIdx = [];
        while (!visited[cur]) {
            visited[cur] = true;
            cycleIdx.push(cur);
            cur = p[cur];
        }

        // Convert indices to alphabet symbols for the cycle string,
        // then reverse to avoid the "sorted" (increasing) look.
        const cycleStr = cycleIdx
            .map(i => subset[i - 1])
            .reverse()
            .join("");

        cycles.push(cycleStr);
        // lengths.push(cycleIdx.length);
    }

    return Perm(cycles.sort())

    // TODO put period derivation into Perm
    // return {cycles, period};
}

/**
 * Compose two Perms P and Q given as arrays of cycle strings.
 * Returns an array of cycle strings for Q ∘ P (apply P first, then Q).
 *
 * Example:
 *   P = ["1","472","653"]
 *   Q = ["1","473652"]
 *   composePerms(P, Q)  // => ["1","435627"]
 */
Perm.composePermPair = function (permA, permB) {
    // Alphabet: all symbols that appear anywhere, in first-seen order
    const alphabet = [
        ...new Set(permA.cycles.join("") + permB.cycles.join(""))
    ];

    // Build mapping for P and Q
    const mapA = Perm.cyclesToMapping(permA);
    const mapB = Perm.cyclesToMapping(permB);

    // console.log("maps: ", mapA, mapB);

    // Compose: (Q ∘ P)(x) = Q(P(x))
    const composed = new Map();
    for (const x of alphabet) {
        const y = mapA.get(x) ?? x;      // P_a(x)
        const z = mapB.get(y) ?? y;      // P_b(P_a(x))
        composed.set(x, z);
    }
    // Turn mapping back into cycle strings
    // return mappingToCycles(composed, alphabet);
    return Perm(Perm.mappingToCycles(composed, alphabet));
}

Perm.composePerms = function (listOfPerms) {
    if (listOfPerms.length === 0) {
        throw new Error("composePerms: Need at least one permutation");
    }
    return listOfPerms.reduce((acc, perm) => Perm.composePermPair(acc, perm));
}

/**
 * Convert a list of cycle strings into a mapping value -> image.
 *
 * Example: ["472","653"] means (4 7 2)(6 5 3)
 */
Perm.cyclesToMapping = function (perm) {
    const mapping = new Map();

    for (let cyc of perm.cycles) {
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
Perm.mappingToCycles = function (mapping, alphabet="1234567890ET") {
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
