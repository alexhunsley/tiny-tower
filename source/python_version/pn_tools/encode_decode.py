from typing import List, Iterable
from .defs import *
from .helpers import *
from .pn_mirror import *

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

