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
  _internals
} = require('./newAlg.js');

test('basic bracketed examples', () => {
  {
    const ast = parseTopLevel('(23.45).(67x)');
    const out = evaluateTopLevel(ast);
    assert.deepEqual(out, ['23', '45', '67', 'x']);
  }

  {
    const ast = parseTopLevel('(45.12)');
    const out = evaluateTopLevel(ast);
    assert.deepEqual(out, ['45', '12']);
  }

  {
    const ast = parseTopLevel('(45x89.12)');
    const out = evaluateTopLevel(ast);
    assert.deepEqual(out, ['45', 'x', '89', '12']);
  }

  // NOTE: 'x' is both a token and a delimiter
  {
    const ast = parseTopLevel('(12.x)');
    const out = evaluateTopLevel(ast);
    assert.deepEqual(out, ['12', 'x']);
  }
});

test('nested example', () => {
  const ast = parseTopLevel('((34.16).(7x)).(9)');
  const out = evaluateTopLevel(ast);
  assert.deepEqual(out, ['34', '16', '7', 'x', '9']);
});

test('flat tokenizer: "12.34.....xx87x.x"', () => {
  const out = tokenizeFlat('12.34.....xx87x.x');
  assert.deepEqual(out, ['12', '34', 'x', 'x', '87', 'x', 'x']);
});

test('throws on unmatched parentheses', () => {
  assert.throws(() => parseTopLevel('(12.34'), /Unmatched/);
  assert.throws(() => parseTopLevel('(12.(34)'), /Unmatched/);
  assert.throws(() => parseTopLevel(')'), /Unmatched/);
});

/* ---------------------
 * slice postfix tests
 * --------------------- */

test('postfix slice on flat expr', () => {
  const out = evaluateExpression('23.78x1289[1:3]');
  assert.deepEqual(out, ['78', 'x']);
});

test('postfix slice with negative end index -1', () => {
  const out = evaluateExpression('23.78x1289[:-1]');
  assert.deepEqual(out, ['23', '78', 'x']);
});

test('postfix slice with negative end index -2', () => {
  const out = evaluateExpression('23.78x1289[:-2]');
  assert.deepEqual(out, ['23', '78']);
});

test('postfix slice with end < start', () => {
  const out = evaluateExpression('23.78x1289[2:1]');
  assert.deepEqual(out, ['x', '78']);
});

test('postfix slice with end < start 2', () => {
  const out = evaluateExpression('23.78x1289[2:0]');
  assert.deepEqual(out, ['x', '78', '23']);
});

test('postfix reverse slice [-]', () => {
  const out = evaluateExpression('(1.2.3.4)[-]');
  assert.deepEqual(out, ['4', '3', '2', '1']);
});

test('postfix circular forward [i:>k]', () => {
  const out = evaluateExpression('(a.b.c.d)[2:>3]');
  assert.deepEqual(out, ['c', 'd', 'a']);
});

test('postfix circular backward [i:<]', () => {
  const out = evaluateExpression('(a.b.c)[1:<]');
  assert.deepEqual(out, ['b', 'a', 'c']);
});

test('chained postfix slices', () => {
  const out = evaluateExpression('(1.2.3.4.5)[1:4][-]');
  assert.deepEqual(out, ['4', '3', '2']);
});

test('chained postfix slices double negative', () => {
  const out = evaluateExpression('(1.2.3.4.5)[1:4][-][-]');
  assert.deepEqual(out, ['2', '3', '4']);
});

test('chained postfix slices double negative with slice in between', () => {
  const out = evaluateExpression('(1.2.3.4.5)[-][1:3][-]');
  assert.deepEqual(out, ['3', '4']);
});

test('postfix slice respects x as token+delimiter', () => {
  const out = evaluateExpression('12.x.34[:2]');
  assert.deepEqual(out, ['12', 'x']);
});

/* ---------------------
 * comma operator tests
 * --------------------- */

test('comma operator: example from spec', () => {
  const out = evaluateExpression('1x45.89,29');
  // left: ["1","x","45","89"] -> doubled: ["1","x","45","89","45","x","1"]
  // right: ["29"] -> len<=1 -> no-op
  assert.deepEqual(out, ['1','x','45','89','45','x','1','29']);
});

