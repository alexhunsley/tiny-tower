# notation.py
# notation.py (canonical)

from itertools import combinations
from typing import List, Iterable
import sys
import math

STAGE_SYMBOLS = "1234567890ETABCD"  # positions: 1..12 (10=0, 11=E, 12=T)
STAGE_MIN = 3
STAGE_MAX = len(STAGE_SYMBOLS)

# --------- Basics ---------
def clamp_stage(n) -> int:
    """Clamp stage to 4..12 (default 6 if not a number)."""
    try:
        v = int(float(n))
    except (TypeError, ValueError):
        v = 6
    return max(STAGE_MIN, min(STAGE_MAX, v))


def rounds_for_stage(stage: int) -> str:
    s = clamp_stage(stage)
    return STAGE_SYMBOLS[:s]


# --------- Tokenization (single segment; no commas) ---------
def tokenize_segment(pn_segment: str) -> List[str]:
    """
    Split a segment on '.', keep 'x' tokens, normalize e/t to E/T,
    ignore whitespace and unsupported chars.
    Returns tokens like ['x','12','16','34','x'].
    """
    src = (pn_segment or "").strip()
    if not src:
        return []

    allowed = set(STAGE_SYMBOLS) | {"e", "t", "E", "T"}
    toks: List[str] = []
    buf: List[str] = []

    def flush():
        nonlocal buf
        if buf:
            toks.append("".join(buf))
            buf = []

    for ch in src:
        if ch == ".":
            flush()
            continue
        if ch in ("x", "X"):
            flush()
            toks.append("x")
            continue
        if ch.isspace():
            continue
        if ch in allowed:
            buf.append("E" if ch == "e" else "T" if ch == "t" else ch)
            continue
        # ignore anything else
    flush()
    return toks


# --------- Symbol/index helpers ---------
def symbol_to_index(sym: str) -> int | None:
    try:
        return STAGE_SYMBOLS.index(sym) + 1  # 1-based
    except ValueError:
        return None


def index_to_symbol(pos: int) -> str:
    if 1 <= pos <= len(STAGE_SYMBOLS):
        return STAGE_SYMBOLS[pos - 1]
    return ""


# --------- Token-level place mirroring ---------
def mirror_places_within_token(token: str, stage: int, x_mirrors_to_empty_str=False) -> str:
    """
    Map each place i -> (stage + 1 - i) within the stage.
    'x' stays 'x'. Returns places sorted ascending.
    Examples at stage 8: '12'->'78', '58'->'14', '16'->'38'.
    """
    if token == "x":
        # doing this for the mirror generating thing
        return "" if x_mirrors_to_empty_str else "x"

    s = clamp_stage(stage)
    places: List[int] = []
    for ch in token:
        i = symbol_to_index(ch)
        if i is None:
            continue
        places.append(s + 1 - i)
    places.sort()
    return "".join(index_to_symbol(p) for p in places)


def is_odd(number: int) -> bool:
    return (number % 2) == 1

def is_double_notate(token: str, stage: int) -> bool:
    if token == 'x' and is_odd(stage):
        return False

    mirror = mirror_places_within_token(token, stage)
    print(f"\nMirror, str = {mirror} {token}")
    return token == mirror


# --------- Comma & semicolon expansion ---------
def _mirror_segment(tokens: List[str]) -> List[str]:
    """Plain mirror: append reversed(tokens[:-1])."""
    if not tokens:
        return []
    return tokens + list(reversed(tokens[:-1]))


def expand_rotation_notation_to_palindrome_notation(pn_string: str, stage: int):
    string_list = expand_rotation_notation_to_palindrome_string_list(pn_string, stage)
    return collapse_place_notation(string_list)


def expand_rotation_notation_to_palindrome_string_list(pn_string: str, stage: int):
    raw = (pn_string or "").strip()
    if raw.count(";") != 1:
        return ""

    left_raw, right_raw = (part.strip() for part in raw.split(";", 1))
    left_tokens = tokenize_segment(left_raw)
    right_tokens = tokenize_segment(right_raw)

    s = clamp_stage(stage)
    left_rev_trunc = list(reversed(left_tokens[:-1-(stage%2)]))  # exclude last token

    left_rev_trunc_mirrored = [mirror_places_within_token(tok, s) for tok in left_rev_trunc]

    right_mirrored = [mirror_places_within_token(tok, s) for tok in right_tokens]

    palindrome_part = left_tokens + left_rev_trunc_mirrored

    return palindrome_part + right_mirrored + [",", right_raw]


