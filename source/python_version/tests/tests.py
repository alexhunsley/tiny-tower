# import pytest

# from pn_tools.notation import (
#     STAGE_MIN, STAGE_MAX, STAGE_SYMBOLS,
#     clamp_stage, rounds_for_stage, tokenize_segment,
#     expand_place_notation_to_string_list,
#     expand_rotation_notation_to_palindrome_string_list,
#     expand_rotation_notation_to_palindrome_notation,
#     mirror_places_within_token,
#     apply_token_to_row, generate_rows, collapse_place_notation,
#     canonical_form, rotation_as_string_list, all_rotations,
#     are_rotation_of_each_other, is_double_notate,
#     all_possible_notation_schemes, all_possible_notation,
#     all_possible_mirror_notation,
# )

# # ---------- rounds / clamping ----------

# @pytest.mark.parametrize("stage", list(range(-2, STAGE_MIN)))
# def test_rounds_clamp_below_min(stage):
#     assert clamp_stage(stage) == STAGE_MIN

# @pytest.mark.parametrize("stage", list(range(STAGE_MAX + 1, STAGE_MAX + 5)))
# def test_rounds_clamp_above_max(stage):
#     assert clamp_stage(stage) == STAGE_MAX

# @pytest.mark.parametrize(
#     "inp,expected",
#     [
#         (6, "123456"),
#         (8, "12345678"),
#         (9, "123456789"),
#         (12, "1234567890ET"),
#     ],
# )
# def test_rounds_for_stage(inp, expected):
#     assert rounds_for_stage(inp) == expected

# def test_rounds_specific_large():
#     assert clamp_stage(100000) == 16


# # ---------- tokenize ----------

# @pytest.mark.parametrize(
#     "s,expected",
#     [
#         ("xxx", ["x", "x", "x"]),
#         ("x12x.16.34.58.xx10.ET", ["x", "12", "x", "16", "34", "58", "x", "x", "10", "ET"]),
#         (" e . t ", ["E", "T"]),
#         ("x12a.!!34", ["x", "12", "34"]),
#         ("", []),
#     ],
# )
# def test_tokenize(s, expected):
#     assert tokenize_segment(s) == expected


# # ---------- commas / semicolons ----------

# def test_commas():
#     assert expand_place_notation_to_string_list("x56,78", 8) == ["x", "56", "x", "78"]

# def test_semicolon_ph5():
#     assert expand_place_notation_to_string_list("5.1.5;1", 5) == ['5', '1', '5', '1', '5', '1', '5', '1', '5', '1']

# @pytest.mark.parametrize(
#     "stage,expected",
#     [
#         (3, ["3", ",", "1"]),
#         (5, ["5", ",", "1"]),
#         (7, ["7", ",", "1"]),
#         (11, ["E", ",", "1"]),
#     ],
# )
# def test_semicolon_on_odd_stage_original_odd(stage, expected):
#     assert expand_rotation_notation_to_palindrome_string_list(";1", stage) == expected

# def test_semicolon_on_bristol_simplify_to_comma_string():
#     bristol = "x58x14.58x58.36.14x14.58x14x18,18"
#     assert expand_rotation_notation_to_palindrome_notation("x58x14.58x58.36;18", 8) == bristol

# def test_semicolon_on_bristol_simplify_to_notation_list():
#     expected = ['x', '58', 'x', '14', '58', 'x', '58', '36', '14', 'x', '14', '58', 'x', '14', 'x', '18', ',', '18']
#     assert expand_rotation_notation_to_palindrome_string_list("x58x14.58x58.36;18", 8) == expected

# def test_semicolon_general():
#     assert expand_rotation_notation_to_palindrome_string_list("12x58.16;36", 8) == \
#            ["12", "x", "58", "16", "14", "x", "78", "36", ",", "36"]


# # ---------- mirroring within a token ----------

# def test_mirror_places_empty_and_x():
#     assert mirror_places_within_token("", stage=3) == ""
#     for stage in range(STAGE_MIN, STAGE_MAX + 1):
#         assert mirror_places_within_token("x", stage) == "x"
#         assert mirror_places_within_token("", stage) == ""

