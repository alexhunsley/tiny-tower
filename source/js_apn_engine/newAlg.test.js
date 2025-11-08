// newAlg.test.js
const test = require('node:test');
const assert = require('node:assert/strict');

const util = require('node:util');
util.inspect.defaultOptions = { depth: null, maxArrayLength: null, breakLength: Infinity };

const {
  parseTopLevel,
  evaluateTopLevel,
  tokenizeFlat,
  evaluateExpression,
  getStage,
  derivePermCycles,
  arePermCyclesConsideredDifferential,
  count87s,
  measureTopPairDistances,
  _internals
} = require('./newAlg.js');

const {
  collapsePlaceNotation
} = require('./notation.js');


// test('basic bracketed examples', () => {
//   {
//     const ast = parseTopLevel('(23.45).(67x)');
//     const out = evaluateTopLevel(ast);
//     assert.deepEqual(out, ['23', '45', '67', 'x']);
//   }

//   {
//     const ast = parseTopLevel('(45.12)');
//     const out = evaluateTopLevel(ast);
//     assert.deepEqual(out, ['45', '12']);
//   }

//   {
//     const ast = parseTopLevel('(45x89.12)');
//     const out = evaluateTopLevel(ast);
//     assert.deepEqual(out, ['45', 'x', '89', '12']);
//   }

//   // NOTE: 'x' is both a token and a delimiter
//   {
//     const ast = parseTopLevel('(12.x)');
//     const out = evaluateTopLevel(ast);
//     assert.deepEqual(out, ['12', 'x']);
//   }
// });

// test('nested example', () => {
//   const ast = parseTopLevel('((34.16).(7x)).(9)');
//   const out = evaluateTopLevel(ast);
//   assert.deepEqual(out, ['34', '16', '7', 'x', '9']);
// });

// test('flat tokenizer: "12.34.....xx87x.x"', () => {
//   const out = tokenizeFlat('12.34.....xx87x.x');
//   assert.deepEqual(out, ['12', '34', 'x', 'x', '87', 'x', 'x']);
// });

// test('throws on unmatched parentheses', () => {
//   assert.throws(() => parseTopLevel('(12.34'), /Unmatched/);
//   assert.throws(() => parseTopLevel('(12.(34)'), /Unmatched/);
//   assert.throws(() => parseTopLevel(')'), /Unmatched/);
// });

// /* ---------------------
//  * slice postfix tests
//  * --------------------- */

// test('postfix slice on flat expr', () => {
//   const out = evaluateExpression('23.78x1289[1:3]');
//   assert.deepEqual(out, ['78', 'x']);
// });

// test('postfix slice with negative end index -1', () => {
//   const out = evaluateExpression('23.78x1289[:-1]');
//   assert.deepEqual(out, ['23', '78', 'x']);
// });

// test('postfix slice with negative end index -2', () => {
//   const out = evaluateExpression('23.78x1289[:-2]');
//   assert.deepEqual(out, ['23', '78']);
// });

// test('postfix slice with end < start', () => {
//   const out = evaluateExpression('23.78x1289[2:1]');
//   assert.deepEqual(out, ['x', '78']);
// });

// test('postfix slice with end < start 2', () => {
//   const out = evaluateExpression('23.78x1289[2:0]');
//   assert.deepEqual(out, ['x', '78', '23']);
// });

// test('postfix reverse slice [-]', () => {
//   const out = evaluateExpression('(1.2.3.4)[-]');
//   assert.deepEqual(out, ['4', '3', '2', '1']);
// });

// test('postfix circular forward [i:>k]', () => {
//   const out = evaluateExpression('(a.b.c.d)[2:>3]');
//   assert.deepEqual(out, ['c', 'd', 'a']);
// });

// test('postfix circular backward [i:<]', () => {
//   const out = evaluateExpression('(a.b.c)[1:<]');
//   assert.deepEqual(out, ['b', 'a', 'c']);
// });

// test('chained postfix slices', () => {
//   const out = evaluateExpression('(1.2.3.4.5)[1:4][-]');
//   assert.deepEqual(out, ['4', '3', '2']);
// });

// test('chained postfix slices double negative', () => {
//   const out = evaluateExpression('(1.2.3.4.5)[1:4][-][-]');
//   assert.deepEqual(out, ['2', '3', '4']);
// });

// test('chained postfix slices double negative with slice in between', () => {
//   const out = evaluateExpression('(1.2.3.4.5)[-][1:3][-]');
//   assert.deepEqual(out, ['3', '4']);
// });

// test('postfix slice respects x as token+delimiter', () => {
//   const out = evaluateExpression('12.x.34[:2]');
//   assert.deepEqual(out, ['12', 'x']);
// });

// /* ---------------------
//  * comma operator tests
//  * --------------------- */

// test('comma operator: example from spec', () => {
//   const out = evaluateExpression('1x45.89,29');
//   // left: ["1","x","45","89"] -> doubled: ["1","x","45","89","45","x","1"]
//   // right: ["29"] -> len<=1 -> no-op
//   assert.deepEqual(out, ['1','x','45','89','45','x','1','29']);
// });

// test('comma operator with empty left', () => {
//   const out = evaluateExpression(',29');
//   assert.deepEqual(out, ['29']);
// });

// test('comma operator with empty right', () => {
//   const out = evaluateExpression('12.34,');
//   // left doubled: ["12","34","12"]
//   assert.deepEqual(out, ['12','34','12']);
// });

// test('comma operator both sides multi + slices per side', () => {
//   const out = evaluateExpression('(a.b.c)[1:3],(x.y)[-]');
//   // left base -> ["b","c"] -> doubled -> ["b","c","b"]
//   // right base -> ["y","x"] (reverse) -> len>1 -> ["y","x","y"]
//   assert.deepEqual(out, ['b','c','b','y','x','y']);
// });

// test('comma chaining is left-associative', () => {
//   // ((a , b) , c)
//   const out = evaluateExpression('a,b,c');
//   // a -> ["a"] (no-op), b -> ["b"] (no-op) => ["a","b"]
//   // then with c -> left ["a","b"] doubled -> ["a","b","a"]
//   // right ["c"] -> ["c"]
//   assert.deepEqual(out, ['a','b','a','c']);
// });

// test('comma respects low precedence vs dots and slices', () => {
//   const out = evaluateExpression('(1.2)[-].3 , 4.5[1:2]');
//   // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
//   // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
//   assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
// });

// test('pipe to set stage does not break processing', () => {
//   const out = evaluateExpression('6|(1.2)[-].3 , 4.5[1:2]');
//   // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
//   // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
//   assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
//   assert.equal(getStage(), 6);
// });

// test('pipe to set stage does not break processing 2', () => {
//   const out = evaluateExpression('5|(1.2)[-].3 , 4.5[1:2]');
//   // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
//   // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
//   assert.deepEqual(out, ['2','1','3', '1', '2', '5']);
//   assert.equal(getStage(), 5);
// });

