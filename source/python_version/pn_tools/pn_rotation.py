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


def are_rotation_of_each_other(pn_string1: str, pn_string2: str, stage: int) -> [str]:
    boof = expand_place_notation_to_string_list(pn_string1, stage)
    print(f"boof: {boof}")
    # pn1_canonical = canonical_form_list(expand_place_notation_to_string_list(pn_string1, stage), stage)
    # pn2_canonical = canonical_form_list(expand_place_notation_to_string_list(pn_string2, stage), stage)
    
    pn1_canonical = canonical_form_list(pn_string1, stage)
    pn2_canonical = canonical_form_list(pn_string2, stage)
    print(f"PN canon: {pn1_canonical}, {pn2_canonical}")
    return pn1_canonical == pn2_canonical
