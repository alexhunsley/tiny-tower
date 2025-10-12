from typing import List, Iterable, Iterator, Sequence, Tuple, Optional
from .pn_rotation import *

# from .defs import *
# from .helpers import *
# from .encode_decode import *
# from .pn_mirror import *

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
            canonical = min_rotation(combo)
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