// test('pipe to set stage: >1 char throws error', () => {
//   assert.throws(() => evaluateExpression('1E|'), /Couldn't parse stage/i);
//   assert.throws(() => evaluateExpression('51|x='), /Couldn't parse stage/i);
//   assert.throws(() => evaluateExpression('51E|x='), /Couldn't parse stage/i);
//   assert.throws(() => evaluateExpression('51Efdjrghdfs|x='), /Couldn't parse stage/i);
// });

// test('pipe to set stage: unrecognized place char throws error', () => {
//   assert.throws(() => evaluateExpression('x|'), /Couldn't parse stage/i);
//   assert.throws(() => evaluateExpression('z|'), /Couldn't parse stage/i);
// });

// test('double comma', () => {
//   const out = evaluateExpression('1.2.45,,');
//   // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
//   // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
//   assert.deepEqual(out, ['1', '2', '45', '2', '1',   '2', '45', '2', '1' ]);
// });

// test('double comma with brackets', () => {
//   const out = evaluateExpression('(1.2.45,),');
//   // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
//   // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
//   assert.deepEqual(out, ['1', '2', '45', '2', '1',  '2', '45', '2', '1' ]);
// });

// test('double comma with brackets either side', () => {
//   const out = evaluateExpression('(1.2.45,),(6.8.34)');
//   // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
//   // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
//   assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6' ]);
// });

// test('double comma with brackets either side', () => {
//   const out = evaluateExpression('(1.2.45,),(6.8.34,)');
//   // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
//   // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
//   assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6', '8', '34', '8', '6' ]);
// });

// /* ---------------------
//  * semicolon operator tests
//  * --------------------- */

// test('semicolon: basic example with stage=6', () => {
//   // 6|12.34.16;  -> ["12","34","16","34","56"]
//   const out = evaluateExpression('6|12.34.16;');
//   assert.deepEqual(out, ['12', '34', '16', '34', '56']);
// });

// test('semicolon: empty right side (only left doubled+inverted tail)', () => {
//   // left = ["12","34"] -> tail ["12"] -> invert@6 -> "56"
//   // result = ["12","34","56"]
//   const out = evaluateExpression('6|12.34;');
//   assert.deepEqual(out, ['12', '34', '56']);
// });

// test('semicolon: empty left side (only right doubled+inverted tail)', () => {
//   // right = ["12","34"] -> tail ["12"] -> invert@6 -> "56"
//   // result = ["12","34","56"]
//   const out = evaluateExpression('6|;12.34');
//   assert.deepEqual(out, ['12', '34', '56']);
// });

// test('semicolon: single-item side is a no-op (no tail to invert)', () => {
//   const out = evaluateExpression('6|12;');
//   assert.deepEqual(out, ['12']);
// });

// test('semicolon: requires stage to be set', () => {
//   assert.throws(() => evaluateExpression('12.34;'), /requires a valid stage/i);
// });

// test('semicolon: higher stage (10) inverts within "1234567890"', () => {
//   // stage=10 subset = "1234567890"
//   // left = ["12","90"] -> tail ["12"] -> invert -> "90"
//   // result = ["12","90","90"]
//   const out = evaluateExpression('0|12.90;');
//   assert.deepEqual(out, ['12', '90', '90']);
// });

// test('semicolon with slices per side', () => {
//   // left: (12.34.56)[1:3] -> ["34","56"] ; tail ["34"] -> invert@6 -> "34"
//   // => left result ["34","56","34"]
//   // right: (78)[-] -> ["78"] (single item; no tail)
//   // final = left ++ right
//   const out = evaluateExpression('6|(12.14.36)[1:3];(56)[-]');
//   assert.deepEqual(out, ['14', '36', '36', '56']);
// });

// test('semicolon mixed with comma (low precedence, left associative)', () => {
//   // left side of ';' first:
//   //   "6|12.34;" -> ["12","34","56"]
//   // then comma with "29":
//   //   comma doubles (non-inverting) each side:
//   //   leftD = ["12","34","56","34","12"]
//   //   rightD = ["29"]
//   // result = ["12","34","56","34","12","29"]
//   const out = evaluateExpression('8|12.34; , 5678');
//   assert.deepEqual(out, ['12', '34', '78', '34', '12', '5678']);
// });

// test('semicolon inside parentheses with outer semicolon empty right', () => {
//   // inner: (1.2.45,) evaluated with full rules:
//   //   left ["1","2","45"], right []
//   //   semicolon doubles+invert left only at stage=6:
//   //     tail ["1","2"] -> invert -> ["56","34"] (note: order after per-item reverse)
//   //     result inner = ["1","2","45","56","34"]
//   // outer: left is that list; right is empty -> only left doubled+inverted tail:
//   //   left has length >1, tail is ["1","2","45","56"] (reversed then inverted item-wise)
//   // For clarity we just assert the overall expected behavior from the earlier bugfix:
//   const out = evaluateExpression('6|(1.2.45,);');
//   // We expect the outer result to be left ++ inverted-tail-of-left.
//   // For a minimal invariant, just ensure it starts with the inner forward and is longer than inner:
//   assert.ok(out.length > 5 && out[0] === '1' && out[1] === '2' && out[2] === '45');
// });

// /* ---------------------
//  * multiplier N(<expr>) tests
//  * --------------------- */

// test('multiplier: basic repetition', () => {
//   const out = evaluateExpression('3(12.56)');
//   assert.deepEqual(out, ['12','56','12','56','12','56']);
// });

// test('multiplier: applies before per-segment slice', () => {
//   // 2 * (1.2.3) => [1,2,3,1,2,3], then [1:3] => [2,3]
//   const out = evaluateExpression('2(1.2.3)[1:3]');
//   assert.deepEqual(out, ['2','3']);
// });

// test('multiplier: left of comma (comma doubles AFTER multiplier+slice)', () => {
//   // left: 2(1.2) => [1,2,1,2] ; right: 3
//   // comma result = doubleUp(left) ++ doubleUp([3])
//   // doubleUp(left): [1,2,1,2,1,2,1]
//   // doubleUp([3]) is just [3]
//   const out = evaluateExpression('2(1.2),3');
//   assert.deepEqual(out, ['1','2','1','2','1','2','1','3']);
// });

// test('multiplier: left of semicolon with stage=6 (invert tail items)', () => {
//   // left: 2(12) => ["12","12"]
//   // ';' tail = ["12"] inverted@6 => "56"
//   // result: ["12","12","56"]
//   const out = evaluateExpression('6|2(12);');
//   assert.deepEqual(out, ['12','12','56']);
// });

// test('multiplier: nested multipliers', () => {
//   // 2(3(1)) => 2 * [1,1,1] => [1,1,1,1,1,1]
//   const out = evaluateExpression('2(3(1))');
//   assert.deepEqual(out, ['1','1','1','1','1','1']);
// });