# def test_mirror_places_involution_single_chars():
#     for stage in range(STAGE_MIN, STAGE_MAX + 1):
#         ch = STAGE_SYMBOLS[stage - 1]
#         assert mirror_places_within_token(mirror_places_within_token(ch, stage), stage) == ch

# def test_mirror_places_fixed_string():
#     assert mirror_places_within_token("1234567890ET", stage=12) == "1234567890ET"

# @pytest.mark.parametrize(
#     "stage,expected",
#     [
#         (3, "3"), (4, "4"), (5, "5"), (6, "6"), (7, "7"), (8, "8"),
#         (9, "9"), (10, "0"), (11, "E"), (12, "T"),
#     ],
# )
# def test_mirror_places_of_1(stage, expected):
#     assert mirror_places_within_token("1", stage) == expected

# @pytest.mark.parametrize(
#     "token,stage,expected",
#     [
#         ("3", 3, "1"), ("4", 4, "1"), ("5", 5, "1"), ("6", 6, "1"),
#         ("7", 7, "1"), ("8", 8, "1"), ("9", 9, "1"), ("0", 10, "1"),
#         ("E", 11, "1"), ("T", 12, "1"),
#     ],
# )
# def test_mirror_places_right_edge_to_1(token, stage, expected):
#     assert mirror_places_within_token(token, stage) == expected

# @pytest.mark.parametrize(
#     "stage,expected",
#     [
#         (3, "23"), (4, "34"), (5, "45"), (6, "56"), (7, "67"), (8, "78"),
#         (9, "89"), (10, "90"), (11, "0E"), (12, "ET"),
#     ],
# )
# def test_mirror_places_of_12(stage, expected):
#     assert mirror_places_within_token("12", stage) == expected

# @pytest.mark.parametrize(
#     "token,stage",
#     [
#         ("13", 3), ("14", 4), ("15", 5), ("16", 6), ("17", 7),
#         ("18", 8), ("19", 9), ("10", 10), ("1E", 11), ("1T", 12),
#     ],
# )
# def test_mirror_places_fixed_pairs(token, stage):
#     assert mirror_places_within_token(token, stage) == token

# @pytest.mark.parametrize(
#     "token,stage,expected",
#     [
#         ("145", 5, "125"),
#         ("1256", 6, "1256"),
#     ],
# )
# def test_mirror_places_misc(token, stage, expected):
#     assert mirror_places_within_token(token, stage) == expected


# # ---------- apply / generate ----------

# def test_apply_and_generate():
#     assert apply_token_to_row("1234567", "34", 7) == "2134657"
#     assert apply_token_to_row("12345678", "34", 8) == "21346587"
#     pn = "x14x14x14x12"
#     rows = generate_rows(pn, stage=4, max_leads=12)
#     r = rounds_for_stage(4)
#     assert rows[0] == r and rows[-1] == r
#     lead_len = len(tokenize_segment(pn))
#     assert (len(rows) - 1) % lead_len == 0
#     assert (len(rows) - 1) // lead_len == 3


# # ---------- collapse / canonical ----------

# def test_collapse_and_canonical():
#     assert collapse_place_notation(["x", "12", "56", "x", "78"]) == "x12.56x78"
#     orig = "x12.16.34x"
#     assert collapse_place_notation(tokenize_segment(orig)) == orig
#     assert canonical_form("", stage=8) == ""
#     assert canonical_form("x", stage=8) == "x"
#     assert canonical_form("x12", stage=8) == "12x"


# # ---------- rotations ----------