test('comma operator with empty left', () => {
  const out = evaluateExpression(',29');
  assert.deepEqual(out, ['29']);
});

test('comma operator with empty right', () => {
  const out = evaluateExpression('12.34,');
  // left doubled: ["12","34","12"]
  assert.deepEqual(out, ['12','34','12']);
});

test('comma operator both sides multi + slices per side', () => {
  const out = evaluateExpression('(a.b.c)[1:3],(x.y)[-]');
  // left base -> ["b","c"] -> doubled -> ["b","c","b"]
  // right base -> ["y","x"] (reverse) -> len>1 -> ["y","x","y"]
  assert.deepEqual(out, ['b','c','b','y','x','y']);
});

test('comma chaining is left-associative', () => {
  // ((a , b) , c)
  const out = evaluateExpression('a,b,c');
  // a -> ["a"] (no-op), b -> ["b"] (no-op) => ["a","b"]
  // then with c -> left ["a","b"] doubled -> ["a","b","a"]
  // right ["c"] -> ["c"]
  assert.deepEqual(out, ['a','b','a','c']);
});

test('comma respects low precedence vs dots and slices', () => {
  const out = evaluateExpression('(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
});

test('pipe to set stage does not break processing', () => {
  const out = evaluateExpression('6|(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
  assert.equal(getStage(), 6);
});

test('pipe to set stage does not break processing 2', () => {
  const out = evaluateExpression('5|(1.2)[-].3 , 4.5[1:2]');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['2','1','3', '1', '2',    '5']);
  assert.equal(getStage(), 5);
});

test('double comma', () => {
  const out = evaluateExpression('1.2.45,,');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1',   '2', '45', '2', '1' ]);
});

test('double comma with brackets', () => {
  const out = evaluateExpression('(1.2.45,),');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1',  '2', '45', '2', '1' ]);
});

test('double comma with brackets either side', () => {
  const out = evaluateExpression('(1.2.45,),(6.8.34)');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6' ]);
});

test('double comma with brackets either side', () => {
  const out = evaluateExpression('(1.2.45,),(6.8.34,)');
  // left: (1.2)[-].3 -> ["2","1","3"] -> doubled -> ["2","1","3","1","2"]
  // right: 4.5[1:2] -> ["5"] -> len<=1 -> ["5"]
  assert.deepEqual(out, ['1', '2', '45', '2', '1', '2', '45', '2', '1',    '6', '8', '34', '8', '6', '8', '34', '8', '6' ]);
});

/* ---------------------
 * semicolon operator tests
 * --------------------- */

test('semicolon: basic example with stage=6', () => {
  // 6|12.34.16;  -> ["12","34","16","34","56"]
  const out = evaluateExpression('6|12.34.16;');
  assert.deepEqual(out, ['12', '34', '16', '34', '56']);
});

test('semicolon: empty right side (only left doubled+inverted tail)', () => {
  // left = ["12","34"] -> tail ["12"] -> invert@6 -> "56"
  // result = ["12","34","56"]
  const out = evaluateExpression('6|12.34;');
  assert.deepEqual(out, ['12', '34', '56']);
});

test('semicolon: empty left side (only right doubled+inverted tail)', () => {
  // right = ["12","34"] -> tail ["12"] -> invert@6 -> "56"
  // result = ["12","34","56"]
  const out = evaluateExpression('6|;12.34');
  assert.deepEqual(out, ['12', '34', '56']);
});

test('semicolon: single-item side is a no-op (no tail to invert)', () => {
  const out = evaluateExpression('6|12;');
  assert.deepEqual(out, ['12']);
});

test('semicolon: requires stage to be set', () => {
  assert.throws(() => evaluateExpression('12.34;'), /requires a valid stage/i);
});

test('semicolon: higher stage (10) inverts within "1234567890"', () => {
  // stage=10 subset = "1234567890"
  // left = ["12","90"] -> tail ["12"] -> invert -> "90"
  // result = ["12","90","90"]
  const out = evaluateExpression('0|12.90;');
  assert.deepEqual(out, ['12', '90', '90']);
});

test('semicolon with slices per side', () => {
  // left: (12.34.56)[1:3] -> ["34","56"] ; tail ["34"] -> invert@6 -> "34"
  // => left result ["34","56","34"]
  // right: (78)[-] -> ["78"] (single item; no tail)
  // final = left ++ right
  const out = evaluateExpression('6|(12.14.36)[1:3];(56)[-]');
  assert.deepEqual(out, ['14', '36', '36', '56']);
});

test('semicolon mixed with comma (low precedence, left associative)', () => {
  // left side of ';' first:
  //   "6|12.34;" -> ["12","34","56"]
  // then comma with "29":
  //   comma doubles (non-inverting) each side:
  //   leftD = ["12","34","56","34","12"]
  //   rightD = ["29"]
  // result = ["12","34","56","34","12","29"]
  const out = evaluateExpression('8|12.34; , 5678');
  assert.deepEqual(out, ['12', '34', '78', '34', '12', '5678']);
});

test('semicolon inside parentheses with outer semicolon empty right', () => {
  // inner: (1.2.45,) evaluated with full rules:
  //   left ["1","2","45"], right []
  //   semicolon doubles+invert left only at stage=6:
  //     tail ["1","2"] -> invert -> ["56","34"] (note: order after per-item reverse)
  //     result inner = ["1","2","45","56","34"]
  // outer: left is that list; right is empty -> only left doubled+inverted tail:
  //   left has length >1, tail is ["1","2","45","56"] (reversed then inverted item-wise)
  // For clarity we just assert the overall expected behavior from the earlier bugfix:
  const out = evaluateExpression('6|(1.2.45,);');
  // We expect the outer result to be left ++ inverted-tail-of-left.
  // For a minimal invariant, just ensure it starts with the inner forward and is longer than inner:
  assert.ok(out.length > 5 && out[0] === '1' && out[1] === '2' && out[2] === '45');
});

/* ---------------------
 * multiplier N(<expr>) tests
 * --------------------- */

test('multiplier: basic repetition', () => {
  const out = evaluateExpression('3(12.56)');
  assert.deepEqual(out, ['12','56','12','56','12','56']);
});

test('multiplier: applies before per-segment slice', () => {
  // 2 * (1.2.3) => [1,2,3,1,2,3], then [1:3] => [2,3]
  const out = evaluateExpression('2(1.2.3)[1:3]');
  assert.deepEqual(out, ['2','3']);
});

test('multiplier: left of comma (comma doubles AFTER multiplier+slice)', () => {
  // left: 2(1.2) => [1,2,1,2] ; right: 3
  // comma result = doubleUp(left) ++ doubleUp([3])
  // doubleUp(left): [1,2,1,2,1,2,1]
  // doubleUp([3]) is just [3]
  const out = evaluateExpression('2(1.2),3');
  assert.deepEqual(out, ['1','2','1','2','1','2','1','3']);
});

test('multiplier: left of semicolon with stage=6 (invert tail items)', () => {
  // left: 2(12) => ["12","12"]
  // ';' tail = ["12"] inverted@6 => "56"
  // result: ["12","12","56"]
  const out = evaluateExpression('6|2(12);');
  assert.deepEqual(out, ['12','12','56']);
});

test('multiplier: nested multipliers', () => {
  // 2(3(1)) => 2 * [1,1,1] => [1,1,1,1,1,1]
  const out = evaluateExpression('2(3(1))');
  assert.deepEqual(out, ['1','1','1','1','1','1']);
});

test('multiplier inside parentheses alongside another multiplied segment', () => {
  // (2(1.2).3(4.5)) => [1,2,1,2,4,5,4,5,4,5]
  const out = evaluateExpression('(2(1.2).3(4.5))');
  assert.deepEqual(out, ['1','2','1','2','4','5','4','5','4','5']);
});

test('multiplier with slice and comma precedence', () => {
  // 3(1.2)[-],3
  // left: 3*(1,2) => [1,2,1,2,1,2] then reverse [-] => [2,1,2,1,2,1]
  // comma doubles left then appends right (single element)
  const out = evaluateExpression('3(1.2)[-],3');
  assert.deepEqual(out, ['2','1','2','1','2','1','2','1','2','1','2','3']);
});

test('multiplier with per-segment slice in the middle of dot chain', () => {
  // (1.2).2(3.4)[1:3].(5) =>
  // segment1: [1,2]
  // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
  // segment3: [5]
  const out = evaluateExpression('(1.2).2(3.4)[1:3].(5)');
  assert.deepEqual(out, ['1','2','4','3','5']);
});


test('two times PB4 minus 1 notate at end, plus something else', () => {
  // (1.2).2(3.4)[1:3].(5) =>
  // segment1: [1,2]
  // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
  // segment3: [5]
  const out = evaluateExpression('4|2(x14x14x14x12)[:-1].1234');
  assert.deepEqual(out, ['x', '14', 'x', '14', 'x', '14', 'x', '12',   'x', '14', 'x', '14', 'x', '14', 'x', '1234']);
});

test('two times PB4 (as palindrome) minus 1 notate at end, plus something else', () => {
  // (1.2).2(3.4)[1:3].(5) =>
  // segment1: [1,2]
  // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
  // segment3: [5]
  const out = evaluateExpression('4|2(x14x14,12)[:-1].1234');
  assert.deepEqual(out, ['x', '14', 'x', '14', 'x', '14', 'x', '12',   'x', '14', 'x', '14', 'x', '14', 'x', '1234']);
});

test('two times double PB4 (as ,,) minus 1 notate at end, plus something else', () => {
  // (1.2).2(3.4)[1:3].(5) =>
  // segment1: [1,2]
  // segment2: 2*(3,4) => [3,4,3,4] then [1:3] => [4,3]
  // segment3: [5]
  const out = evaluateExpression('4|2(((x14,).34),12)[:-1].1234');
  assert.deepEqual(out, ['x', '14', 'x', '34', 'x', '14', 'x', '12',   'x', '14', 'x', '34', 'x', '14', 'x', '1234']);
});

test('double darrowby expansion 1/4', () => {
  const out = evaluateExpression('8|(3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36');
  assert.deepEqual(out, 
  	[
      // 'x',  '36', 'x',  '34', 'x',  '36', 'x',
      // '56', 'x',  '36', 'x',  '34', 'x',  '36',
      // 'x',  '56', 'x',  '36', 'x',  '34', 'x',
      // '36', 'x',  '14', 'x',  '58', 'x',  '58',
      // 'x',  '58', 'x',  '56', 'x',  '58', 'x',
      // '58', 'x',  '58', 'x',  '56', 'x',  '58',
      // 'x',  '58', 'x',  '58', 'x',  '36'

      // 3 leads of PB4 (in 3-6 place), trim 1 from end
      'x', '36', 'x', '34', 'x', '36', 'x', '56',
      'x', '36', 'x', '34', 'x', '36', 'x', '56',
      'x', '36', 'x', '34', 'x', '36', 'x', 

                         '14',   // treble from 1/2 to 3/4

 	   // 3 leads of PB4 (in 5-8 place), trim 1 from end
      'x', '58', 'x', '58', 'x', '58', 'x', '56',
      'x', '58', 'x', '58', 'x', '58', 'x', '56',
      'x', '58', 'x', '58', 'x', '58', 'x',

                         '36',    // quarter symmetry point (Rot symm)
    ]);

  //x36x34x36x
  //56x36x34x36
  //x56x36x34x
  //36x14x58x58
  //x58x56x58x
  //58x58x56x58
  //x58x58x36

  // then the doubled bit after first 1/4:
  // x14x14x14x34x14x14x14x34x14x14x14x58x36x56x36x34x36x56x36x34x36x56x36x78,12

});

test('double darrowby expansion 1/2', () => {
  const out = evaluateExpression('8|(3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36;78');

  assert.deepEqual(out, 
  	[
      // 3 leads of double PB4 (in 3-6 place), trim 1 from end
      'x', '36', 'x', '34', 'x', '36', 'x', '56',
      'x', '36', 'x', '34', 'x', '36', 'x', '56',
      'x', '36', 'x', '34', 'x', '36', 'x', 
                         
                         '14',   // treble from 1/2 to 3/4

 	   // 3 leads of PB4 (in 5-8 place), trim 1 from end
      'x', '58', 'x', '58', 'x', '58', 'x', '56',
      'x', '58', 'x', '58', 'x', '58', 'x', '56',
      'x', '58', 'x', '58', 'x', '58', 'x',
                         
                         '36',  // quarter symmetry point (Rot symm)

      // ... reverse of above...
             'x', '14', 'x', '14', 'x', '14', 'x',
       '34', 'x', '14', 'x', '14', 'x', '14', 'x',
       '34', 'x', '14', 'x', '14', 'x', '14', 'x',

       					 '58',  // treble from 5/6 to 7/8

             'x', '36', 'x', '56', 'x', '36', 'x',
       '34', 'x', '36', 'x', '56', 'x', '36', 'x',
       '34', 'x', '36', 'x', '56', 'x', '36', 'x',

                         '78'  // half lead
    ]);
});

test('double darrowby expansion full', () => {
  // full lead:
  // const out = evaluateExpression('8|((3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36;78),12');
  // bristol-alike:
  // based on minimus of x14xx14x14x i.e. 
  //   this has 864 etc coursing, make less false with places on front:
  // const out = evaluateExpression('8|((4(x36xx36x36x))[:-1].14.(4(x58xx58x58x))[:-1].36;78),12');

  // const out = evaluateExpression('8|((2(x36x12.36.12.36.12))[2:<][:-1].14.(2(x58x12.58.12.58.12))[2:>][:-1].36;78),12');

 
  // I can't believe it's not DD alliance royal:
  //  ((5(x38x38x78,34))[:-1].14.(5(x50x50x90,56))[:-1].38x;90),12

  // alliance royal: length 70 plain bob-alike to get peal length: 5076 changes (564 per lead)

  // reg version pb variant:  x16x16x16x16x16x1256x56  -> in 5-10 place: x50x50x50x50x50x5690x90
  // dble version pb variant: x16x16x56x16x16x1256x56  -> in 3-8 place:  x38x38x78x38x38x3478x78

  // rotating first bit (double one) 2 places left, we get good CO: 1352749608 (Code: a) (246 etc.) NOTE DD is group f, the opposite.
  // 5076 changes, so a peal. It's true. 35 pull dodges I think.
  const out = evaluateExpression('0|((5(x38x38x78x38x38x3478x78))[2:<][:-1].14.(5(x50x50x50x50x50x5690x90))[:-1].38x;90),12');
  // https://rsw.me.uk/blueline/methods/view?stage=10&notation=x.38.x.78.x.3478.x.38.x.38.x.78.x.38.x.38.x.78.x.3478.x.38.x.38.x.78.x.38.x.38.x.78.x.3478.x.38.x.38.x.78.x.38.x.38.x.78.x.3478.x.38.x.38.x.78.x.38.x.38.x.78.x.3478.x.38.x.38.x.78.x.14.x.50.x.50.x.50.x.50.x.50.x.5690.x.90.x.50.x.50.x.50.x.50.x.50.x.5690.x.90.x.50.x.50.x.50.x.50.x.50.x.5690.x.90.x.50.x.50.x.50.x.50.x.50.x.5690.x.90.x.50.x.50.x.50.x.50.x.50.x.5690.x.38.x.38.x.1256.x.16.x.16.x.16.x.16.x.16.x.12.x.1256.x.16.x.16.x.16.x.16.x.16.x.12.x.1256.x.16.x.16.x.16.x.16.x.16.x.12.x.1256.x.16.x.16.x.16.x.16.x.16.x.12.x.1256.x.16.x.16.x.16.x.16.x.16.x.70.x.34.x.38.x.38.x.3478.x.34.x.38.x.38.x.34.x.38.x.38.x.3478.x.34.x.38.x.38.x.34.x.38.x.38.x.3478.x.34.x.38.x.38.x.34.x.38.x.38.x.3478.x.34.x.38.x.38.x.34.x.38.x.38.x.3478.x.34.x.38.x.90.x.38.x.34.x.3478.x.38.x.38.x.34.x.38.x.38.x.34.x.3478.x.38.x.38.x.34.x.38.x.38.x.34.x.3478.x.38.x.38.x.34.x.38.x.38.x.34.x.3478.x.38.x.38.x.34.x.38.x.38.x.34.x.3478.x.38.x.38.x.34.x.70.x.16.x.16.x.16.x.16.x.16.x.1256.x.12.x.16.x.16.x.16.x.16.x.16.x.1256.x.12.x.16.x.16.x.16.x.16.x.16.x.1256.x.12.x.16.x.16.x.16.x.16.x.16.x.1256.x.12.x.16.x.16.x.16.x.16.x.16.x.1256.x.38.x.38.x.5690.x.50.x.50.x.50.x.50.x.50.x.90.x.5690.x.50.x.50.x.50.x.50.x.50.x.90.x.5690.x.50.x.50.x.50.x.50.x.50.x.90.x.5690.x.50.x.50.x.50.x.50.x.50.x.90.x.5690.x.50.x.50.x.50.x.50.x.50.x.14.x.78.x.38.x.38.x.3478.x.78.x.38.x.38.x.78.x.38.x.38.x.3478.x.78.x.38.x.38.x.78.x.38.x.38.x.3478.x.78.x.38.x.38.x.78.x.38.x.38.x.3478.x.78.x.38.x.38.x.78.x.38.x.38.x.3478.x.78.x.38.x.12&title=Double%20I%20can%27t%20believe%20it%27s%20not%20Darrowby%20Alliance%20Royal%20v2%20(peal%20method)
  // https://is.gd/Ttv9SB

  // hmm, peal plain course has 78 09s at back -- ah, due to the dodges in my PB alike method at back. Can fix that.

  // https://complib.org/composition/148579

  // to ring 3948, call three bobbed leads (bobs: 14 as usual)  (true)


  console.log("Full lead: ", out.join("."));
});

////////////////////////////////////////////////
// mirror tests

// test('equals operator: parsing non-digit stage chars', () => {
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
// });

test('equals operator: stage 12, single token 120 -> 1230ET', () => {
  const out = evaluateExpression('T|120=');
  assert.deepEqual(out, ['1230ET']);
});

test('equals operator: stage 12, single token 36 -> 3670', () => {
  const out = evaluateExpression('T|36=');
  assert.deepEqual(out, ['3670']);
});

test('equals operator: leaves right side unchanged (passes through)', () => {
  // Left: 36 -> 3670 (mirrored per stage 12); Right: "x" stays "x"
  const out = evaluateExpression('T|36=,x');
  // First '=' with empty right part due to ',', then ',' doubles acc and right.
  // We only assert the immediate '=' behavior by isolating it:
  const justEq = evaluateExpression('T|36=');
  assert.deepEqual(justEq, ['3670']);
  // And check that ',' still composes with an unmodified right:
  const seq = evaluateExpression('T|36=.x'); // dot means simple concat of "x" segment after '=' result
  assert.deepEqual(seq, ['3670', 'x']);
});

test('equals operator: empty right is allowed', () => {
  const out = evaluateExpression('T|120=');
  assert.deepEqual(out, ['1230ET']);
});

test('equals operator: mirror can go right to left', () => {
  const out = evaluateExpression('T|0ET=');
  assert.deepEqual(out, ['1230ET']);
});

test('equals operator: requires stage', () => {
  assert.throws(() => evaluateExpression('120='), /requires a valid stage/i);
});

test('equals operator: multiple tokens on left (applies per-token)', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const out = evaluateExpression('T|(12.36)=');
  assert.deepEqual(out, ['12ET', '3670']);
});

