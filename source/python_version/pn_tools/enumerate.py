from .helpers import *
from .pn_mirror import *

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


def all_possible_notation_ranged(stage: int, min_places: int, max_places: int) -> [str]:
    result_notates = []
    for places in range(min_places, max_places + 1, 2):
        # print(f" Places: {places}")
        result_notates += all_possible_notation(stage, places)

    return result_notates


# s:2, p:1
def all_possible_notation(stage: int, places: int) -> [str]:
    # n = stage - (stage - places) + 1
    # r = places

    n = stage - int((stage - places)/2)
    # n = int((stage - places)/2)
    r = places

    # print(f"\n___ n, r = {n} {r}")
    choices = n_choose_r(n, r)
    # print(f"\nChoices: ", choices)
    results = []
    for choice in choices:
        # print(f"= doing choice = {choice}")
        index = 1
        result = ""
        for i in range(0, n):
            # print(f"CHECK: {i} in {choice}. idx = {index}")
            if i in choice:
                result += str(index)
                index += 1
            else:
                index += 2
            if index > stage:
                # print(f"\n=====- breaking because index {index} > {n}, result = {result}")
                break

        if len(result) == 0 and places == 0:
            results.append('x')
        elif len(result) == places:
            # print(f"Adding correct length bit: {result}")
            results.append(result)

    # print("\nmirror bits found:".join(results))
    return results


def all_possible_mirror_notation_ranged(stage: int, min_places: int, max_places: int) -> [str]:
    pn_results = []
    for places in range(min_places, max_places + 1, 2):
        pn_results += all_possible_mirror_notation(stage, places)
    return pn_results


def all_possible_mirror_notation(stage: int, places: int, place_str="|", swap_str="*") -> [str]:
    if stage%2 != places%2:
        raise ValueError("Parity of stage and places must match")
    if places > stage:
        raise ValueError("places must be <= stage")

    lhs = all_possible_notation(stage // 2, places // 2)

    # print(f"stage {stage // 2} places {places // 2}: LHS combos: {lhs} ")
    mid_place_insertion = "" if (stage%2 == 0) else f"{(stage//2)+1}"

    if lhs == ['x'] and stage%2 == 1:
        return [mid_place_insertion]

    return [x + mid_place_insertion + mirror_places_within_token(x, stage, x_mirrors_to_empty_str=True) for x in lhs]


