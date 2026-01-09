// import {STAGE_SYMBOLS} from "./notation.js";

export function Render(huntingLines, workingLines, ghostDigitsUnderBluelines,
                       drawLines=true, drawDigits=true,
                       leadLength,
                       leadHeadOffset=0,
                       lineScaleY=1.0,
                       showRowPermToRounds=false,
                       highlightPermsWithTrebleLeading=true,
                       targetRowsForPerms=[]) {
    // let _huntingLines = [];
    // let _workingLines = [];

    const obj = {
        huntingLines: huntingLines,
        workingLines: workingLines,
        ghostDigitsUnderBluelines: ghostDigitsUnderBluelines,
        drawLines: drawLines,
        drawDigits: drawDigits,
        leadLength: leadLength,
        leadHeadOffset: leadHeadOffset,
        lineScaleY: lineScaleY,
        showRowPermToRounds: showRowPermToRounds,
        highlightPermsWithTrebleLeading: highlightPermsWithTrebleLeading,
        targetRowsForPerms: targetRowsForPerms
    };

    return Object.freeze(obj);

    //     toString() {
    //         if (_string === null) {
    //             // using JSON.stringify to get sensible array of arrays to string
    //             _string = this.toOneLine() + '  ' +  this.permutationString()
    //                 // + '  ' + JSON.stringify(cycles.sort())
    //                 + '  period: ' + this.period() + (this.isConsideredDifferential() ? ' (diff)' : '');
    //         }
    //         return _string;
    //     },
    //
    //     toOneLine() {
    //         // Passive permutation map: position i → new position σ(i)
    //         const posMap = {};
    //
    //         for (const cycle of cycles) {
    //             const len = cycle.length;
    //             for (let i = 0; i < len; i++) {
    //                 const from = Number(cycle[i]);
    //                 const to   = Number(cycle[(i + 1) % len]);
    //                 posMap[from] = to;
    //             }
    //         }
    //
    //         // Determine how many positions we’re dealing with
    //         const max = Math.max(...Object.keys(posMap).map(Number), 0);
    //
    //         // oneLine[newPos] = oldPos
    //         const arr = new Array(max + 1);
    //
    //         for (let oldPos = 1; oldPos <= max; oldPos++) {
    //             const newPos = posMap[oldPos] ?? oldPos;  // fixed points stay put
    //             arr[newPos] = String(oldPos);
    //         }
    //
    //         // Convert 1-based array to a string
    //         return arr.slice(1).join("");
    //     },
    //
    //     permutationString(cyclesIn=cycles) {
    //         return cyclesIn.map(c => '(' + c + ')').sort().join(' ');
    //         // return cycles.map(c => '(' + c.join('') + ')').sort().join(' ');
    //     },
    //
    //     // drops any single (non-moving) items, e.g. '(1) (2) (7)',
    //     // and outputs "(no permutation)" for identiity
    //     permutationStringPretty() {
    //         const prettyString = this.permutationString(cycles.filter(c => c.length > 1))
    //         if (prettyString.length == 0) {
    //             return "(no permutation)";
    //         }
    //         return prettyString;
    //     },
    //
    //     period() {
    //         if (_period === null) {
    //             // Period = LCM of cycle lengths
    //             const gcd = (a, b) => {
    //                 while (b) [a, b] = [b, a % b];
    //                 return a;
    //             };
    //             const lcm = (a, b) => (a === 0 || b === 0) ? 0 : (a / gcd(a, b)) * b;
    //
    //             const cycleLengths = cycles.map(x => x.length);
    //
    //             _period = cycleLengths.reduce((acc, k) => lcm(acc, k), 1);
    //         }
    //         return _period;
    //     },
    //
    //     isConsideredDifferential() {
    //         if (_isConsideredDifferential === null) {
    //             // takes a list of strings representing perm cycles,
    //             // e.g. PB4 has cycles ["1", "423"]
    //             // Edge case: technically a perm cycle list of one single char string isn't
    //             // a differential (e.g. permCycle = ["1"]).
    //             // This check could be omitted if you never expect this to come up.
    //             if (cycles.length === 0 || cycles.length === 1 && cycles[0].length === 1) {
    //                 return false;
    //             }
    //             const filt = cycles.filter(cycle => cycle.length > 1);
    //             _isConsideredDifferential = filt.length !== 1;
    //         }
    //         return _isConsideredDifferential;
    //     },
    //
    //     equals(other) {
    //         const a = this.cycles;
    //         const b = other.cycles;
    //
    //         if (a.length !== b.length) return false;
    //
    //         for (let i = 0; i < a.length; i++) {
    //             const ai = a[i];
    //             const bi = b[i];
    //
    //             if (ai.length !== bi.length) return false;
    //
    //             for (let j = 0; j < ai.length; j++) {
    //                 if (ai[j] !== bi[j]) return false;
    //             }
    //         }
    //
    //         return true;
    //     }
    // };
}


// Perm.fromOneLine = function (oneLine, alphabetIn, omitOneCycles=false) {
//     const alphabet = alphabetIn ?? STAGE_SYMBOLS;
//
//     if (typeof oneLine !== "string" || oneLine.length === 0) {
//         throw new Error("oneLine must be a non-empty string");
//     }
//
//     const n = oneLine.length;
//     if (n > alphabet.length) {
//         throw new Error(`Permutation length ${n} exceeds alphabet length ${alphabet.length}`);
//     }
//
//     // Base row: first n symbols of the alphabet, e.g. "1234"
//     const subset = alphabet.slice(0, n);
//
//     // Map base-row symbol -> index in base row (1-based)
//     const idxOfBase = new Map();
//     for (let i = 0; i < n; i++) {
//         idxOfBase.set(subset[i], i + 1);
//     }
//
//     // Map symbol -> position in the one-line row (1-based).
//     // Also validate that oneLine is a permutation of subset.
//     const posOf = new Map();
//     for (let pos = 1; pos <= n; pos++) {
//         const ch = oneLine[pos - 1];
//
//         if (!idxOfBase.has(ch)) {
//             throw new Error(
//                 `Invalid symbol '${ch}' at position ${pos}; expected one of "${subset}"`
//             );
//         }
//         if (posOf.has(ch)) {
//             throw new Error(
//                 `Duplicate symbol '${ch}' in oneLine; must be a permutation of "${subset}"`
//             );
//         }
//         posOf.set(ch, pos);
//     }
//
//     // Build passive permutation σ on positions:
//     // σ(i) = new position of the symbol that started in position i.
//     //
//     // That is: the symbol at subset[i-1] moves to position posOf(subset[i-1]).
//     const p = new Array(n + 1); // 1-based
//     for (let i = 1; i <= n; i++) {
//         const ch = subset[i - 1];   // symbol that starts in position i
//         const newPos = posOf.get(ch);
//         p[i] = newPos;
//     }
//
//     // Extract cycles of this permutation on {1, ..., n}
//     const visited = new Array(n + 1).fill(false);
//     const cycles = [];
//
//     for (let start = 1; start <= n; start++) {
//         if (visited[start]) continue;
//
//         let cur = start;
//         const cycleIdx = [];
//         while (!visited[cur]) {
//             visited[cur] = true;
//             cycleIdx.push(cur);
//             cur = p[cur];
//         }
//
//         if (!omitOneCycles || cycleIdx.length > 1) {
//             // Convert position indices to symbols from the base row.
//             // NOTE: no reversal here – the cycle direction matches the passive mapping.
//             const cycleStr = cycleIdx
//                 .map(i => subset[i - 1])
//                 .join("");
//
//             cycles.push(cycleStr);
//         }
//     }
// };
