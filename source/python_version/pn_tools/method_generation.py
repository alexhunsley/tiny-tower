from typing import List, Iterable

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

