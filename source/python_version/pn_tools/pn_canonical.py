def canonical_form(pn_string: str, stage: int) -> str:
    canon_form_list = canonical_form_list(pn_string, stage)
    return canon_form_list[0] if len(canon_form_list) > 0 else ""


def canonical_form_list(pn_string: str, stage: int) -> str:
    return sorted(all_rotations(pn_string, stage))
