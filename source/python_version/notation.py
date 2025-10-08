# notation.py
# notation.py (canonical)

from typing import List, Iterable

STAGE_SYMBOLS = "1234567890ET"  # positions: 1..12 (10=0, 11=E, 12=T)


# --------- Basics ---------
def clamp_stage(n) -> int:
    """Clamp stage to 4..12 (default 6 if not a number)."""
    try:
        v = int(float(n))
    except (TypeError, ValueError):
        v = 6
    return max(4, min(12, v))


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


def expand_place_notation(pn_string: str, stage: int) -> List[str]:
    """
    Expand a PN into a flat list of tokens to apply per row step.

    Rules:
    - If there is a single ';' (LEFT;RIGHT):
        * Let left_tokens = tokenize_segment(LEFT)
        * Build S1 = left_tokens + reversed(left_tokens[:-1]) with each token
          of the reversed tail mapped via mirror_places_within_token(...)
        * right_tokens = tokenize_segment(RIGHT)
        * Final lead tokens = S1 + right_tokens + reversed(S1) + right_tokens
    - Else if there are commas:
        * For each comma-separated segment: tokenize, then mirror the segment
          via plain _mirror_segment (no place reversal), then concatenate.
    - Else:
        * Just tokenize the whole string (no mirroring).
    """
    raw = (pn_string or "").strip()
    if not raw:
        return []

    # Special semicolon rule
    if raw.count(";") == 1:
        left_raw, right_raw = (part.strip() for part in raw.split(";", 1))
        left_tokens = tokenize_segment(left_raw)
        right_tokens = tokenize_segment(right_raw)

        # Build S1: left_tokens + mirror of left_tokens[:-1] with place reversal
        s = clamp_stage(stage)
        tail_src = list(reversed(left_tokens[:-1]))  # exclude last token
        tail_mirrored = [mirror_places_within_token(tok, s) for tok in tail_src]
        S1 = left_tokens + tail_mirrored

        S1_rev = list(reversed(S1))
        return S1 + right_tokens + S1_rev + right_tokens

    # Comma behavior
    if "," in raw:
        out: List[str] = []
        for seg in (p.strip() for p in raw.split(",") if p.strip()):
            toks = tokenize_segment(seg)
            out.extend(_mirror_segment(toks))
        return out

    # Simple segment
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
    lead_tokens = expand_place_notation(pn_string, s)
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
    tokens = list(tokens)
    if not tokens:
        return ""
    pieces: List[str] = []
    for i, tok in enumerate(tokens):
        prev = tokens[i - 1] if i > 0 else None
        is_num = (lambda t: t != "x")
        if prev is not None and is_num(prev) and is_num(tok):
            pieces.append(".")
        pieces.append(tok)
    return "".join(pieces)


# --------- Self-tests (run: python notation.py) ---------
if __name__ == "__main__":
    import unittest

    class TestNotationCanonical(unittest.TestCase):
        # Basics
        def test_rounds(self):
            self.assertEqual(clamp_stage(3), 4)
            self.assertEqual(clamp_stage(20), 12)
            self.assertEqual(rounds_for_stage(6), "123456")
            self.assertEqual(rounds_for_stage(8), "12345678")

        # Tokenization
        def test_tokenize(self):
            self.assertEqual(tokenize_segment("x12.16.34x"), ["x", "12", "16", "34", "x"])
            self.assertEqual(tokenize_segment(" e . t "), ["E", "T"])
            self.assertEqual(tokenize_segment("x12a.!!34"), ["x", "12", "34"])
            self.assertEqual(tokenize_segment(""), [])

        # Commas
        def test_commas(self):
            self.assertEqual(
                expand_place_notation("x56,12.45.78", 8),
                ["x", "56", "x", "12", "45", "78", "45", "12"],
            )

        # Semicolon
        def test_semicolon(self):
            self.assertEqual(
                expand_place_notation("12x58.16;36", 8),
                ["12", "x", "58", "16", "14", "x", "78", "36",
                 "78", "x", "14", "16", "58", "x", "12", "36"],
            )

        # Apply & generate
        def test_apply_and_generate(self):
            self.assertEqual(apply_token_to_row("1234567", "34", 7), "2134657")
            self.assertEqual(apply_token_to_row("12345678", "34", 8), "21346587")

            pn = "x14x14x14x12"
            rows = generate_list(pn, stage=4, max_leads=12)
            print("rows: ", len(rows))
            print("\n".join(rows))
            r = rounds_for_stage(4)
            self.assertEqual(rows[0], r)
            self.assertEqual(rows[-1], r)
            lead_len = len(tokenize_segment(pn))
            self.assertEqual((len(rows) - 1) % lead_len, 0)
            self.assertEqual((len(rows) - 1) // lead_len, 3)

        # Collapse
        def test_collapse(self):
            self.assertEqual(collapse_place_notation(["x", "12", "56", "x", "78"]), "x12.56x78")
            orig = "x12.16.34x"
            self.assertEqual(collapse_place_notation(tokenize_segment(orig)), orig)

    unittest.main(verbosity=2)
