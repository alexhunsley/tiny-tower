from typing import List, Iterable
from pn_tools.helpers import clamp_stage, symbol_to_index, index_to_symbol
from pn_tools.defs import *

# from . import helpers

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


# --------- Comma & semicolon expansion ---------
def mirror_segment(tokens: List[str]) -> List[str]:
    """Plain mirror: append reversed(tokens[:-1])."""
    if not tokens:
        return []
    return tokens + list(reversed(tokens[:-1]))
