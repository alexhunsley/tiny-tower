import {reverseString} from "./newAlg.util.js";
import {Perm} from "./Permutation.js";
import {repeatList} from "./utils.js";
import {toCSVRow} from "./utils.js";
import {Render} from "./render.js";

import {STAGE_SYMBOLS} from "./notation.js";

// console.log("G7:\n\nPlain lead: ", derivePermCycles('1253746'));
//
// console.log("Bob: ", derivePermCycles('1752634'));

// // outputs 1432 -- incorrect wrt PBs -- it's backwards
// console.log(derivePermCycles('4123'));
//
// // outputs 1234 -- incorrect wrt PBs -- it's backwards
// console.log(derivePermCycles('2341'));
//
// // outputs 13, 24 -- correct wrt PBs
// console.log(derivePermCycles('3412'));
//
// // outputs 12, 345 -- correct for 12, incorrect for 345! so yes some sorting thing.
// console.log(derivePermCycles('21453'));

/**
 * Given a list of cycle strings (e.g. ["12","34"]),
 * return the one-line permutation string, assuming
 * the underlying set is {1,2,...,maxSymbol}.
 *
 * Example: ["12","34"] → "2143"  (1→2, 2→1, 3→4, 4→3)
 */
// function cyclesToPermutationString(cycles) {
//     // Find the highest symbol used: assumed to be digits ("1","2",...)
//     const maxSymbol = Math.max(...cycles.join("").split("").map(Number)) || 0;
//
//     // Start with identity mapping
//     const map = {};
//     for (let i = 1; i <= maxSymbol; i++) {
//         map[i] = String(i);
//     }
//
//     // Apply each cycle
//     for (const cycIn of cycles) {
//         // note we reverse, because we want perms to be PB order
//         // (we also reverse when converting the other way)
//         const cyc = reverseString(cycIn);
//         const n = cyc.length;
//         for (let i = 0; i < n; i++) {
//             const from = cyc[i];
//             const to   = cyc[(i + 1) % n];
//             map[from] = to;
//         }
//     }
//
//     // Build the final one-line permutation string
//     let result = "";
//     for (let i = 1; i <= maxSymbol; i++) {
//         result += map[i];
//     }
//     return result;
// }

const rep = (n, x) => Array(n).fill(x);

/// named changes

// queens = { cycles: [ '1', '532', '674' ], period: 3 }
console.log("queens =", Perm.fromOneLine('1357246').toString());
console.log("tittums =", Perm.fromOneLine('1526374').toString());
// console.log('to one line: ', Perm([[1,4], [2,3]]).toOneLine());

/// PB6

const pb_p = Perm.fromOneLine('123564')
console.log("PB6: pb_p =", pb_p.toString());


/// GRANDSIRE

// g P = { cycles: [ '1', '2', '46753' ], period: 5 }
// const gp = '1253746';

const gp = Perm.fromOneLine('1253746')
console.log("g P =", gp.toString());

// handstroke of lead (lead end)
// g P' = { cycles: [ '1', '352', '74', '6' ], period: 6 }
const gpH = Perm.fromOneLine('1527364')
console.log("g P' =", gpH.toString());

console.log(Perm.fromOneLine('2135476').toString());
console.log(Perm.fromOneLine('2314567').toString());
console.log(Perm.fromOneLine('3241657').toString());

console.log("g P' =", gpH.toString());

// g - = { cycles: [ '1', '472', '653' ], period: 3 }
const gb = Perm.fromOneLine('1752634')
console.log("gb =", gb.toString());

const gs = Perm.fromOneLine('1572634')
console.log("gs =", gs.toString());

//  1364257  (1) (4) (5632) (7)  period: 4
const solve = Perm.fromOneLine('1364257')
console.log("solve =", solve.toString());

const charToPerm = { 'P' : gp, 'B' : gb, 'S' : gs };

function composeCalls(callStr, reps=1) {
    const allCallPerms = callStr.split("").map(c => charToPerm[c]);
    const composedPerm = Perm.composePerms(repeatList(allCallPerms, reps))
    console.log('calls: ', callStr, ' x ', reps, '  composedPerm: ', composedPerm.toString());
}