// test('multiplier inside parentheses alongside another multiplied segment', () => {
//   // (2(1.2).3(4.5)) => [1,2,1,2,4,5,4,5,4,5]
//   const out = evaluateExpression('(2(1.2).3(4.5))');
//   assert.deepEqual(out, ['1','2','1','2','4','5','4','5','4','5']);
// });

// test('multiplier with slice and comma precedence', () => {
//   // 3(1.2)[-],3
//   // left: 3*(1,2) => [1,2,1,2,1,2] then reverse [-] => [2,1,2,1,2,1]
//   // comma doubles left then appends right (single element)
//   const out = evaluateExpression('3(1.2)[-],3');
//   assert.deepEqual(out, ['2','1','2','1','2','1','2','1','2','1','2','3']);
// });

// test('multiplier with per-segment slice in the middle of dot chain', () => {
//   // (1.2).2(3.4)[1:3].(5) =>
//   // segment1: [1,2]
//   // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
//   // segment3: [5]
//   const out = evaluateExpression('(1.2).2(3.4)[1:3].(5)');
//   assert.deepEqual(out, ['1','2','4','3','5']);
// });


// test('two times PB4 minus 1 notate at end, plus something else', () => {
//   // (1.2).2(3.4)[1:3].(5) =>
//   // segment1: [1,2]
//   // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
//   // segment3: [5]
//   const out = evaluateExpression('4|2(x14x14x14x12)[:-1].1234');
//   assert.deepEqual(out, ['x', '14', 'x', '14', 'x', '14', 'x', '12',   'x', '14', 'x', '14', 'x', '14', 'x', '1234']);
// });

// test('two times PB4 (as palindrome) minus 1 notate at end, plus something else', () => {
//   // (1.2).2(3.4)[1:3].(5) =>
//   // segment1: [1,2]
//   // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
//   // segment3: [5]
//   const out = evaluateExpression('4|2(x14x14,12)[:-1].1234');
//   assert.deepEqual(out, ['x', '14', 'x', '14', 'x', '14', 'x', '12',   'x', '14', 'x', '14', 'x', '14', 'x', '1234']);
// });

// test('two times double PB4 (as ,,) minus 1 notate at end, plus something else', () => {
//   // (1.2).2(3.4)[1:3].(5) =>
//   // segment1: [1,2]
//   // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
//   // segment3: [5]
//   const out = evaluateExpression('4|2(((x14,).34),12)[:-1].1234');
//   assert.deepEqual(out, ['x', '14', 'x', '34', 'x', '14', 'x', '12',   'x', '14', 'x', '34', 'x', '14', 'x', '1234']);
// });

// test('double darrowby expansion 1/4', () => {
//   const out = evaluateExpression('8|(3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36');
//   assert.deepEqual(out, 
//   	[
//       // 'x',  '36', 'x',  '34', 'x',  '36', 'x',
//       // '56', 'x',  '36', 'x',  '34', 'x',  '36',
//       // 'x',  '56', 'x',  '36', 'x',  '34', 'x',
//       // '36', 'x',  '14', 'x',  '58', 'x',  '58',
//       // 'x',  '58', 'x',  '56', 'x',  '58', 'x',
//       // '58', 'x',  '58', 'x',  '56', 'x',  '58',
//       // 'x',  '58', 'x',  '58', 'x',  '36'

//       // 3 leads of PB4 (in 3-6 place), trim 1 from end
//       'x', '36', 'x', '34', 'x', '36', 'x', '56',
//       'x', '36', 'x', '34', 'x', '36', 'x', '56',
//       'x', '36', 'x', '34', 'x', '36', 'x', 

//                          '14',   // treble from 1/2 to 3/4

//  	   // 3 leads of PB4 (in 5-8 place), trim 1 from end
//       'x', '58', 'x', '58', 'x', '58', 'x', '56',
//       'x', '58', 'x', '58', 'x', '58', 'x', '56',
//       'x', '58', 'x', '58', 'x', '58', 'x',

//                          '36',    // quarter symmetry point (Rot symm)
//     ]);

//   //x36x34x36x
//   //56x36x34x36
//   //x56x36x34x
//   //36x14x58x58
//   //x58x56x58x
//   //58x58x56x58
//   //x58x58x36

//   // then the doubled bit after first 1/4:
//   // x14x14x14x34x14x14x14x34x14x14x14x58x36x56x36x34x36x56x36x34x36x56x36x78,12

// });

// test('double darrowby expansion 1/2', () => {
//   const out = evaluateExpression('8|(3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36;78');

//   assert.deepEqual(out, 
//   	[
//       // 3 leads of double PB4 (in 3-6 place), trim 1 from end
//       'x', '36', 'x', '34', 'x', '36', 'x', '56',
//       'x', '36', 'x', '34', 'x', '36', 'x', '56',
//       'x', '36', 'x', '34', 'x', '36', 'x', 
                         
//                          '14',   // treble from 1/2 to 3/4

//  	   // 3 leads of PB4 (in 5-8 place), trim 1 from end
//       'x', '58', 'x', '58', 'x', '58', 'x', '56',
//       'x', '58', 'x', '58', 'x', '58', 'x', '56',
//       'x', '58', 'x', '58', 'x', '58', 'x',
                         
//                          '36',  // quarter symmetry point (Rot symm)

//       // ... reverse of above...
//              'x', '14', 'x', '14', 'x', '14', 'x',
//        '34', 'x', '14', 'x', '14', 'x', '14', 'x',
//        '34', 'x', '14', 'x', '14', 'x', '14', 'x',

//        					 '58',  // treble from 5/6 to 7/8

//              'x', '36', 'x', '56', 'x', '36', 'x',
//        '34', 'x', '36', 'x', '56', 'x', '36', 'x',
//        '34', 'x', '36', 'x', '56', 'x', '36', 'x',

//                          '78'  // half lead
//     ]);
// });

// test('double darrowby expansion full', () => {
//   // full lead:
//   // const out = evaluateExpression('8|((3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36;78),12');
//   // bristol-alike:
//   // based on minimus of x14xx14x14x i.e. 
//   //   this has 864 etc coursing, make less false with places on front:
//   // const out = evaluateExpression('8|((4(x36xx36x36x))[:-1].14.(4(x58xx58x58x))[:-1].36;78),12');

//   // const out = evaluateExpression('8|((2(x36x12.36.12.36.12))[2:<][:-1].14.(2(x58x12.58.12.58.12))[2:>][:-1].36;78),12');

 
//   // I can't believe it's not DD alliance royal:
//   //  ((5(x38x38x78,34))[:-1].14.(5(x50x50x90,56))[:-1].38x;90),12

//   // alliance royal: length 70 plain bob-alike to get peal length: 5076 changes (564 per lead)

//   // reg version pb variant:  x16x16x16x16x16x1256x56  -> in 5-10 place: x50x50x50x50x50x5690x90
//   // dble version pb variant: x16x16x56x16x16x1256x56  -> in 3-8 place:  x38x38x78x38x38x3478x78