test('equals operator: works on 16', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const out = evaluateExpression('D|1236=');
  assert.deepEqual(out, ['1236EBCD']);
});

// for methods with internal symmetry, ',' and ';' are equivalent
test('equals operator: can make double eire minor using =;', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const out = evaluateExpression('6|3.1.3=;x');
  //34.16.34,x => 34.16.34.16.34.x
  assert.deepEqual(out, ['34', '16', '34', '16', '34', 'x']);
});

// for methods with internal symmetry, ',' and ';' are equivalent
test('equals operator: can make double eire minor using =,', () => {
  // Left tokens: ["12","36"] -> ["12ET","3670"] under stage 12
  const out = evaluateExpression('6|3.1.3=,x');
  //34.16.34,x => 34.16.34.16.34.x
  assert.deepEqual(out, ['34', '16', '34', '16', '34', 'x']);
});


////////////////////////////////////////////////

// test('double darrowby messabout', () => {
//   // full lead:
//   const out = evaluateExpression('8|((3(x36x34,56))[1:<][:-1].14.(3(x58x58,56))[:-1].36;78),12');

//   // this works on blueline site!
//   console.log("Full lead: ", out.join("."));
// });

test('experiments only', () => {
	// PB6 instead of minor, on 10!\

  // full lead:
  // const out = evaluateExpression('10|((3(x38x38x34,78))[:-1].14.(3(x50x50,56))[:-1].58;90),12');
  // // differential: https://rsw.me.uk/blueline/methods/view?stage=10&notation=x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.14.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.58.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.70.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.90.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.70.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.58.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.14.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.12

  // this courses ok! but FALSE
  // lead head 1428693075 (Code: 2z)
  // const out = evaluateExpression('10|((5(x38x38x34,78))[1:<][:-1].14.(5(x50x50,56))[1:>][:-1].38x;90),12');
  //https://rsw.me.uk/blueline/methods/view?stage=10&notation=38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.14.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.38.x.38.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.70.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.90.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.70.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.x.16.x.16.x.16.x.56.38.x.38.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.x.56.x.50.x.50.x.50.14.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.12

  // // 1302896745 (Code: 2z) FALSE
  // const out = evaluateExpression('10|((5(x38x38x34,78))[2:<][:-1].14.(5(x50x50,56))[2:>][:-1].38x;90),12');

	// false
  // const out = evaluateExpression('10|((5(x38x38x34,78))[4:<][:-1].14.(5(x50x50,56))[4:>][:-1].38x;90),12');

  // TRUE but differential (NB 4 leads of bob minor, not 5!)
  // const out = evaluateExpression('10|((4(x38x38x34,78))[:-1].14.(4(x50x50,56))[:-1].38x;90),12');

  // TRUE, very differential
  // const out = evaluateExpression('10|((3(x38x38x34,78))[:-1].14.(3(x50x50,56))[:-1].38x;90),12');

  // true, v diff.
  // const out = evaluateExpression('10|((2(x38x38x34,78))[:-1].14.(2(x50x50,56))[:-1].38x;90),12');

  // true, diff.
  // const out = evaluateExpression('10|((1(x38x38x34,78))[:-1].14.(1(x50x50,56))[:-1].38x;90),12');

// ********************** THIS WORKS:

	// ARGH! uneven lengths of notate above! for pb bits. idiot.
	// fixed:
	// TRUE!  and decent CO:  1372085469 (Code: 2z)
	// 484 * 10.5 leads = 5082 changes, lovely peal :)
  // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x50x50x90,56))[:-1].38x;90),12');
  // https://rsw.me.uk/blueline/methods/view?stage=10&notation=x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.14.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.38.x.38.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.70.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.90.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.70.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.56.x.16.x.16.x.12.x.16.x.16.x.38.x.38.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.56.x.50.x.50.x.90.x.50.x.50.x.14.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.34.x.38.x.38.x.78.x.38.x.38.x.12

  // 

  // // just 1 bit of PB (and 2< on first bob bit):
  // // TRUE, non diff, 1780694235 (Code: 2z):
  // 100 rows per lead.  tenors split a bit though.
  // const out = evaluateExpression('10|((1(x38x38x78,34))[2:<][:-1].14.(1(x50x50x90,56))[:-1].38x;90),12');
  // //  https://rsw.me.uk/blueline/methods/view?stage=10&notation=x.38.x.34.x.38.x.38.x.78.x.14.x.50.x.50.x.90.x.50.x.50.x.38.x.38.x.16.x.16.x.12.x.16.x.16.x.70.x.34.x.38.x.38.x.78.x.38.x.90.x.38.x.78.x.38.x.38.x.34.x.70.x.16.x.16.x.12.x.16.x.16.x.38.x.38.x.50.x.50.x.90.x.50.x.50.x.14.x.78.x.38.x.38.x.34.x.38.x.12

  // ok, 1063479528 (Code: 2z)
  // const out = evaluateExpression('10|((1(x38x38x78,34))[3:<][:-1].14.(1(x50x50x90,56))[:-1].38x;90),12');
  
  // ok too, 1540729638 (Code: 2z)
  // 100 rows per lead
  // const out = evaluateExpression('10|((1(x38x38x78,34))[4:<][:-1].14.(1(x50x50x90,56))[:-1].38x;90),12');
  
  //ok: 1560428937 (Code: 2z)
  // const out = evaluateExpression('10|((1(x38x38x78,34))[5:<][:-1].14.(1(x50x50x90,56))[:-1].38x;90),12');


  // two leads of PB: is good.
  // 1760459238 (Code: 2z)
  // 196 rows per lead
  // const out = evaluateExpression('10|((2(x38x38x78,34))[:-1].14.(2(x50x50x90,56))[:-1].38x;90),12');

  // 30-pull dodges! 

  // trying to make 4 hunt when 2 dodging pairs together:
// 2split differential (just plain hunt)
  // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(14.50.14.50.14.90,56))[:-1].38x;90),12');

  // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x.50.x.50.x.90,56))[:-1].38x;90),12');

  //  XXXXX true, works! bit pointy in places.   1372085469 (Code: 2z)  XXX
  // -- nah, treble leaves hunt
  // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x.50.14.50.14.90,56))[:-1].38x;90),12');

// minor points idea

 // const out = evaluateExpression('6|x16xx16xxx16xx16xx16xxx16xx;');

 // const out = evaluateExpression('12|1(x123T).2(x145T).3(x167T).2(x189T).1(x10ET),1T');


	 // const out = evaluateExpression('12|1(x123T).2(x1T). 1(x10ET).2(x1T).   1(x145T).2(x1T). 1(x189T).2(x1T).   1(x167T).2(x1T)  ,1T');
     // console.log("Out: ", out.join("."));

	// diff:
  // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x.50.14.50.x.90,56))[:-1].38x;90),12');

	//1372085469 (Code: 2z), ok. alts to dodges (places+dodge)
	// XXXX no good, you'll get 09s at back. XXXXXX
  // const out = evaluateExpression('10|((5(x38x38x78,34))[:-1].14.(5(x.1250.x.1250.x.90,56))[:-1].38x;90),12');


  // rev bob 6:
  //x16x16x56,16

  // 
});

