# notation.py
# notation.py (canonical)

from itertools import combinations
from typing import List, Iterable, Iterator, Sequence, Tuple, Optional
import sys
import math
from itertools import islice

from .defs import *
from .helpers import *
from .encode_decode import *
from .pn_mirror import *
from .pn_canonical import *
from .enumerate import *

def _min_rotation(tokens: Sequence[str]) -> Tuple[str, ...]:
    """
    Booth's algorithm generalized to sequences (not just strings).
    Returns the lexicographically smallest rotation as a tuple.
    """
    n = len(tokens)
    if n == 0:
        return tuple()

    i, j, k = 0, 1, 0
    while i < n and j < n and k < n:
        a = tokens[(i + k) % n]
        b = tokens[(j + k) % n]
        if a == b:
            k += 1
            continue
        if a > b:
            i = i + k + 1
            if i == j:
                i += 1
        else:
            j = j + k + 1
            if i == j:
                j += 1
        k = 0
    start = min(i, j)
    return tuple(tokens[start:]) + tuple(tokens[:start])

def iter_notate_combos_no_rotations(
    notates: Sequence[str], rows: int
) -> Iterator[Tuple[str, ...]]:
    """
    Stream all valid sequences (length = rows) under the rules:
      • For i > 0, seq[i] != seq[i-1]
      • For the last index i == rows-1, seq[i] != seq[0]
    BUT emit only one representative per rotation-equivalence class
    (i.e., sequences that are rotations of each other are considered duplicates).

    Yields:
      Tuples of strings, one at a time (canonical representatives).
    """
    if rows <= 0 or not notates:
        return
    if rows == 1:
        # The only row is both first and last; last can't match first -> no solutions.
        return

    seq: list[Optional[str]] = [None] * rows
    seen_canonicals: set[Tuple[str, ...]] = set()

    def backtrack(i: int) -> Iterator[Tuple[str, ...]]:
        if i == rows:
            combo = tuple(seq)  # type: ignore[arg-type]
            canonical = _min_rotation(combo)
            if canonical not in seen_canonicals:
                seen_canonicals.add(canonical)
                yield combo
            return

        for token in notates:
            if i > 0 and token == seq[i - 1]:
                continue
            if i == rows - 1 and token == seq[0]:
                continue
            seq[i] = token
            yield from backtrack(i + 1)

    yield from backtrack(0)


def say_hello():
    print("\nhello from say_hello\n")