# @pytest.mark.parametrize(
#     "pn,stage,k,expected",
#     [
#         ("", 4, 0, []), ("", 4, 1, []), ("", 4, -1, []),
#         ("x", 2, 0, ["x"]), ("x", 6, 1, ["x"]), ("x", 10, -1, ["x"]),
#         ("1278", 8, 0, ["1278"]), ("1278", 8, 1, ["1278"]), ("1278", 8, -1, ["1278"]),
#         ("12.34.56", 6, 0, ["12", "34", "56"]),
#         ("12.34.56", 6, 1, ["56", "12", "34"]),
#         ("12.34.56", 6, 2, ["34", "56", "12"]),
#         ("12.34.56", 6, 3, ["12", "34", "56"]),
#         ("12.34.56", 6, 6, ["12", "34", "56"]),
#         ("12.34.56", 6, 99, ["12", "34", "56"]),
#         ("12.34.56", 6, -2, ["56", "12", "34"]),
#         ("12.34.56", 6, -1, ["34", "56", "12"]),
#         ("12.34.56", 6, -3, ["12", "34", "56"]),
#         ("12.34.56", 6, -6, ["12", "34", "56"]),
#         ("12.34.56", 6, -99, ["12", "34", "56"]),
#     ],
# )
# def test_rotation_as_string_list(pn, stage, k, expected):
#     assert rotation_as_string_list(pn, stage, k) == expected

# def test_all_rotations_and_equivalence():
#     assert all_rotations("", 6) == []
#     assert all_rotations("12x", 6) == ["12x", "x12"]
#     assert all_rotations("12.34.56", 6) == ["12.34.56", "56.12.34", "34.56.12"]

#     same_pairs = [
#         ("", "", 8), ("x", "x", 8), ("12x", "12x", 8), ("3478", "3478", 8),
#         ("12x", "x12", 8), ("34.78", "78.34", 8),
#         ("12x12x14", "12x12x14", 8), ("12x12x14", "x12x14.12", 8),
#         ("12x12x14", "12x12x14", 8), ("12x12x14", "14.12x12x", 8),
#         (";1", "3.1", 3), (";1", "1.3", 3),
#     ]
#     for a, b, s in same_pairs:
#         assert are_rotation_of_each_other(a, b, s) is True

#     diff_pairs = [
#         (";1", "3.3", 3), (";1", "1.1", 3), (";1", "1", 3), (";1", "3.1.3", 3),
#     ]
#     for a, b, s in diff_pairs:
#         assert are_rotation_of_each_other(a, b, s) is False


# # ---------- double detection ----------

# @pytest.mark.parametrize(
#     "token,stage,expected",
#     [
#         ("14", 4, True), ("123", 3, True),
#         ("x", 4, True), ("x", 6, True), ("x", 8, True), ("x", 10, True), ("x", 12, True),
#         ("1234", 4, True), ("14", 4, True), ("1256", 6, True), ("16", 6, True), ("34", 6, True),
#         ("x", 3, False), ("x", 5, False), ("x", 7, False), ("x", 9, False), ("x", 11, False),
#         ("1", 3, False), ("2", 3, True), ("3", 3, False),
#         ("1256", 8, False), ("16", 8, False),
#     ],
# )
# def test_is_double_notate(token, stage, expected):
#     assert is_double_notate(token, stage) is expected


# # ---------- generation: all_possible_* ----------

# @pytest.mark.parametrize(
#     "stage,places,schemes,notation",
#     [
#         (2, 2, ["||"], ["12"]),
#         (2, 0, ["*"], ["x"]),
#         (4, 2, ["||*", "|*|", "*||"], ["12", "14", "34"]),
#         (5, 3, ["|||*", "||*|", "|*||", "*|||"], ["123", "125", "145", "345"]),
#         (5, 5, ["|||||"], ["12345"]),
#         (5, 1, ["|**", "*|*", "**|"], ["1", "3", "5"]),
#         (6, 2, ["||**", "|*|*", "|**|", "*||*", "*|*|", "**||"], ["12", "14", "16", "34", "36", "56"]),
#     ],
# )
# def test_generate_pn(stage, places, schemes, notation):
#     assert all_possible_notation_schemes(stage=stage, places=places) == schemes
#     assert all_possible_notation(stage=stage, places=places) == notation

# @pytest.mark.parametrize(
#     "stage,places,expected_len",
#     [
#         (8, 4, 15),
#         (7, 3, 10),
#         (7, 1, 4),
#     ],
# )
# def test_generate_pn_lengths(stage, places, expected_len):
#     assert len(all_possible_notation_schemes(stage=stage, places=places)) == expected_len