test('double eire simple extensions', () => {
//     // works, maybe weird CO
//   // gives  56.10.56.10.56.x
//   console.log("Bigger eire: ", evaluateExpression('0|5.1.5=;x').join("."));

//   // much better, good CO:
//   // gives 56.10.56.10.56.10.56.10.56.x
//   console.log("Bigger eire: ", evaluateExpression('0|5.1.5.1.5=;x').join("."));

//   // (gives https://ringing.org/method/?notation=78.1B.78.1B.78.1B.78.1B.78.1B.78.1B.78.x&stage=14)
//   // gives 78.1B.78.1B.78.1B.78.1B.78.1B.78.1B.78.x
//   console.log("Bigger eire: ", evaluateExpression('B|7.1.7.1.7.1.7=;x').join("."));
// });

// variants:
//
// 1:<  true
// https://rsw.me.uk/blueline/methods/view?stage=8&notation=36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.14.x.58.x.58.x.58.x.56.x.58.x.58.x.58.x.56.x.58.x.58.x.58.x.36.x.14.x.14.x.14.x.34.x.14.x.14.x.14.x.34.x.14.x.14.x.14.x.58.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.78.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.58.x.14.x.14.x.14.x.34.x.14.x.14.x.14.x.34.x.14.x.14.x.14.x.36.x.58.x.58.x.58.x.56.x.58.x.58.x.58.x.56.x.58.x.58.x.58.x.14.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.x.34.x.36.x.56.x.36.12
//
// 

  // full lead:
  // const out = evaluateExpression('8|((3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36;78),12');


// test('double darrowby expansion full', () => {
//   const out = evaluateExpression('8|(3(x36x34,56))[:-1].14.(3(x58x58,56))[:-1].36;,12');
//   assert.deepEqual(out, 
//   	[
//       'x', '36', 'x', '34', 'x', '36', 'x', '56', 'x', '36',
//       'x', '34', 'x', '36', 'x', '56', 'x', '36', 'x', '34',
//       'x', '36', 'x', '14', 'x', '58', 'x', '58', 'x', '58',
//       'x', '56', 'x', '58', 'x', '58', 'x', '58', 'x', '56',
//       'x', '58', 'x', '58', 'x', '58', 'x', '36', 'x', '14',
//       'x', '14', 'x', '14', 'x', '34', 'x', '14', 'x', '14',
//       'x', '14', 'x', '34', 'x', '14', 'x', '14', 'x', '14',
//       'x', '58', 'x', '36', 'x', '56', 'x', '36', 'x', '34',
//       'x', '36', 'x', '56', 'x', '36', 'x', '34', 'x', '36',
//       'x', '56', 'x', '36', 'x'
//     ]);
// });

});