//   // const out = evaluateExpression('6|((5(x16x16x56x16x16x1256x56)))[2:<][:-1]');


// // DDmajor: 
// //   3456 -> 4356 pt1
// //   6578 -> 6587 pt2  so last two swap in both...

// //  const out = evaluateExpression('0|(38.14.90.70;90),12');

//   // -- analysis of start->end mapping of PB4 bits:

//   // part1: 345678 -> 354768   AKA  123456 -> 132546  (2 swaps)
 
//   // part2: 748690 -> 476890   AKA  123456 -> 214356  (2 swaps)

//   // so any two even-row methods bits that don't repeat internally and do those changes will work.

//   // part1: 16.
//   // part2: 34.12

//   // 132546
//   // 132546
//   // 315264

//   // hmm, peal plain course has 78 09s at back -- ah, due to the dodges in my PB alike method at back. Can fix that.

//   // https://complib.org/composition/148579

//   // to ring 3948, call three bobbed leads (bobs: 14 as usual)  (true)


//   // ok, fixing my can't believe nethod to not do stuff at back that gets us tenors swapped at back:
//   // const out = evaluateExpression('0|((5(x38x38x78x38x38x3478x78))[2:<][:-1].14.(5(x50x50x50x50x50x5690x90))[:-1].38x;90),12');
//   // const out = evaluateExpression('0|((5(x38x38x78x38x38x3478x78))[2:<][:-1].14.(5(x50x50x50x50x50x56x50))[:-1].38x;90),12');


//   // true, no-diff, 4x78s at back though, using just pb6 at both. 2z coursing order.
//   // const out = evaluateExpression('0|((5(x38x38x38x38x38x34))[:-1].14.(5(x50x50x50x50x50x56))[:-1].38x;90),12');



//   // const out = evaluateExpression('0|((2(x38x38x38x38x38x34))[:-1].14.(3(x50x50x50x50x50x56))[:-1].38x;90),12');


//   // pal + double (align): for eire minor

//   // Factor 4 version. 
//   // works, but overly complicated, don't need ; cos we have = already
//   // const out = evaluateExpression('6|3.1.3=;x');

//   // Factor 8 version.
//   // works - but ';' is OTT since we have = already
//   // const out = evaluateExpression('6|3.1=;,x');

//   // works.
//   // Factor 8 version. ideal, only need ,, due to '='
//   // const out = evaluateExpression('6|3.1=,,x');

//   // Factor 4 version.
//   // works.
//   // const out = evaluateExpression('6|3.1.3=,x');

//   // simpler pal + internal example (factor 4)
//   // 
//   // interesting: 
//   //   DIFFERENTIAL: period=6 cycles=1,273,49,58,60E,T
//   // but is still double, as that's how we constructed the thing.
//   // so double methods don't guarantee the differential lines inside   <<<<--------------------------------------------------------
//   // them have rot sym? yes. they have pal though.
//   //
//   // ah. the simpler factor 4 version of pal + double aligned sym -- that's
//   // how we can get weird differentials where parts don't have rot sym?
//   // can't get those with the factor 8 version, then?
//   // const out = evaluateExpression('T|1x12x3x67=,67');

//   // bristol+double dublin
//   //  -false if you just append them
//   // const out = evaluateExpression('8|(x56x14.56x58.36.14x34.58x34x18,18).(x58x14.58x58.36.14x14.58x14x18,18)');
// //                                     (x58x14.58x58.36.14x14.58x14x18,18)
// //                                       ^     ^           ^     ^

//   // const out = evaluateExpression('8|(x58x14.56x58.36.14x34.58x34x18,18).(x56x14.58x58.36.14x34.58x14x18,18)');
// //                                       ^     ^           ^     ^           ^     ^           ^     ^

//     // THIS IS THE CORRECT ALTERETED bristol, dd:
//   // const out = evaluateExpression('8|(x56x14.56x58.36.14x34.58x34x18,18).(x58x14.58x58.36.14x14.58x14x18,18)');
// //                                    ^     ^           ^     ^           ^     ^           ^     ^

//   const out = evaluateExpression('8|(x56x14.56x58.36.14x14.58x14x18,18).(x58x14.58x58.36.14x34.58x34x18,18)');

//   // works.
//   // Factor 8 version
//   //  NOTE: factor 8 seems 'repetitive' given the factor 4 picture for same thing (pal + double-align)
//   //  but it needs less information to express. So it appears that is *is* factor 8 symmetry as a method.
//   // const out = evaluateExpression('6|34.16,,x');


//   console.log("Full lead: ", out.join("."));
// });

// ////////////////////////////////////////////////
// // mirror tests ('=' operator)

// test('equals operator: parsing digit and non-digit stage chars', () => {
//   assert.deepEqual(evaluateExpression('8|7='), ['27']);
//   assert.deepEqual(evaluateExpression('0|1='), ['10']);
//   assert.deepEqual(evaluateExpression('D|ET='), ['56ET']);
// });

// test('equals operator: x mirrors to x on any stage', () => {
//   assert.deepEqual(evaluateExpression('4|x='), ['x']);
//   assert.deepEqual(evaluateExpression('6|x='), ['x']);
//   assert.deepEqual(evaluateExpression('8|x='), ['x']);
//   assert.deepEqual(evaluateExpression('0|x='), ['x']);
//   assert.deepEqual(evaluateExpression('T|x='), ['x']);
//   assert.deepEqual(evaluateExpression('D|x='), ['x']);

//   // shouldn't be using x on odd stages, but check it goes to 'x' anyway
//   assert.deepEqual(evaluateExpression('5|x='), ['x']);
//   assert.deepEqual(evaluateExpression('C|x='), ['x']);
// });

// test('equals operator: stage 12, single token 120 -> 1230ET', () => {
//   const out = evaluateExpression('T|120=');
//   assert.deepEqual(out, ['1230ET']);
// });

// test('equals operator: stage 12, single token 36 -> 3670', () => {
//   const out = evaluateExpression('T|36=');
//   assert.deepEqual(out, ['3670']);
// });

// test('equals operator: leaves right side unchanged (passes through)', () => {
//   // Left: 36 -> 3670 (mirrored per stage 12); Right: "x" stays "x"
//   const out = evaluateExpression('T|36=,x');
//   // First '=' with empty right part due to ',', then ',' doubles acc and right.
//   // We only assert the immediate '=' behavior by isolating it:
//   const justEq = evaluateExpression('T|36=');
//   assert.deepEqual(justEq, ['3670']);
//   // And check that ',' still composes with an unmodified right:
//   const seq = evaluateExpression('T|36=.x'); // dot means simple concat of "x" segment after '=' result
//   assert.deepEqual(seq, ['3670', 'x']);
// });

// test('equals operator: empty right is allowed', () => {
//   const out = evaluateExpression('T|120=');
//   assert.deepEqual(out, ['1230ET']);
// });

