from typing import List, Iterable, Iterator, Sequence, Tuple, Optional
# from pn_tools.encode_decode import expand_place_notation_to_string_list
from pn_tools.encode_decode import *

# from . import encode_decode
# from . import pn_mirror

def rotation_as_string_list(pn_string: str, stage: int, amount: int) -> [str]:
    from pn_tools.encode_decode import expand_place_notation_to_string_list

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


def are_rotation_of_each_other(pn_string1: str, pn_string2: str, stage: int) -> [str]:
    boof = expand_place_notation_to_string_list(pn_string1, stage)
    print(f"boof: {boof}")
    # pn1_canonical = canonical_form_list(expand_place_notation_to_string_list(pn_string1, stage), stage)
    # pn2_canonical = canonical_form_list(expand_place_notation_to_string_list(pn_string2, stage), stage)
    
    pn1_canonical = canonical_form_list(pn_string1, stage)
    pn2_canonical = canonical_form_list(pn_string2, stage)
    print(f"PN canon: {pn1_canonical}, {pn2_canonical}")
    return pn1_canonical == pn2_canonical


# was _ previously
def min_rotation(tokens: Sequence[str]) -> Tuple[str, ...]:
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


# canonical form

def canonical_form(pn_string: str, stage: int) -> str:
    canon_form_list = canonical_form_list(pn_string, stage)
    return canon_form_list[0] if len(canon_form_list) > 0 else ""


def canonical_form_list(pn_string: str, stage: int) -> str:
    return sorted(all_rotations(pn_string, stage))

