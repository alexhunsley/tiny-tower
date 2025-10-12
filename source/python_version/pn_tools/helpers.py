from typing import List, Iterable
from itertools import combinations
from pn_tools.defs import *

def is_odd(number: int) -> bool:
    return (number % 2) == 1

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


def is_double_notate(token: str, stage: int) -> bool:
    from pn_tools.pn_mirror import mirror_places_within_token, mirror_segment

    if token == 'x' and is_odd(stage):
        return False

    mirror = mirror_places_within_token(token, stage)
    print(f"\nMirror, str = {mirror} {token}")
    return token == mirror


def n_choose_r(n: int, r: int) -> List[List[int]]:
    """
    Generate all r-element combinations of range(n), 
    returned as a list of index lists.
    
    Example: n_choose_r(3,2) -> [[0,1],[0,2],[1,2]]
    """
    return [list(c) for c in combinations(range(n), r)]