def expand_place_notation_to_string_list(pn_string: str, stage: int, expand_once_only=False) -> List[str]:
    """
    Expand a PN into a flat list of notates; can take palindrome ',' and rotational ';' formats.
    """
    raw = (pn_string or "").strip()
    if not raw:
        return []

    # rotational symmetry. process it into a pn string containing 
    if raw.count(";") == 1:
        raw = collapse_place_notation(expand_rotation_notation_to_palindrome_string_list(pn_string, stage))

    # palindrome
    if "," in raw:
        out: List[str] = []
        for seg in (p.strip() for p in raw.split(",") if p.strip()):
            toks = tokenize_segment(seg)
            out.extend(_mirror_segment(toks))
        return out

    # no symmetry marker present
    return tokenize_segment(raw)


# --------- Apply tokens to rows ---------
def apply_token_to_row(row: str, token: str, stage: int) -> str:
    """
    Apply one token to a row:
      - token == 'x': swap adjacent pairs (last remains if odd length)
      - numeric token (e.g., '34'): those places stay; others swap in pairs
    """
    n = len(row)
    src = list(row)
    out = src[:]

    if token == "x":
        i = 0
        while i + 1 < n:
            out[i], out[i + 1] = src[i + 1], src[i]
            i += 2
        return "".join(out)

    # places that stay
    keep = set()
    for ch in token:
        pos = symbol_to_index(ch)
        if pos is not None and 1 <= pos <= stage:
            keep.add(pos)

    i = 1  # 1-based index over places
    while i <= n:
        j = i + 1
        if i in keep or j > n or j in keep:
            out[i - 1] = src[i - 1]
            i += 1
            continue
        # swap i and j
        out[i - 1], out[j - 1] = src[j - 1], src[i - 1]
        i += 2

    return "".join(out)


# --------- Generation ---------
def generate_list(pn_string: str, stage: int, max_leads: int = 12) -> List[str]:
    """
    Generate rows by repeating the expanded lead token list until we return
    to rounds or hit max_leads. Always starts with rounds.
    """
    s = clamp_stage(stage)
    rounds = rounds_for_stage(s)
    lead_tokens = expand_place_notation_to_string_list(pn_string, s)
    if not lead_tokens:
        return [rounds]

    rows = [rounds]
    current = rounds
    leads = 0
    while leads < max_leads:
        for tok in lead_tokens:
            current = apply_token_to_row(current, tok, s)
            rows.append(current)
        leads += 1
        if current == rounds:
            break
    return rows


# --------- Collapse back to compact PN ---------
def collapse_place_notation(tokens: Iterable[str]) -> str:
    """
    Collapse an expanded token list back into a compact PN string.
    Insert '.' only between adjacent numeric tokens.
    Example: ['x','12','56','x','78'] -> 'x12.56x78'
    """
    special = ".,"
    tokens = list(tokens)
    if not tokens:
        return ""
    pieces: List[str] = []
    for i, tok in enumerate(tokens):
        prev = tokens[i - 1] if i > 0 else None
        is_num = (lambda t: t != "x")
        # if prev is not None and not prev in special and tok in special and is_num(prev) and is_num(tok):
        if prev is not None and prev not in special and tok not in special and is_num(prev) and is_num(tok):
            pieces.append(".")
        pieces.append(tok)
    return "".join(pieces)


def rotation_as_string_list(pn_string: str, stage: int, amount: int) -> [str]:
    str_list = expand_place_notation_to_string_list(pn_string, stage)
    length = len(str_list)
    if amount < 0:
        amount = length - abs(amount)
    pivot = length - amount
    res = str_list[pivot:] + str_list[:pivot]
    return res