# # ---------- generation: mirror notation (even, parametrized table) ----------

# @pytest.mark.parametrize(
#     "stage,table",
#     [
#         (2, [(0, ['x']), (2, ["12"])]),
#         (4, [(0, ['x']), (2, ["14"]), (4, ["1234"])]),
#         (6, [(2, ["16", "34"]), (6, ["123456"])]),
#         (8, [
#             (8, ["12345678"]),
#             (2, ["18", "36"]),
#             (4, ["1278", "1458", "3456"]),
#             (8, ["12345678"]),
#         ]),
#         (10, [(4, ['1290', '1470', '3478'])]),
#         (12, [
#             (2, ['1T', '30', '58']),
#             (4, ['12ET', '149T', '167T', '3490', '3670', '5678']),
#             (6, ['1230ET', '1258ET', '14589T', '345890']),
#         ]),
#     ],
# )
# def test_generate_mirror_pn_even_stages(stage, table):
#     for places, expected in table:
#         assert all_possible_mirror_notation(stage=stage, places=places) == expected


# # ---------- generation: mirror notation (odd, heavily parametrized) ----------

# @pytest.mark.parametrize(
#     "stage,table",
#     [
#         (3, [(3, ['123'])]),
#         (5, [(1, ['3']), (3, ['135']), (5, ['12345'])]),
#         (7, [(1, ['4']), (3, ['147', '345']), (5, ['12467'])]),
#         (9, [
#             (1, ['5']),
#             (3, ['159', '357']),
#             (5, ['12589', '14569', '34567']),
#             (7, ['1235789']),
#             (9, ['123456789']),
#         ]),
#         (11, [
#             (1, ['6']),
#             (3, ['16E', '369', '567']),
#             (5, ['1260E', '1468E', '34689']),
#             (7, ['123690E', '125670E', '145678E', '3456789']),
#             (9, ['12346890E']),
#         ]),
#         (15, [
#             (1, ['8']),
#             (3, ['18C', '38A', '58E', '789']),
#             (5, ['128BC', '148TC', '1680C', '348TA', '3680A', '5680E']),
#             (7, [
#                 '1238ABC', '1258EBC', '12789BC', '1458ETC', '14789TC',
#                 '167890C', '3458ETA', '34789TA', '367890A', '567890E'
#             ]),
#             (9, [
#                 '12348TABC', '123680ABC', '125680EBC', '145680ETC', '345680ETA'
#             ]),
#             (11, [
#                 '123458ETABC', '1234789TABC', '12367890ABC',
#                 '12567890EBC', '14567890ETC', '34567890ETA'
#             ]),
#             (13, ['12345680ETABC']),
#         ]),
#         (16, [
#             (2, ['1D', '3B', '5T', '70']),
#             (4, [
#                 '12CD', '14AD', '16ED', '189D', '34AB', '36EB', '389B',
#                 '56ET', '589T', '7890'
#             ]),
#             (6, [
#                 '123BCD', '125TCD', '1270CD', '145TAD', '1470AD', '1670ED',
#                 '345TAB', '3470AB', '3670EB', '5670ET'
#             ]),
#             (8, [
#                 '1234ABCD', '1236EBCD', '12389BCD', '1256ETCD', '12589TCD',
#                 '127890CD', '1456ETAD', '14589TAD', '147890AD', '167890ED',
#                 '3456ETAB', '34589TAB', '347890AB', '367890EB', '567890ET'
#             ]),
#             (10, [
#                 '12345TABCD', '123470ABCD', '123670EBCD',
#                 '125670ETCD', '145670ETAD', '345670ETAB'
#             ]),
#             (12, [
#                 '123456ETABCD', '1234589TABCD', '12347890ABCD', '12367890EBCD',
#                 '12567890ETCD', '14567890ETAD', '34567890ETAB'
#             ]),
#             (14, ['12345670ETABCD']),
#             (16, ['1234567890ETABCD']),
#         ]),
#     ],
# )
# def test_generate_mirror_pn_odd_stages(stage, table):
#     for places, expected in table:
#         assert all_possible_mirror_notation(stage=stage, places=places) == expected