// test('equals operator: mirror can go right to left', () => {
//   const out = evaluateExpression('T|0ET=');
//   assert.deepEqual(out, ['1230ET']);
// });

// test('equals operator: requires that stage is set', () => {
//   // ';' or '=' without stage is fine if there's nothing being mirrored (e.g. ";", "=")
//   assert.deepEqual(evaluateExpression(';'), []);
//   assert.deepEqual(evaluateExpression('='), []);

//   assert.throws(() => evaluateExpression('1='), /operator requires a valid stage/i);
//   assert.throws(() => evaluateExpression('9.8;'), /operator requires a valid stag/i);
  
//   assert.throws(() => evaluateExpression('120='), /operator requires a valid stage/i);
//   assert.throws(() => evaluateExpression('x.120=,'), /operator requires a valid stage/i);
// });

// test('equals operator: multiple tokens on left (applies per-token)', () => {
//   // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
//   const out = evaluateExpression('T|(12.36)=');
//   assert.deepEqual(out, ['12ET', '3670']);
// });

// test('equals operator: works on 16', () => {
//   // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
//   const out = evaluateExpression('D|1236=');
//   assert.deepEqual(out, ['1236EBCD']);
// });

// // for methods with internal symmetry, ',' and ';' are equivalent
// test('equals operator: can make double eire minor using =;', () => {
//   // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
//   const out = evaluateExpression('6|3.1.3=;x');
//   //34.16.34,x => 34.16.34.16.34.x
//   assert.deepEqual(out, ['34', '16', '34', '16', '34', 'x']);
// });

// // for methods with internal symmetry, ',' and ';' are equivalent
// test('equals operator: can make double eire minor using =,', () => {
//   // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
//   const out = evaluateExpression('6|3.1.3=,x');
//   //34.16.34,x => 34.16.34.16.34.x
//   assert.deepEqual(out, ['34', '16', '34', '16', '34', 'x']);
// });

// ////////////////////////////////////////////////
// // perm cycle tests (differential detection)

// test('identity is detected with period 1 and returns every char as separate cycle in one-char strings', () => {
//   const { cycles, period } = derivePermCycles('123456');
//   // for identity no-perm, each char is in its own separate cycle in the list
//   assert.deepEqual(cycles, ['1', '2', '3', '4', '5', '6']);
//   assert.equal(period, 1);
// });

// test('example: "21453" → ["12","345"], period 6', () => {
//   const { cycles, period } = derivePermCycles('21453');
//   assert.deepEqual(cycles, ['12', '345']);
//   assert.equal(period, 6);
// });

// test('identity permutation returns singletons; period 1', () => {
//   const { cycles, period } = derivePermCycles('12345');
//   assert.deepEqual(cycles, ['1','2','3','4','5']);
//   assert.equal(period, 1);
// });

// test('reverse permutation "54321" → ["15","24","3"]; period 2', () => {
//   const { cycles, period } = derivePermCycles('54321');
//   assert.deepEqual(cycles, ['15','24','3']);
//   assert.equal(period, 2);
// });

// test('large LCM: cycles (12)(345)(6789) → period 12', () => {
//   // Images: 1→2,2→1,3→4,4→5,5→3,6→7,7→8,8→9,9→6
//   const { cycles, period } = derivePermCycles('214537896');
//   assert.deepEqual(cycles, ['12','345','6789']);
//   assert.equal(period, 12);
// });

// test('custom/extended alphabet: rotation on first 12 symbols "1234567890ET"', () => {
//   // Use a rotation by +1: 1→2, 2→3, ... T→1
//   const alphabet = '1234567890ET';
//   const oneLine = '234567890ET1';
//   const { cycles, period } = derivePermCycles(oneLine, alphabet);
//   assert.deepEqual(cycles, [alphabet]);  // single 12-cycle
//   assert.equal(period, 12);
// });

// test('invalid: not a permutation (duplicate symbol)', () => {
//   assert.throws(() => derivePermCycles('1123'), /not a permutation/i);
// });

// test('invalid: symbol not in subset (n too small)', () => {
//   // n=4 so subset is "1234"; 'E' is invalid here
//   assert.throws(() => derivePermCycles('12E3'), /Invalid symbol/i);
// });

// // Optional: ensure extended rounds alphabet is respected when globally defined
// test('uses global ROUNDS_CHARS when second arg omitted (if defined)', () => {
//   global.ROUNDS_CHARS = 'PQRST';
//   const { cycles, period } = derivePermCycles('QRSTP');
//   assert.deepEqual(cycles, ['PQRST']);
//   assert.equal(period, 5);
//   delete global.ROUNDS_CHARS;
// });

// // Optional: ensure extended rounds alphabet is respected when globally defined
// test('criteria for differential detection behave as expected', () => {
//   // no cycles is considered no-differential
//   assert.equal(arePermCyclesConsideredDifferential([]), false);

//   assert.equal(arePermCyclesConsideredDifferential(["12345"]), false);
//   assert.equal(arePermCyclesConsideredDifferential(["2345", "1"]), false);

//   assert.equal(arePermCyclesConsideredDifferential(["534", "1", "2"]), false);
//   assert.equal(arePermCyclesConsideredDifferential(["54", "1", "2", "3"]), false);

//   assert.equal(arePermCyclesConsideredDifferential(["123", "45"]), true);
//   assert.equal(arePermCyclesConsideredDifferential(["123", "45", "6", "7", "8"]), true);

//   // cycles all being 1 is considered a differential
//   assert.equal(arePermCyclesConsideredDifferential(["6", "7", "8"]), true);

//   // single cycle of length 1 is NOT considered a differential
//   assert.equal(arePermCyclesConsideredDifferential(["1"]), false);

//   // two cycles of length 1 are considered a differential
//   assert.equal(arePermCyclesConsideredDifferential(["1", "2"]), true);
// });


// test('count87s identifies bum music at backstroke', () => {
//   assert.equal(count87s(["12345678", "12345687", "12345687", "12345678", "12345687", "12345678"], 8), 2);
// });

// test('count87s ignores bum music at handstroke', () => {
//   assert.equal(count87s(["12345678", "21435687", "12345678", "21435678", "12345678"], 8), 0);
// });

// test("count87s doesn't flag innocent rows", () => {
//   assert.equal(count87s(["12345678", "21345678", "21436578", "12346578"], 8), 0);
// });

// test("count87s doesn't flag backward tenors at backstroke on odd stages", () => {
//   assert.equal(count87s(["1234567", "2134567", "2143576", "1234657"], 7), 0);
// });

// ////// tenor dist measurement tests


// // Helper: approx compare arrays of numbers
// function approxEqualArray(actual, expected, eps = 1e-9) {
//   assert.equal(actual.length, expected.length, 'length mismatch');
//   for (let i = 0; i < actual.length; i++) {
//     assert.ok(Math.abs(actual[i] - expected[i]) <= eps, `idx ${i}: ${actual[i]} ≉ ${expected[i]}`);
//   }
// }