def all_rotations(pn_string: str, stage: int) -> [str]:
    notation_list = expand_place_notation_to_string_list(pn_string, stage)
    return [collapse_place_notation(rotation_as_string_list(pn_string, stage, rot_amount)) for rot_amount in range(0, len(notation_list))]


def canonical_form(pn_string: str, stage: int) -> str:
    canon_form_list = canonical_form_list(pn_string, stage)
    return canon_form_list[0] if len(canon_form_list) > 0 else ""



def canonical_form_list(pn_string: str, stage: int) -> str:
    return sorted(all_rotations(pn_string, stage))


def are_rotation_of_each_other(pn_string1: str, pn_string2: str, stage: int) -> [str]:
    boof = expand_place_notation_to_string_list(pn_string1, stage)
    print(f"boof: {boof}")
    # pn1_canonical = canonical_form_list(expand_place_notation_to_string_list(pn_string1, stage), stage)
    # pn2_canonical = canonical_form_list(expand_place_notation_to_string_list(pn_string2, stage), stage)
    
    pn1_canonical = canonical_form_list(pn_string1, stage)
    pn2_canonical = canonical_form_list(pn_string2, stage)
    print(f"PN canon: {pn1_canonical}, {pn2_canonical}")
    return pn1_canonical == pn2_canonical


def n_choose_r(n: int, r: int) -> List[List[int]]:
    """
    Generate all r-element combinations of range(n), 
    returned as a list of index lists.
    
    Example: n_choose_r(3,2) -> [[0,1],[0,2],[1,2]]
    """
    return [list(c) for c in combinations(range(n), r)]

def all_possible_mirror_notation(stage: int, places: int, place_str="|", swap_str="*") -> [str]:
    if stage%2 != places%2:
        raise ValueError("Parity of stage and places must match")
    if places > stage:
        raise ValueError("places must be <= stage")

    lhs = all_possible_notation(stage // 2, places // 2)

    print(f"stage {stage // 2} places {places // 2}: LHS combos: {lhs} ")
    mid_place_insertion = "" if (stage%2 == 0) else f"{(stage//2)+1}"

    if lhs == ['x'] and stage%2 == 1:
        return [mid_place_insertion]

    return [x + mid_place_insertion + mirror_places_within_token(x, stage, x_mirrors_to_empty_str=True) for x in lhs]

def all_possible_notation_schemes(stage: int, places: int, place_str="|", swap_str="*") -> [str]:
    # n = stage - (stage - places) + 1
    # r = places

    # n = (stage/2 - places)
    n = stage - int((stage - places)/2)
    r = places

    print(f"\nn, r = {n} {r}")
    choices = n_choose_r(n, r)
    print(choices)

    results = []
    for choice in choices:
        index = 0
        result = ""
        for i in range(0, n):
            # print(f"CHECK: {i} in {choice}")
            if i in choice:
                result += place_str
                index += 1
            else:
                result += swap_str
                index += 2
            if index > n+1:
                break
        results.append(result)

    print(f"\n>>> append")
    print("\n".join(results))
    return results

# s:2, p:1
def all_possible_notation(stage: int, places: int, place_str="|", swap_str="*") -> [str]:
    # n = stage - (stage - places) + 1
    # r = places

    n = stage - int((stage - places)/2)
    # n = int((stage - places)/2)
    r = places

    print(f"\n___ n, r = {n} {r}")
    choices = n_choose_r(n, r)
    print(f"\nChoices: ", choices)
    results = []
    for choice in choices:
        print(f"= doing choice = {choice}")
        index = 1
        result = ""
        for i in range(0, n):
            print(f"CHECK: {i} in {choice}. idx = {index}")
            if i in choice:
                result += str(index)
                index += 1
            else:
                index += 2
            if index > stage:
                print(f"\n=====- breaking because index {index} > {n}, result = {result}")
                break

        if len(result) == 0 and places == 0:
            results.append('x')
        elif len(result) == places:
            print(f"Adding correct length bit: {result}")
            results.append(result)

    print("\nmirror bits found:".join(results))
    return results

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

        def test_generate_mirror_pn(self):
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

            # odd stages

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


    unittest.main(verbosity=2)
