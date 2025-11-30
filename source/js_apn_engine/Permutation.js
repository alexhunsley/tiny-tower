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
            // Passive permutation map: position i → new position σ(i)
            const posMap = {};

            for (const cycle of cycles) {
                const len = cycle.length;
                for (let i = 0; i < len; i++) {
                    const from = Number(cycle[i]);
                    const to   = Number(cycle[(i + 1) % len]);
                    posMap[from] = to;
                }
            }

            // Determine how many positions we’re dealing with
            const max = Math.max(...Object.keys(posMap).map(Number), 0);

            // oneLine[newPos] = oldPos
            const arr = new Array(max + 1);

            for (let oldPos = 1; oldPos <= max; oldPos++) {
                const newPos = posMap[oldPos] ?? oldPos;  // fixed points stay put
                arr[newPos] = String(oldPos);
            }

            // Convert 1-based array to a string
            return arr.slice(1).join("");
        },

        permutationString(cyclesIn=cycles) {
            return cyclesIn.map(c => '(' + c + ')').sort().join(' ');
            // return cycles.map(c => '(' + c.join('') + ')').sort().join(' ');
        },

        // drops any single (non-moving) items, e.g. '(1) (2) (7)',
        // and outputs "(no permutation)" for identiity
        permutationStringPretty() {
            const prettyString = this.permutationString(cycles.filter(c => c.length > 1))
            if (prettyString.length == 0) {
                return "(no permutation)";
            }
            return prettyString;
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
    const alphabet = alphabetIn ?? STAGE_SYMBOLS;

    if (typeof oneLine !== "string" || oneLine.length === 0) {
        throw new Error("oneLine must be a non-empty string");
    }

    const n = oneLine.length;
    if (n > alphabet.length) {
        throw new Error(`Permutation length ${n} exceeds alphabet length ${alphabet.length}`);
    }

    // Base row: first n symbols of the alphabet, e.g. "1234"
    const subset = alphabet.slice(0, n);

    // Map base-row symbol -> index in base row (1-based)
    const idxOfBase = new Map();
    for (let i = 0; i < n; i++) {
        idxOfBase.set(subset[i], i + 1);
    }

    // Map symbol -> position in the one-line row (1-based).
    // Also validate that oneLine is a permutation of subset.
    const posOf = new Map();
    for (let pos = 1; pos <= n; pos++) {
        const ch = oneLine[pos - 1];

        if (!idxOfBase.has(ch)) {
            throw new Error(
                `Invalid symbol '${ch}' at position ${pos}; expected one of "${subset}"`
            );
        }
        if (posOf.has(ch)) {
            throw new Error(
                `Duplicate symbol '${ch}' in oneLine; must be a permutation of "${subset}"`
            );
        }
        posOf.set(ch, pos);
    }

    // Build passive permutation σ on positions:
    // σ(i) = new position of the symbol that started in position i.
    //
    // That is: the symbol at subset[i-1] moves to position posOf(subset[i-1]).
    const p = new Array(n + 1); // 1-based
    for (let i = 1; i <= n; i++) {
        const ch = subset[i - 1];   // symbol that starts in position i
        const newPos = posOf.get(ch);
        p[i] = newPos;
    }

    // Extract cycles of this permutation on {1, ..., n}
    const visited = new Array(n + 1).fill(false);
    const cycles = [];

    for (let start = 1; start <= n; start++) {
        if (visited[start]) continue;

        let cur = start;
        const cycleIdx = [];
        while (!visited[cur]) {
            visited[cur] = true;
            cycleIdx.push(cur);
            cur = p[cur];
        }

        if (cycleIdx.length > 1) {
            // Convert position indices to symbols from the base row.
            // NOTE: no reversal here – the cycle direction matches the passive mapping.
            const cycleStr = cycleIdx
                .map(i => subset[i - 1])
                .join("");

            cycles.push(cycleStr);
        }
    }

// cycles is a string[], e.g. ["3412", "5142", "32"]

    for (let i = 0; i < cycles.length; i++) {
        const s = cycles[i];
        if (s.length <= 1) continue; // nothing to rotate

        // Find index of the minimum character
        let minChar = s[0];
        let minIdx = 0;
        for (let j = 1; j < s.length; j++) {
            const ch = s[j];
            if (ch < minChar) {
                minChar = ch;
                minIdx = j;
            }
        }

        // Rotate so that minChar is at the front
        cycles[i] = s.slice(minIdx) + s.slice(0, minIdx);
    }

// Now sort the whole array of normalized cycles
    cycles.sort();

    // If everything was fixed, represent as identity (empty cycles array or however Perm expects it)
    return Perm(cycles);
};

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