// test('stage 7: basic distribution for top two bells (7 & 6)', () => {
//   const rows = [
//     '1234567', // dist 1  (7@6, 6@5)
//     '1234657', // dist 2  (7@6, 6@4)
//     '1273456', // dist 4  (7@2, 6@6)
//     '7123456', // dist 6  (7@0, 6@6)
//     '1234567', // dist 1
//   ];
//   const out = measureTopPairDistances(7, rows);

//   // Expect percentages over 5 rows
//   const expected = [0, 40, 20, 0, 20, 0, 20];
//   // Compare after rounding to whole percentages for readability
//   const rounded = out.map(x => Math.round(x));
//   assert.deepEqual(rounded, expected);

//   // Also sanity: sum ≈ 100
//   const sum = out.reduce((a, b) => a + b, 0);
//   assert.ok(Math.abs(sum - 100) < 1e-9);
// });

// test('stage 12: uses E and T (top two), multiple separations', () => {
//   // Alphabet slice(0,12) = "1234567890ET"  => highest=T, below=E
//   const rows = [
//     '1234567890ET', // dist 1  (T@11, E@10)
//     '123456789E0T', // dist 2  (T@11, E@9)
//     'T123456789E0', // dist 10 (T@0,  E@10)
//   ];
//   const out = measureTopPairDistances(12, rows);

//   // Expect 3 distances each 1/3 of rows: indices 1, 2, 10 -> 33.333...%
//   const expectedSpots = { 1: 1/3*100, 2: 1/3*100, 10: 1/3*100 };
//   approxEqualArray(
//     out.map((p, i) => (expectedSpots[i] ?? 0)),
//     out,
//     1e-6
//   );

//   // Quick checks:
//   assert.ok(out[1] > 33 && out[1] < 34);
//   assert.ok(out[2] > 33 && out[2] < 34);
//   assert.ok(out[10] > 33 && out[10] < 34);
// });

// test('empty rows returns all zeros', () => {
//   const out = measureTopPairDistances(8, []);
//   assert.equal(out.length, 8);
//   assert.ok(out.every(x => x === 0));
// });

// ///////////////////////

// // test('count87s identifies bum music', () => {
// //   assert.equal(count87s(["1234567", "1234576", "1234576", "1234567"], 7), 1);
// // });


// ////////////////////////////////////////////////

// // test('double darrowby messabout', () => {
// //   // full lead:
// //   const out = evaluateExpression('8|((3(x36x34,56))[1:<][:-1].14.(3(x58x58,56))[:-1].36;78),12');

// //   // this works on blueline site!
// //   console.log("Full lead: ", out.join("."));
// // });

// test('experiments only', () => {
// 	// PB6 instead of minor, on 10!\

//   // full lead:
//   // const out = evaluateExpression('10|((3(x38x38x34,78))[:-1].14.(3(x50x50,56))[:-1].58;90),12');
//   // // differential: https://rsw.me.uk/blueline/methods/view?stage=10&notation=x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.14.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.58.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.70.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.90.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.70.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.58.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.14.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.12

//   // this courses ok! but FALSE
//   // lead head 1428693075 (Code: 2z)
//   // const out = evaluateExpression('10|((5(x38x38x34,78))[1:<][:-1].14.(5(x50x50,56))[1:>][:-1].38x;90),12');
//   //https://rsw.me.uk/blueline/methods/view?stage=10&notation=38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.14.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.38.x.38.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.70.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.90.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.70.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.38.x.38.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.14.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.12

//   // // 1302896745 (Code: 2z) FALSE
//   // const out = evaluateExpression('10|((5(x38x38x34,78))[2:<][:-1].14.(5(x50x50,56))[2:>][:-1].38x;90),12');

// 	// false
//   // const out = evaluateExpression('10|((5(x38x38x34,78))[4:<][:-1].14.(5(x50x50,56))[4:>][:-1].38x;90),12');

//   // TRUE but differential (NB 4 leads of bob minor, not 5!)
//   // const out = evaluateExpression('10|((4(x38x38x34,78))[:-1].14.(4(x50x50,56))[:-1].38x;90),12');

//   // TRUE, very differential
//   // const out = evaluateExpression('10|((3(x38x38x34,78))[:-1].14.(3(x50x50,56))[:-1].38x;90),12');

//   // true, v diff.
//   // const out = evaluateExpression('10|((2(x38x38x34,78))[:-1].14.(2(x50x50,56))[:-1].38x;90),12');

//   // true, diff.
//   // const out = evaluateExpression('10|((1(x38x38x34,78))[:-1].14.(1(x50x50,56))[:-1].38x;90),12');

// // ********************** THIS WORKS:

// 	// ARGH! uneven lengths of notate above! for pb bits. idiot.
// 	// fixed:
// 	// TRUE!  and decent CO:  1372085469 (Code: 2z)
// 	// 484 * 10.5 leads = 5082 changes, lovely peal :)
//   // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x50x50x90,56))[:-1].38x;90),12');
//   // https://rsw.me.uk/blueline/methods/view?stage=10&notation=x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.14.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.38.x.38.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.70.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.90.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.70.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.38.x.38.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.14.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.12

//   // 

//   // // just 1 bit of PB (and 2< on first bob bit):
//   // // TRUE, non diff, 1780694235 (Code: 2z):
//   // 100 rows per lead.  tenors split a bit though.
//   // const out = evaluateExpression('10|((1(x38x38x78,34))[2:<][:-1].14.(1(x50x50x90,56))[:-1].38x;90),12');
//   // //  https://rsw.me.uk/blueline/methods/view?stage=10&notation=x.38.x.34.x.38.x.38.x.78.x.14.x.50.x.50.x.90.x.50.x.50.x.38.x.38.x.16.x.16.x.12.x.16.x.16.x.70.x.34.x.38.x.38.x.78.x.38.x.90.x.38.x.78.x.38.x.38.x.34.x.70.x.16.x.16.x.12.x.16.x.16.x.38.x.38.x.50.x.50.x.90.x.50.x.50.x.14.x.78.x.38.x.38.x.34.x.38.x.12

//   // ok, 1063479528 (Code: 2z)
//   // const out = evaluateExpression('10|((1(x38x38x78,34))[3:<][:-1].14.(1(x50x50x90,56))[:-1].38x;90),12');
  
//   // ok too, 1540729638 (Code: 2z)
//   // 100 rows per lead
//   // const out = evaluateExpression('10|((1(x38x38x78,34))[4:<][:-1].14.(1(x50x50x90,56))[:-1].38x;90),12');
  
//   //ok: 1560428937 (Code: 2z)
//   // const out = evaluateExpression('10|((1(x38x38x78,34))[5:<][:-1].14.(1(x50x50x90,56))[:-1].38x;90),12');