function composeCallsBlog(title, callStr, reps=1) {
    const allCallPerms = callStr.split("").map(c => charToPerm[c]);
    const composedPerm = Perm.composePerms(repeatList(allCallPerms, reps))

    // const permStr = composedPerm.toOneLine() + ' ' + composedPerm.permutationString();
    // const permStr = composedPerm.toOneLine() + ',' + composedPerm.permutationStringPretty();
    // console.log('permStr: ', permStr);
    console.log(toCSVRow([title, callStr, composedPerm.toOneLine(), composedPerm.permutationStringPretty()]));
    // console.log(title, ',', callStr, ',', composedPerm.toString());
}

// grandsire common courses for blog

console.log("\n===== Non-course bits:\n");

composeCallsBlog('a', 'B');

console.log("\n===== Courses:\n");

// three bobs = indentity
composeCallsBlog('a', 'BBB');

// B

// 7 in hunt
// composeCallsBlog('a', 'BPPPP');
composeCallsBlog('a', 'PBPPP');
// false, has 5 Ps
// composeCallsBlog('a', 'PPBPPPPPP');
// false, has 5 Ps
// composeCallsBlog('a', 'PPPBPPPPP');
composeCallsBlog('a', 'PPPPBP');

// BB
composeCallsBlog('a', 'BBPP');
composeCallsBlog('b', 'PBBP');

composeCallsBlog('b', 'PPBBPPPP');
composeCallsBlog('b', 'PPPPBBPPP');


// S
composeCallsBlog('a', 'SPPP');
composeCallsBlog('a', 'PPSP');
composeCallsBlog('a', 'PPPS');

// SS
composeCallsBlog('a', 'SSP');
composeCallsBlog('a', 'PSSPP');
composeCallsBlog('a', 'PPSSPPPP');
composeCallsBlog('a', 'PPPSSPPP');

// SSS
composeCallsBlog('a', 'SSSPPPP');
composeCallsBlog('a', 'PSSS');
composeCallsBlog('a', 'PPPSSSP');
composeCallsBlog('a', 'PPPPSSSPP');

// SSSS
composeCallsBlog('a', 'PSSSSPPP');
composeCallsBlog('a', 'PPSSSSPP');
composeCallsBlog('a', 'PPPSSSSPPPP');
composeCallsBlog('a', 'PPPPSSSS');

// SSSSS
composeCallsBlog('a', 'SSSSSPP');
composeCallsBlog('a', 'PSSSSSP');
composeCallsBlog('a', 'PPPPSSSSSPPP');

// SSSSSS
composeCallsBlog('a', 'SSSSSS');

// PS etc.
composeCallsBlog('(queens)', 'PSPS');
composeCallsBlog('(queens+tittums)', 'PSPSPSPS');

console.log('\n=========== the tenor mixy up ones:');

// puts 7 in the hunt
composeCallsBlog('b', 'PPPBB');
composeCallsBlog('b', 'PPPBBB');

composeCallsBlog('b', 'PPPBSPPP');

// puts 7 in hunt
composeCallsBlog('a', 'SSSS');

// puts 7 in hunt
composeCallsBlog('a', 'PPPSSSSS');

// 7 in hunt
composeCallsBlog('a', 'PPSSS');

// puts 7 in hunt
composeCallsBlog('a', 'PSPPP');

console.log('\n=========== others like mixes s+b\n');

composeCallsBlog('a', 'SBP');
composeCallsBlog('a', 'PSBPP');

composeCallsBlog('a', 'PPSBPPPP');

composeCallsBlog('a', 'BSPP');
composeCallsBlog('a', 'PBSP');
composeCallsBlog('a', 'PPBSPPPP');

composeCallsBlog('a', 'SSBPPPP');
composeCallsBlog('a', 'PSSB');

console.log('\n=========== cycle compose play:\n');

// const c1 = Perm.fromOneLine('231456');
// const c2 = Perm.fromOneLine('123564');

// const c1 = Perm(['132']);

// 2 3s, 1 overlapping, end up with a 5.
// (16542)
const c1 = Perm(['142']);
const c2 = Perm(['465']);
console.log(c1);
console.log(c2);

const cc = Perm.composePerms([c1, c2]);
console.log('combined: ', cc.permutationStringPretty());

console.log("\n")