# --------- Self-tests (run: python notation.py) ---------
if __name__ == "__main__":
    import unittest

    class TestNotationCanonical(unittest.TestCase):
        def test_rounds(self):
            for stage in range(-2, STAGE_MIN):
                self.assertEqual(clamp_stage(stage), STAGE_MIN)
            for stage in range(STAGE_MAX+1, STAGE_MAX+5):
                self.assertEqual(clamp_stage(stage), STAGE_MAX)
            self.assertEqual(clamp_stage(100000), 16)
            self.assertEqual(rounds_for_stage(6), "123456")
            self.assertEqual(rounds_for_stage(8), "12345678")
            self.assertEqual(rounds_for_stage(9), "123456789")
            self.assertEqual(rounds_for_stage(12), "1234567890ET")

        def test_tokenize(self):
            self.assertEqual(tokenize_segment("xxx"), ["x", "x", "x"])
            self.assertEqual(tokenize_segment("x12x.16.34.58.xx10.ET"), ["x", "12", "x", "16", "34", "58", "x", "x", "10", "ET"])
            self.assertEqual(tokenize_segment(" e . t "), ["E", "T"])
            self.assertEqual(tokenize_segment("x12a.!!34"), ["x", "12", "34"])
            self.assertEqual(tokenize_segment(""), [])

        def test_commas(self):
            self.assertEqual(
                expand_place_notation_to_string_list("x56,78", 8),
                ["x", "56", "x", "78"],
            )

        def test_semicolon_ph5(self):
            self.assertEqual(
                expand_place_notation_to_string_list("5.1.5;1", 5),
                ['5', '1', '5', '1', '5', '1', '5', '1', '5', '1'],
            )

        def test_mirror_places_within_token(self):
            self.assertEqual(mirror_places_within_token("", stage=3), "")

            for stage in range(STAGE_MIN, STAGE_MAX+1):
                self.assertEqual(mirror_places_within_token("x", stage), "x")
                self.assertEqual(mirror_places_within_token("", stage), "")

            for stage in range(STAGE_MIN, STAGE_MAX+1):
                place_char = STAGE_SYMBOLS[stage-1]
                self.assertEqual(mirror_places_within_token(mirror_places_within_token(place_char, stage), stage), place_char)

            self.assertEqual(mirror_places_within_token("1234567890ET", stage=12), "1234567890ET")

            self.assertEqual(mirror_places_within_token("1", stage=3), "3")
            self.assertEqual(mirror_places_within_token("1", stage=4), "4")
            self.assertEqual(mirror_places_within_token("1", stage=5), "5")
            self.assertEqual(mirror_places_within_token("1", stage=6), "6")
            self.assertEqual(mirror_places_within_token("1", stage=7), "7")
            self.assertEqual(mirror_places_within_token("1", stage=8), "8")
            self.assertEqual(mirror_places_within_token("1", stage=9), "9")
            self.assertEqual(mirror_places_within_token("1", stage=10), "0")
            self.assertEqual(mirror_places_within_token("1", stage=11), "E")
            self.assertEqual(mirror_places_within_token("1", stage=12), "T")

            self.assertEqual(mirror_places_within_token("3", stage=3), "1")
            self.assertEqual(mirror_places_within_token("4", stage=4), "1")
            self.assertEqual(mirror_places_within_token("5", stage=5), "1")
            self.assertEqual(mirror_places_within_token("6", stage=6), "1")
            self.assertEqual(mirror_places_within_token("7", stage=7), "1")
            self.assertEqual(mirror_places_within_token("8", stage=8), "1")
            self.assertEqual(mirror_places_within_token("9", stage=9), "1")
            self.assertEqual(mirror_places_within_token("0", stage=10), "1")
            self.assertEqual(mirror_places_within_token("E", stage=11), "1")
            self.assertEqual(mirror_places_within_token("T", stage=12), "1")

            self.assertEqual(mirror_places_within_token("12", stage=3), "23")
            self.assertEqual(mirror_places_within_token("12", stage=4), "34")
            self.assertEqual(mirror_places_within_token("12", stage=5), "45")
            self.assertEqual(mirror_places_within_token("12", stage=6), "56")
            self.assertEqual(mirror_places_within_token("12", stage=7), "67")
            self.assertEqual(mirror_places_within_token("12", stage=8), "78")
            self.assertEqual(mirror_places_within_token("12", stage=9), "89")
            self.assertEqual(mirror_places_within_token("12", stage=10), "90")
            self.assertEqual(mirror_places_within_token("12", stage=11), "0E")
            self.assertEqual(mirror_places_within_token("12", stage=12), "ET")

            self.assertEqual(mirror_places_within_token("13", stage=3), "13")
            self.assertEqual(mirror_places_within_token("14", stage=4), "14")
            self.assertEqual(mirror_places_within_token("15", stage=5), "15")
            self.assertEqual(mirror_places_within_token("16", stage=6), "16")
            self.assertEqual(mirror_places_within_token("17", stage=7), "17")
            self.assertEqual(mirror_places_within_token("18", stage=8), "18")
            self.assertEqual(mirror_places_within_token("19", stage=9), "19")
            self.assertEqual(mirror_places_within_token("10", stage=10), "10")
            self.assertEqual(mirror_places_within_token("1E", stage=11), "1E")
            self.assertEqual(mirror_places_within_token("1T", stage=12), "1T")

            self.assertEqual(mirror_places_within_token("145", stage=5), "125")
            self.assertEqual(mirror_places_within_token("1256", stage=6), "1256")

        def test_semicolon_on_odd_stage_original_odd(self):
            # Original on odd number is expressible as ";1"
            self.assertEqual(expand_rotation_notation_to_palindrome_string_list(";1", 3), ["3", ",", "1"])
            self.assertEqual(expand_rotation_notation_to_palindrome_string_list(";1", 5), ["5", ",", "1"])
            self.assertEqual(expand_rotation_notation_to_palindrome_string_list(";1", 7), ["7", ",", "1"])
            self.assertEqual(expand_rotation_notation_to_palindrome_string_list(";1", 11), ["E", ",", "1"])

        def test_semicolon_on_bristol_simplify_to_comma_string(self):

            # bristol = ['x', '58', 'x', '14', '58', 'x', '58', '36', '14', 'x', '14', '58', 'x', '14', 'x', '18', 'x', '14', 'x', '58', '14', 'x', '14', '36', '58', 'x', '58', '14', 'x', '58', 'x', '18']
            # expect_bristol = collapse_place_notation(['x', '58', 'x', '14', '58', 'x', '58', '36', '14', 'x', '14', '58', 'x', '14', 'x', '18', 'x', '14', 'x', '58', '14', 'x', '14', '36', '58', 'x', '58', '14', 'x', '58', 'x', '18'])
            # # print(f"\nit is: |{expect_bristol}|")

            bristol_palindrome_notation = "x58x14.58x58.36.14x14.58x14x18,18"
            self.assertEqual(expand_rotation_notation_to_palindrome_notation("x58x14.58x58.36;18", 8), bristol_palindrome_notation)

        def test_semicolon_on_bristol_simplify_to_notaton_list(self):

            bristol_palindrome_notate_list = ['x', '58', 'x', '14', '58', 'x', '58', '36', '14', 'x', '14', '58', 'x', '14', 'x', '18', ',', '18']
            self.assertEqual(expand_rotation_notation_to_palindrome_string_list("x58x14.58x58.36;18", 8), bristol_palindrome_notate_list)

        def test_semicolon(self):
            self.assertEqual(
                expand_rotation_notation_to_palindrome_string_list("12x58.16;36", 8),
                ["12", "x", "58", "16", "14", "x", "78", "36", ",", "36"]
            )

        def test_apply_and_generate(self):
            self.assertEqual(apply_token_to_row("1234567", "34", 7), "2134657")
            self.assertEqual(apply_token_to_row("12345678", "34", 8), "21346587")

            pn = "x14x14x14x12"
            rows = generate_list(pn, stage=4, max_leads=12)
            r = rounds_for_stage(4)
            self.assertEqual(rows[0], r)
            self.assertEqual(rows[-1], r)
            lead_len = len(tokenize_segment(pn))
            self.assertEqual((len(rows) - 1) % lead_len, 0)
            self.assertEqual((len(rows) - 1) // lead_len, 3)

        def test_collapse(self):
            self.assertEqual(collapse_place_notation(["x", "12", "56", "x", "78"]), "x12.56x78")
            orig = "x12.16.34x"
            self.assertEqual(collapse_place_notation(tokenize_segment(orig)), orig)

        def test_canonical_form(self):
            self.assertEqual(canonical_form("", stage=8), "")
            self.assertEqual(canonical_form("x", stage=8), "x")
            self.assertEqual(canonical_form("x12", stage=8), "12x")

        def test_rotation(self):
            self.assertEqual(rotation_as_string_list("", 4, 0), [])
            self.assertEqual(rotation_as_string_list("", 4, 1), [])
            self.assertEqual(rotation_as_string_list("", 4, -1), [])

            self.assertEqual(rotation_as_string_list("x", 2, 0), ["x"])
            self.assertEqual(rotation_as_string_list("x", 6, 1), ["x"])
            self.assertEqual(rotation_as_string_list("x", 10, -1), ["x"])


            self.assertEqual(rotation_as_string_list("1278", 8, 0), ["1278"])
            self.assertEqual(rotation_as_string_list("1278", 8, 1), ["1278"])
            self.assertEqual(rotation_as_string_list("1278", 8, -1), ["1278"])

            self.assertEqual(rotation_as_string_list("12.34.56", 6, 0), ["12", "34", "56"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, 1), ["56", "12", "34"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, 2), ["34", "56", "12"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, 3), ["12", "34", "56"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, 6), ["12", "34", "56"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, 99), ["12", "34", "56"])

            self.assertEqual(rotation_as_string_list("12.34.56", 6, -2), ["56", "12", "34"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, -1), ["34", "56", "12"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, -3), ["12", "34", "56"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, -6), ["12", "34", "56"])
            self.assertEqual(rotation_as_string_list("12.34.56", 6, -99), ["12", "34", "56"])

            self.assertEqual(all_rotations("", 6), [])
            self.assertEqual(all_rotations("12x", 6), ["12x", "x12"])
            self.assertEqual(all_rotations("12.34.56", 6), ["12.34.56", "56.12.34", "34.56.12"])

            # all_rots = all_rotations("12.34.56", 6), ["12.34.56", "56.12.34", "34.56.12"]
            # print("Sorted: ", sorted(all_rots))

            # TODO get rid of stage where not needed!
            self.assertEqual(True, are_rotation_of_each_other("", "", 8))
            self.assertEqual(True, are_rotation_of_each_other("x", "x", 8))
            self.assertEqual(True, are_rotation_of_each_other("12x", "12x", 8))
            self.assertEqual(True, are_rotation_of_each_other("3478", "3478", 8))

            self.assertEqual(True, are_rotation_of_each_other("12x", "x12", 8))
            self.assertEqual(True, are_rotation_of_each_other("34.78", "78.34", 8))

            self.assertEqual(True, are_rotation_of_each_other("12x12x14", "12x12x14", 8))
            self.assertEqual(True, are_rotation_of_each_other("12x12x14", "x12x14.12", 8))
            self.assertEqual(True, are_rotation_of_each_other("12x12x14", "12x12x14", 8))
            self.assertEqual(True, are_rotation_of_each_other("12x12x14", "14.12x12x", 8))

            self.assertEqual(True, are_rotation_of_each_other(";1", "3.1", 3))
            self.assertEqual(True, are_rotation_of_each_other(";1", "1.3", 3))
            self.assertEqual(False, are_rotation_of_each_other(";1", "3.3", 3))
            self.assertEqual(False, are_rotation_of_each_other(";1", "1.1", 3))
            self.assertEqual(False, are_rotation_of_each_other(";1", "1", 3))
            self.assertEqual(False, are_rotation_of_each_other(";1", "3.1.3", 3))

        def test_double_detection(self):
            self.assertEqual(True, is_double_notate("14", 4))
            self.assertEqual(True, is_double_notate("123", 3))

            self.assertEqual(True, is_double_notate("x", 4))
            self.assertEqual(True, is_double_notate("x", 6))
            self.assertEqual(True, is_double_notate("x", 8))
            self.assertEqual(True, is_double_notate("x", 10))
            self.assertEqual(True, is_double_notate("x", 12))

            self.assertEqual(True, is_double_notate("1234", 4))
            self.assertEqual(True, is_double_notate("14", 4))
            self.assertEqual(True, is_double_notate("1256", 6))
            self.assertEqual(True, is_double_notate("16", 6))
            self.assertEqual(True, is_double_notate("34", 6))

            self.assertEqual(False, is_double_notate("x", 3))
            self.assertEqual(False, is_double_notate("x", 5))
            self.assertEqual(False, is_double_notate("x", 7))
            self.assertEqual(False, is_double_notate("x", 9))
            self.assertEqual(False, is_double_notate("x", 11))

            self.assertEqual(False, is_double_notate("1", 3))
            # weirdly formed, but technically double?
            self.assertEqual(True, is_double_notate("2", 3))
            self.assertEqual(False, is_double_notate("3", 3))

            self.assertEqual(False, is_double_notate("1256", 8))
            self.assertEqual(False, is_double_notate("16", 8))

        def test_generate_pn(self):
            self.assertEqual(["||"],
                all_possible_notation_schemes(stage=2, places=2))
            self.assertEqual(["12"],
                all_possible_notation(stage=2, places=2))

            self.assertEqual(["*"],
                all_possible_notation_schemes(stage=2, places=0))
            self.assertEqual(["x"],
                all_possible_notation(stage=2, places=0))

            self.assertEqual(["||*", "|*|", "*||"],
                all_possible_notation_schemes(stage=4, places=2))
            self.assertEqual(["12", "14", "34"],
                all_possible_notation(stage=4, places=2))

            self.assertEqual(["|||*", "||*|", "|*||", "*|||"],
                all_possible_notation_schemes(stage=5, places=3))
            self.assertEqual(["123", "125", "145", "345"],
                all_possible_notation(stage=5, places=3))

            self.assertEqual(["|||||"],
                all_possible_notation_schemes(stage=5, places=5))
            self.assertEqual(["12345"],
                all_possible_notation(stage=5, places=5))

            self.assertEqual(["|**", "*|*", "**|"],
                all_possible_notation_schemes(stage=5, places=1))
            self.assertEqual(["1", "3", "5"],
                all_possible_notation(stage=5, places=1))

            self.assertEqual(["||**", "|*|*", "|**|", "*||*", "*|*|", "**||"],
                all_possible_notation_schemes(stage=6, places=2))
            self.assertEqual(["12", "14", "16", "34", "36", "56"],
                all_possible_notation(stage=6, places=2))

            self.assertEqual(15,
                len(all_possible_notation_schemes(stage=8, places=4)))

            self.assertEqual(10,
                len(all_possible_notation_schemes(stage=7, places=3)))

            self.assertEqual(4,
                len(all_possible_notation_schemes(stage=7, places=1)))

        def test_generate_mirror_pn_even_stages(self):
            # s2
            self.assertEqual(['x'],
                all_possible_notation(stage=2, places=0))

            self.assertEqual(["12"],
                all_possible_notation(stage=2, places=2))

            # s4
            self.assertEqual(['x'],
                all_possible_mirror_notation(stage=4, places=0))

            self.assertEqual(["14"],
                all_possible_mirror_notation(stage=4, places=2))

            self.assertEqual(["1234"],
                all_possible_mirror_notation(stage=4, places=4))

            # s6
            self.assertEqual(["16", "34"],
                all_possible_mirror_notation(stage=6, places=2))

            self.assertEqual(["123456"],
                all_possible_mirror_notation(stage=6, places=6))

            # s8
            self.assertEqual(["12345678"],
                all_possible_mirror_notation(stage=8, places=8))

            self.assertEqual(["18", "36"],
                all_possible_mirror_notation(stage=8, places=2))

            self.assertEqual(["1278", "1458", "3456"],
                all_possible_mirror_notation(stage=8, places=4))

            self.assertEqual(["12345678"],
                all_possible_mirror_notation(stage=8, places=8))

            # s10
            self.assertEqual(['1290', '1470', '3478'],
                all_possible_mirror_notation(stage=10, places=4))

            # s12
            # assert that this throws?
            # self.assertEqual(['1T', '30', '58'],
            #     all_possible_mirror_notation(stage=12, places=1))

            self.assertEqual(['1T', '30', '58'],
                all_possible_mirror_notation(stage=12, places=2))

            self.assertEqual(['12ET', '149T', '167T', '3490', '3670', '5678'],
                all_possible_mirror_notation(stage=12, places=4))

            self.assertEqual(['1230ET', '1258ET', '14589T', '345890'],
                all_possible_mirror_notation(stage=12, places=6))

        def test_generate_mirror_pn_odd_stages(self):
            # s3
            self.assertEqual(['123'],
                all_possible_mirror_notation(stage=3, places=3))

            # s5
            self.assertEqual(['3'],
                all_possible_mirror_notation(stage=5, places=1))

            self.assertEqual(['135'],
                all_possible_mirror_notation(stage=5, places=3))

            self.assertEqual(['12345'],
                all_possible_mirror_notation(stage=5, places=5))

            # s7
            self.assertEqual(['4'],
                all_possible_mirror_notation(stage=7, places=1))

            self.assertEqual(['147', '345'],
                all_possible_mirror_notation(stage=7, places=3))

            self.assertEqual(['12467'],
                all_possible_mirror_notation(stage=7, places=5))

            # s9
            self.assertEqual(['5'],
                all_possible_mirror_notation(stage=9, places=1))

            self.assertEqual(['159', '357'],
                all_possible_mirror_notation(stage=9, places=3))

            self.assertEqual(['12589', '14569', '34567'],
                all_possible_mirror_notation(stage=9, places=5))

            self.assertEqual(['1235789'],
                all_possible_mirror_notation(stage=9, places=7))

            self.assertEqual(['123456789'],
                all_possible_mirror_notation(stage=9, places=9))

            # s11
            self.assertEqual(['6'],
                all_possible_mirror_notation(stage=11, places=1))

            self.assertEqual(['16E', '369', '567'],
                all_possible_mirror_notation(stage=11, places=3))

            self.assertEqual(['1260E', '1468E', '34689'],
                all_possible_mirror_notation(stage=11, places=5))

            self.assertEqual(['123690E', '125670E', '145678E', '3456789'],
                all_possible_mirror_notation(stage=11, places=7))

            self.assertEqual(['12346890E'],
                all_possible_mirror_notation(stage=11, places=9))

            # s15
            self.assertEqual(['8'],
                all_possible_mirror_notation(stage=15, places=1))

            self.assertEqual(['18C', '38A', '58E', '789'],
                all_possible_mirror_notation(stage=15, places=3))

            self.assertEqual(['128BC', '148TC', '1680C', '348TA', '3680A', '5680E'],
                all_possible_mirror_notation(stage=15, places=5))

            self.assertEqual(['1238ABC', '1258EBC', '12789BC', '1458ETC', '14789TC', '167890C', '3458ETA', '34789TA', '367890A', '567890E'],
                all_possible_mirror_notation(stage=15, places=7))

            self.assertEqual(['12348TABC', '123680ABC', '125680EBC', '145680ETC', '345680ETA'],
                all_possible_mirror_notation(stage=15, places=9))

            self.assertEqual(['123458ETABC', '1234789TABC', '12367890ABC', '12567890EBC', '14567890ETC', '34567890ETA'],
                all_possible_mirror_notation(stage=15, places=11))

            self.assertEqual(['12345680ETABC'],
                all_possible_mirror_notation(stage=15, places=13))

            # s16
            self.assertEqual(['1D', '3B', '5T', '70'],
                all_possible_mirror_notation(stage=16, places=2))

            self.assertEqual(['12CD', '14AD', '16ED', '189D', '34AB', '36EB', '389B', '56ET', '589T', '7890'],
                all_possible_mirror_notation(stage=16, places=4))

            self.assertEqual(['123BCD', '125TCD', '1270CD', '145TAD', '1470AD', '1670ED', '345TAB', '3470AB', '3670EB', '5670ET'],
                all_possible_mirror_notation(stage=16, places=6))

            self.assertEqual(['1234ABCD', '1236EBCD', '12389BCD', '1256ETCD', '12589TCD', '127890CD', '1456ETAD', '14589TAD', '147890AD', '167890ED', '3456ETAB', '34589TAB', '347890AB', '367890EB', '567890ET'],
                all_possible_mirror_notation(stage=16, places=8))

            self.assertEqual(['12345TABCD', '123470ABCD', '123670EBCD', '125670ETCD', '145670ETAD', '345670ETAB'],
                all_possible_mirror_notation(stage=16, places=10))

            self.assertEqual(['123456ETABCD', '1234589TABCD', '12347890ABCD', '12367890EBCD', '12567890ETCD', '14567890ETAD', '34567890ETAB'],
                all_possible_mirror_notation(stage=16, places=12))

            self.assertEqual(['12345670ETABCD'],
                all_possible_mirror_notation(stage=16, places=14))

            self.assertEqual(['1234567890ETABCD'],
                all_possible_mirror_notation(stage=16, places=16))


    say_hello()
    # print("HELLO from main")



    # unittest.main(verbosity=2)

    # These two are rotations of each other:
    # ('A','B','C') and ('B','C','A') -> only one will be yielded.


    # counts:
    #
    # s8, 0-2 places: 166870
    # s8, 0-4 places: 

    # all_pn = all_possible_notation(stage=5, places=1)
    # all_pn = all_possible_notation_ranged(stage=5, min_places=1, max_places=3)
    all_pn = all_possible_notation_ranged(stage=8, min_places=0, max_places=2)
    # print(f"all pn ranged: ", all_pn)

    count = 0

    # all_mirror_changes = all_possible_mirror_notation_ranged(stage=8, min_places=2, max_places=4)
    all_mirror_changes = all_possible_mirror_notation_ranged(stage=8, min_places=2, max_places=4)


    # print(all_mirror_changes)

    # take first 8
    all_double_method_4_changes_on_8 = list(islice(iter_notate_combos_no_rotations(all_pn, 4), 512))

    # print(list(all_double_method_4_changes_on_8))

    for pn in all_double_method_4_changes_on_8:
        # print(pn)
        for mirror_change in all_mirror_changes:
            double_method_pn = collapse_place_notation(pn) + ';' + mirror_change
            expanded_pn = expand_rotation_notation_to_palindrome_string_list(double_method_pn, 8)
            str_pn = collapse_place_notation(expanded_pn)
            print(f"{double_method_pn} --> {str_pn}")

    # for combo in iter_notate_combos_no_rotations(all_pn, 4):
    #     print(combo)
    #     count += 1
    #     # if count % 10000 == 0:
    #     #     print(count)

    # print(f"\nCount: {count}")