//   // two leads of PB: is good.
//   // 1760459238 (Code: 2z)
//   // 196 rows per lead
//   // const out = evaluateExpression('10|((2(x38x38x78,34))[:-1].14.(2(x50x50x90,56))[:-1].38x;90),12');

//   // 30-pull dodges! 

//   // trying to make 4 hunt when 2 dodging pairs together:
// // 2split differential (just plain hunt)
//   // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(14.50.14.50.14.90,56))[:-1].38x;90),12');

//   // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x.50.x.50.x.90,56))[:-1].38x;90),12');

//   //  XXXXX true, works! bit pointy in places.   1372085469 (Code: 2z)  XXX
//   // -- nah, treble leaves hunt
//   // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x.50.14.50.14.90,56))[:-1].38x;90),12');

// // minor points idea

//  // const out = evaluateExpression('6|x16xx16xxx16xx16xx16xxx16xx;');

//  // const out = evaluateExpression('12|1(x123T).2(x145T).3(x167T).2(x189T).1(x10ET),1T');


// 	 // const out = evaluateExpression('12|1(x123T).2(x1T). 1(x10ET).2(x1T).   1(x145T).2(x1T). 1(x189T).2(x1T).   1(x167T).2(x1T)  ,1T');
//      // console.log("Out: ", out.join("."));

// 	// diff:
//   // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x.50.14.50.x.90,56))[:-1].38x;90),12');

// 	//1372085469 (Code: 2z), ok. alts to dodges (places+dodge)
// 	// XXXX no good, you'll get 09s at back. XXXXXX
//   // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x.1250.x.1250.x.90,56))[:-1].38x;90),12');


//   // rev bob 6:
//   //x16x16x56,16

//   // 
// });



// test('double eire simple extensions', () => {

// // darrowby simplest PH4:

//   // x36x36x18x58x58;18

//   // this is half a lead ok:
//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(1(x36x36,36))[:-1].14.(1(x58x58,58))[:-1].18;18').join("."));
//   // https://rsw.me.uk/blueline/methods/view?stage=8&notation=x.36.x.36.x.36.x.14.x.58.x.58.x.58.x.18.x.14.x.14.x.14.x.58.x.36.x.36.x.36.x.18


//   // almost it, differential:
//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(1(x36x36,36))[:-1].14.(1(x58x58,58))[:-1].18;18,18').join("."));
//   // https://rsw.me.uk/blueline/methods/view?stage=8&notation=x.36.x.36.x.36.x.14.x.58.x.58.x.58.x.18.x.14.x.14.x.14.x.58.x.36.x.36.x.36.x.18.x.36.x.36.x.36.x.58.x.14.x.14.x.14.x.18.x.58.x.58.x.58.x.14.x.36.x.36.x.36.x.18

//   // doing <1 on both PB4:
//   // not differential. tenors splitty though.
//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(1(x36x36,36))[1:<][:-1].14.(1(x58x58,58))[1:<][:-1].18;18,18').join("."));
//   //https://rsw.me.uk/blueline/methods/view?stage=8&notation=36.x.36.x.36.x.36.14.58.x.58.x.58.x.58.18.14.x.14.x.14.x.14.58.36.x.36.x.36.x.36.18.36.x.36.x.36.x.36.58.14.x.14.x.14.x.14.18.58.x.58.x.58.x.58.14.36.x.36.x.36.x.36.18

//   // down to singe dodge (shortened the PH):
//   // 3 blows at front, sadly  // console.log("darrowby simplest PH4: ", evaluateExpression('8|(1(x36,36))[1:<][:-1].14.(1(x58,58))[1:<][:-1].18;18,18').join("."));


//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(1(x36x36,36))[1:<][:-1].14.(1(x58x58,58))[1:<][:-1].18;18,18').join("."));

//   // palindromic principle:
//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(1(x36x36,36))[1:<][:-1].14.(1(x58x58,58))[1:<][:-1].18;x,18').join("."));
//   //https://rsw.me.uk/blueline/methods/view?stage=8&notation=36.x.36.x.36.x.36.14.58.x.58.x.58.x.58.18.14.x.14.x.14.x.14.58.36.x.36.x.36.x.36.x.36.x.36.x.36.x.36.58.14.x.14.x.14.x.14.18.58.x.58.x.58.x.58.14.36.x.36.x.36.x.36.18

//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(1(x36x36,36))[1:<][:-1].14.(1(x58x58,58))[1:<][:-1].18;18,18').join("."));

//   // INTERESTING: PB+4 (cambridgex2) CO:    14263857 (Code: f) So like Rutland.
//   // NICE, remember this.
//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(36.x.36.x,14).(58.x.58.x,36).(14.x.14.x,58).(36.x.36.x,18),18').join("."));
//   // https://rsw.me.uk/blueline/methods/view?stage=8&notation=36.x.36.x.36.x.36.14.58.x.58.x.58.x.58.36.14.x.14.x.14.x.14.58.36.x.36.x.36.x.36.18%2C18

//   // nice then cambridge 8 lead:
//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|((36.x.36.x,14).(58.x.58.x,36).(14.x.14.x,58).(36.x.36.x,18),18) . (x38x14x1258x36x14x58x16x78,12)').join("."));

// // C  M  C  M  C  M  CM
// // +1 3  1  3  1  3

// // 1  4  5  0  1

// // So CMCMC, or MMCCC.

// // superlative: 15738264 (Code: b)   8 5 2 6  -- so cambridge -1

// // rutland: 14263857 (Code: f)  camb + 3

// // my triple dodger: 18674523 (Code: k)  camb x 2

// // bristol: 14263857 (Code: m)  camb + 3





// // x.12.x.12  x.14.x.14.x.38.x.36.x.16.x.58.x.58.x.   18x78x1278x78x18    .x.58.x.58.x.16.x.36.x.38.x.14.x.14.x.12 .x.12.x.16
// // x.12.x.12  x.14.x.14.x.38.x.36.x.16.x.58.x.58.x.   18x78x1278,16
//   // THIS WORKS NOW. jeez.
//   console.log("darrowby simplest PH4: ",
//       evaluateExpression('8|((36.x.36.x,14).(58.x.58.x,36));18,18').join("."));
// // //                            36.x.36.x.36.x.36.14.58.x.58.x.58.x.58.36.14.x.14.x.14.x.14.58.36.x.36.x.36.x.36.18,18
// //    //                                          |  |                 |  |                 |  |                 |    

// // hmmm  x.12.x.12  x.14.x.14.x.38.x.36.x.16.x.58.x.38.x.   18x78x1278,16
// // last thing 2025-10-31: treble place thing: .12.56.12  x.14.x.14.x.38.x.36.x.16.x.58.x.38.x.   18x78x1478,16

//   // uneven alliance, ok CO, splits tenors:
//   // https://rsw.me.uk/blueline/methods/view?stage=8&notation=x.12.x.12%20%20x.14.x.14.x.38.x.36.x.16.x.58.x.58.x.18.x.58.x.58.x.16.x.36.x.38.x.14.x.14.x.12%20.x.12.x.12