{
// 2 overlapping (2, 4):
// end up with 3 cycle (162)
    const c1 = Perm(['142']);
    const c2 = Perm(['246']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

// note order of application is left->right in way it's set up. (usually it's right to left)

{
// 3 overlapping
// end up with no perm (as they're reverse of each other?)
    const c1 = Perm(['142']);
    const c2 = Perm(['124']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
// 3 overlapping
// end up with (124)
    // and this and above are only two possibilities with 3 overlapping -- either direction
    const c1 = Perm(['142']);
    const c2 = Perm(['214']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
// 4 items, 2 overlapping
// end up with (13) (4256), period 4
    const c1 = Perm(['1423']);
    const c2 = Perm(['3564']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
// 4 items, 1 overlapping
// end up with (1425673)  period 7  (2x4 - 1)
    const c1 = Perm(['1423']);
    const c2 = Perm(['3567']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // makes (264)
    const c1 = Perm(['25']);
    const c2 = Perm(['2564']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // makes (43652)
    const c1 = Perm(['42']);   // PPPS
    const c2 = Perm(['3652']); // PSSS
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // makes (24) (35)
    const c1 = Perm(['234']); //
    const c2 = Perm(['345']); // ? don't have this!
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // reverse order of above: makes  (32) (45)
    // const c1 = Perm(['325']); //
    const c1 = Perm(['345']); // ? don't have this!!
    const c2 = Perm(['234']); // BBPP
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // reverse order of above: makes  (32) (45)
    // const c1 = Perm(['325']); //
    const c1 = Perm(['345']); //
    const c2 = Perm(['234']); // BBPP
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // makes (2534)
    const c1 = Perm(['25']);
    const c2 = Perm(['234']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // makes (2345)
    const c1 = Perm(['234']);
    const c2 = Perm(['25']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // combo of above two: makes (543)
    const c1 = Perm(['2534']);
    const c2 = Perm(['2345']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

{
    // reverse combo of above two: makes (243)
    const c1 = Perm(['2345']);
    const c2 = Perm(['2534']);
    console.log(c1);
    console.log(c2);

    const cc = Perm.composePerms([c1, c2]);
    console.log('combined: ', cc.permutationStringPretty());
}

// puts 7 in the hunt
// composeCallsBlog('a', 'PPPPSS');

// composeCalls('P');
// composeCalls('PPPPP');
// composeCalls('BBPP');
// composeCalls('BBPP', 3);



//
// composeCalls('BBPP');
// composeCalls('PBBP');
// composeCalls('PPBB');
// composeCalls('BPPB');
//
// console.log("\n=================\n");
//
// composeCalls('PPSS');
// composeCalls('PSSP');
// composeCalls('SSPP');
// composeCalls('SPPS');
//
// console.log("\n=================\n");
//
// composeCalls('SBPP');
// composeCalls('PSBP');
// composeCalls('PPSB');
// composeCalls('BPPS');
//
// console.log("\n=================\n");
//
//
// composeCalls('BPPP');
// composeCalls('PBPP');
// composeCalls('PPBP');
// composeCalls('PPPB');




//
// composeCalls('SPSP');
// queens in 4 leads

console.log("\n=================\n RW diary g7 code bits:\n");


// composeCalls('BBPP');
// composeCalls('PBBP');
// composeCalls('SPB');
// composeCalls('PPPB');
// composeCalls('PPPBBBPP');
//
//
// // defo queens:
// composeCalls('PSPS');
// composeCalls('SPSP');
//
// composeCalls('PSPSPSPS');
// // composeCalls('PSPSPSPSP');
// composeCalls('PSPSPSPSPBPPS'); // just need to unscramble 3, 5 now
//
// composeCalls('PSPSPSPSPBPPS'); // just need to unscramble 3, 5 now

// composeCalls('BSPB');

//                           ^   ^
// composeCalls('SPSPSPSP');
// composeCalls('SPSPSPSPBPPS'); // just need to unscramble 3, 5 now

// console.log('Compose all: ', );
// console.log('Compose all: ', composeCalls('PP'));
// console.log('Compose all: ', composeCalls('BBPP'));
// console.log('Compose all: ', composeCalls('BBPP', 3));

// console.log('Compose all: ', Perm.composePerms(allCallPerms));

// console.log('Compose perm pair: ', Perm.composePermPair(gp, gp));
// console.log('Compose perm pair generally: ', Perm.composePerms([gp, gp]));

// const c1 = composeCycles([gb, gb, gp, gp]);
// const cyc1 = derivePermCycles(c1)
// console.log("BBPP =", c1, cyc1);


// const repo = rep(5, gp_c);
// console.log("repo = ", repo);
//
// // expect a plain course (no change)
// const compPx7 = composeManyCycles(repo);
// console.log("compPx7 = ", compPx7);
//
// const compBBPP = composeManyCycles([gb_c, gb_c, gp_c, gp_c]);
// console.log("compBBPP = ", compBBPP, cyclesToPermutationString(compBBPP));
//
// const compPBBP = composeManyCycles([gp_c, gb_c, gb_c, gp_c]);
// console.log("compPBBP = ", compPBBP, cyclesToPermutationString(compPBBP));
// // mixes in the 7! splitty
// const compPPBB = composeManyCycles([gp_c, gp_c, gb_c, gb_c]);
// console.log("compPPBB = ", compPPBB, cyclesToPermutationString(compPPBB));
//
// // moves the 6 (splitty)
// const compBSPP = composeManyCycles([gb_c, gs_c, gp_c, gp_c]);
// console.log("compBSPP = ", compBSPP, cyclesToPermutationString(compBSPP));
//
// const compPBSP = composeManyCycles([gp_c, gb_c, gs_c, gp_c]);
// console.log("compPBSP = ", compPBSP, cyclesToPermutationString(compPBSP));
//
// // mixes in 7
// const compPPBS = composeManyCycles([gp_c, gp_c, gb_c, gs_c]);
// console.log("compPPBS = ", compPPBS, cyclesToPermutationString(compPPBS));
//
// // mixes in 7 and 6, into sep groups (7 in a triple, 6 in a pair)
// const compPPSB = composeManyCycles([gp_c, gp_c, gs_c, gb_c]);
// console.log("compPPSB = ", compPPSB, cyclesToPermutationString(compPPSB));
//
// // swaps 23 and 67. over cycle 2
// const compBPBP = composeManyCycles([gb_c, gp_c, gb_c, gp_c]);
// console.log("compBPBP = ", compBPBP, cyclesToPermutationString(compBPBP));
//
//
// // const compBBPPx2 = composeManyCycles([gb_c, gb_c, gp_c, gp_c,  gb_c, gb_c, gp_c, gp_c]);
// // console.log("compBBPPx2 = ", compBBPPx2, cyclesToPermutationString(compBBPPx2));
// //
// // const compBBPPx3 = composeManyCycles([gb_c, gb_c, gp_c, gp_c,  gb_c, gb_c, gp_c, gp_c,   gb_c, gb_c, gp_c, gp_c]);
// // console.log("compBBPPx3 = ", compBBPPx3, cyclesToPermutationString(compBBPPx3));
//
// // swaps 67 and rots 253
// const compPSBP = composeManyCycles([gp_c, gs_c, gb_c, gp_c]);
// console.log("compPSBP = ", compPSBP, cyclesToPermutationString(compPSBP));
//
//
// // this works, flips 67 overall, so a two part.
// const tryMix = composeManyCycles([compPBSP, compPSBP]);
// console.log(tryMix, cyclesToPermutationString(tryMix));
//
// // swap 45 and 36
// const compPSPBS = composeManyCycles([gp_c, gs_c, gp_c, gb_c, gs_c]);
// console.log("compPSPBS = ", compPSPBS, cyclesToPermutationString(compPSPBS));
//
//



// composePerms([])
// let queens = mappingToCycles("13572468", "12345678");
// console.log("queens = ", queens);

// console.log(composePerms(p, p2));

// console.log("Comp: ", composePerms([p, p3]));


// console.log(Object.getOwnPropertyDescriptor(p, "toString"));

// console.log("tryMix = ", tryMix, cyclesToPermutationString(tryMix));

// ... so I think a sort effect is doing it somewhere in the func.

// come back to this below! Interesting!

// // output all rotations of different stages and the resulting permCycles.
// // This demonstrates how the rotations form factorisation of the stage,
// // and hence e.g. prime stages have no breakdown of cycles: just the number itself
// for (let n = 4; n <= 16; n++) {
//     const base = STAGE_SYMBOLS.slice(0, n);
//
//     console.log("\n\n===================\n", "(", n, ")", base);
//
//     for (let i = 0; i < n; i++) {
//         const rotation = base.slice(i) + base.slice(0, i);
//         const permCycles = derivePermCycles(rotation);
//         // console.log(`${rotation}: ${permCycles}`)
//         console.log("Rot:", rotation, permCycles);
//
//     }
// }

const r = Render([], []);
console.log("render = ", r);
