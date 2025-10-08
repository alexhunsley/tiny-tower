# notation.py
# notation.py (canonical)

from typing import List, Iterable

STAGE_SYMBOLS = "1234567890ET"  # positions: 1..12 (10=0, 11=E, 12=T)
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
def mirror_places_within_token(token: str, stage: int) -> str:
    """
    Map each place i -> (stage + 1 - i) within the stage.
    'x' stays 'x'. Returns places sorted ascending.
    Examples at stage 8: '12'->'78', '58'->'14', '16'->'38'.
    """
    if token == "x":
        return "x"
    s = clamp_stage(stage)
    places: List[int] = []
    for ch in token:
        i = symbol_to_index(ch)
        if i is None:
            continue
        places.append(s + 1 - i)
    places.sort()
    return "".join(index_to_symbol(p) for p in places)


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


# --------- Self-tests (run: python notation.py) ---------
if __name__ == "__main__":
    import unittest

    class TestNotationCanonical(unittest.TestCase):
        def test_rounds(self):
            for stage in range(-2, STAGE_MIN):
                self.assertEqual(clamp_stage(stage), STAGE_MIN)
            for stage in range(STAGE_MAX+1, STAGE_MAX+5):
                self.assertEqual(clamp_stage(stage), STAGE_MAX)
            self.assertEqual(clamp_stage(100000), 12)
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

    unittest.main(verbosity=2)