//   // hmmm the ';' processing doesn't work recursively!

//     // ;, works
//       // evaluateExpression('0|(x.12.x);,56').join("."));

// // this doesn't,
//   // should be x.12.x.90.x. 90.x.12.x. 56
//   // console.log("mega symmetry try: ",
//   //     evaluateExpression('0|(x.12.x);;56').join("."));


//   console.log("mega symmetry try: ",
//       //
//       evaluateExpression('8|x14x14x38x36;18,12').join("."));
//       // ... this is this interesting alliance: code a:
//       //    https://rsw.me.uk/blueline/methods/view?stage=8&notation=x.14.x.14.x.38.x.36.x.16.x.58.x.58.x.18.x.58.x.58.x.16.x.36.x.38.x.14.x.14.x.12


//       // evaluateExpression('8|x14x14x38x36x').join("."));

//       // // works: get 12.x.12.34.90.x.90.56.90.x.90.34.12.x.12.1560
//       // evaluateExpression('0|14.x,34;38,x').join("."));
//       // //  also works: we get 12.x.90.34.12.x.90.56
//       // evaluateExpression('0|12.x;34;56').join("."));
//       // // this DOES work, makes "12.x.90.x.90" which is actually correct!
//       // evaluateExpression('0|12.x;;').join("."));



// //mine, then lead of bristol:
// // 36.x.36.x.36.x.36.14.58.x.58.x.58.x.58.36.14.x.14.x.14.x.14.58.36.x.36.x.36.x.36.18.36.x.36.x.36.x.36.58.14.x.14.x.14.x.14.36.58.x.58.x.58.x.58.14.36.x.36.x.36.x.36.18  .  X58X14.58X58.36.14X14.58X14X18X14X58.14X14.36.58X58.14X58X18


// // // WIP, hmmph. trickso.
// //   console.log("darrowby PH4  but pointsy: ",
// //       evaluateExpression('8|((36.x.36.x,14).(58.x.58.x,36));18,18').join("."));


//   // cut down version of NICE above:
//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(36.x,14).(58.x,36).(14.x,58).(36.x,18),18').join("."));
//   // console.log("darrowby simplest PH4: ", evaluateExpression('8|(36.x).(58).(14.x).(36.x),18').join("."));

// // (36.x.36.x,14).(58.x.58.x,36).(14.x.14.x,58).(36.x.36.x,18),18


// //     // works, maybe weird CO
// //   // gives  56.10.56.10.56.x
// //   console.log("Bigger eire: ", evaluateExpression('0|5.1.5=;x').join("."));

// //   // much better, good CO:
// //   // gives 56.10.56.10.56.10.56.10.56.x
// //   console.log("Bigger eire: ", evaluateExpression('0|5.1.5.1.5=;x').join("."));

// //   // (gives https://ringing.org/method/?notation=78.1B.78.1B.78.1B.78.1B.78.1B.78.1B.78.x&stage=14)
// //   // gives 78.1B.78.1B.78.1B.78.1B.78.1B.78.1B.78.x
// //   console.log("Bigger eire: ", evaluateExpression('B|7.1.7.1.7.1.7=;x').join("."));
// // });

// // variants:
// //
// // 1:<  true
// // https://rsw.me.uk/blueline/methods/view?stage=8&notation=36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.14.x.58.x.58.x.58.x.56.x.58.x.58.x.58.x.56.x.58.x.58.x.58.x.36.x.14.x.14.x.14.x.34.x.14.x.14.x.14.x.34.x.14.x.14.x.14.x.58.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.78.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.58.x.14.x.14.x.14.x.34.x.14.x.14.x.14.x.34.x.14.x.14.x.14.x.36.x.58.x.58.x.58.x.56.x.58.x.58.x.58.x.56.x.58.x.58.x.58.x.14.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.12
// //
// // 

//   // full lead:
//   // const out = evaluateExpression('8|((3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36;78),12');


// // test('double darrowby expansion full', () => {
// //   const out = evaluateExpression('8|(3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36;,12');
// //   assert.deepEqual(out, 
// //   	[
// //       'x', '36', 'x', '34', 'x', '36', 'x', '56', 'x', '36',
// //       'x', '34', 'x', '36', 'x', '56', 'x', '36', 'x', '34',
// //       'x', '36', 'x', '14', 'x', '58', 'x', '58', 'x', '58',
// //       'x', '56', 'x', '58', 'x', '58', 'x', '58', 'x', '56',
// //       'x', '58', 'x', '58', 'x', '58', 'x', '36', 'x', '14',
// //       'x', '14', 'x', '14', 'x', '34', 'x', '14', 'x', '14',
// //       'x', '14', 'x', '34', 'x', '14', 'x', '14', 'x', '14',
// //       'x', '58', 'x', '36', 'x', '56', 'x', '36', 'x', '34',
// //       'x', '36', 'x', '56', 'x', '36', 'x', '34', 'x', '36',
// //       'x', '56', 'x', '36', 'x'
// //     ]);
// // });

// });
// import { collapsePlaceNotation } from "./notation.js";

test('drive comp', () => {
  const ed_royal = evaluateExpression('0|-30-14-12.50.16-34-10-16-70.16-16.70,10');
  // 1648203957 (Code: l)
  // expanded PN: x30x14x12.50.16x34x10x16x70.16x16.70.16x16.70x16x10x34x16.50.12x14x30x10
  
  console.log("Ed's royal expanded PN:", ed_royal);

  console.log(collapsePlaceNotation(ed_royal));

//     M I X S B W F V H
// 354769820 – –             
// 795264830 – – –   –       
// 927465        –   –       
// 24967       –           – 
// 642395870   –   –   –     
// 643527890   –             –
// 45362               2     
// 63254     –         –     
// 426395870 –       –   –   
// 234567890   –             3

  // abingdon is same lead head and PB order as ed method.
  // see https://complib.org/method/36688

  // tenor masks: maps letter to position of tenor at lead head (handstroke) (including treble! 3 = 3rds place)
  masks = [
     // "B", "2",
     // "I", "3",
     // "V", "4",
     // "F", "5",
     // "S", "6",
     // "X", "7",   // but complib has this in 5th place at hand?!?!?!?! WTF. 7 is from what blueline site says. trust complib!
     // "M", "8",
     // "H", "9",
     // "W", "0",

    // complib confirmed:
       "B", "2",
       "I", "3",
       "F", "4",
       "X", "5",
       "V", "6",
       "M", "7",
       "S", "8",
       "H", "9",
       "W", "0",
    ];
});

//  in complib, ed's royal method with thee calls in order is a bob every lead:
//
//  M X I F B V S W H
//  7 5 3 4 2 6 8 0 9
//
// so tenor affected at everywhere except I, B.

// 848 original -- used on Ed's the music is 549.
// so defo could have nicer thing?
// what's the diff between the music? what are we missing?


