# notation_tests.py

# notation.py

STAGE_SYMBOLS = "1234567890ET"  # positions: 1..12 (10=0, 11=E, 12=T)


def clamp_stage(n):
    try:
        v = float(n)
    except (TypeError, ValueError):
        v = 6
    v = int(v)
    return max(4, min(12, v))


def rounds_for_stage(stage):
    s = clamp_stage(stage)
    return STAGE_SYMBOLS[:s]


# ---------------- Base tokenizer for a single segment (no commas) ----------------
# Splits on '.' and treats 'x'/'X' as its own token AND delimiter. Keeps 'x' tokens.
def tokenize_segment(pn_segment):
    src = (pn_segment or "").strip()
    if not src:
        return []
    allowed = set(STAGE_SYMBOLS) | {"e", "t", "E", "T"}
    tokens = []
    buf = []

    def flush():
        nonlocal buf
        if buf:
            tokens.append("".join(buf))
            buf = []

    for ch in src:
        if ch == ".":
            flush()
            continue
        if ch in ("x", "X"):
            flush()
            tokens.append("x")
            continue
        if ch.isspace():
            continue
        if ch in allowed:
            norm = "E" if ch == "e" else ("T" if ch == "t" else ch)
            buf.append(norm)
            continue
        # else: ignore other chars silently
    flush()
    return tokens


# Utility: symbol <-> index (1-based)
def symbol_to_index(sym):
    try:
        idx = STAGE_SYMBOLS.index(sym)
    except ValueError:
        return None
    return idx + 1  # 1-based


def index_to_symbol(pos):
    # pos is 1..12
    if 1 <= pos <= len(STAGE_SYMBOLS):
        return STAGE_SYMBOLS[pos - 1]
    return ""


def mirror_places_within_token(token, stage):
    if token == "x":
        return "x"
    places = []
    for ch in token:
        i = symbol_to_index(ch)
        if not i:
            continue
        j = stage + 1 - i  # position reversal within the stage
        places.append(j)
    places.sort()
    return "".join(index_to_symbol(p) for p in places)


def mirrored_notate(notate, stage):
    # Spread into characters, reverse, map each via mirrorPlacesWithinToken, then join
    # (faithful to the JS version you shared)
    s = clamp_stage(stage)
    mirrored_tokens = [mirror_places_within_token(tok, s) for tok in reversed(list(notate))]
    print("Mirrored tokens = ", mirrored_tokens)
    print("Mirrored tokens.join() = ", "".join(mirrored_tokens))
    return "".join(mirrored_tokens)


# ---------------- Expand with commas and the special ';' semantics ----------------
# If there's exactly one ';', apply the special rule described.
# Otherwise, old behavior:
#   - with commas: per-segment palindromes (tokens + reverse(tokensWithoutLast))
#   - without commas: just tokenize (no mirroring)
def expand_place_notation(pn_string, stage):
    raw = (pn_string or "").strip()
    if not raw:
        return []

    semi_idx = raw.find(";")
    if semi_idx != -1:
        # split into LEFT ; RIGHT (ignore any extra ';' beyond the first)
        left_raw = raw[:semi_idx].strip()
        right_raw = raw[semi_idx + 1 :].strip()

        left_tokens = tokenize_segment(left_raw)
        right_tokens = mirrored_notate(right_raw, clamp_stage(stage))

        print("right raw, right tokens = ", right_raw, ",", right_tokens)

        # Build S1: leftTokens + reverse(leftTokensWithoutLast) with per-token place reversal
        # NOTE: this replicates the exact JS slice logic: slice(0, -1 - stage%2)
        # (i.e., odd stages drop two, even stages drop one, before mirroring)
        cut = -1 - (clamp_stage(stage) % 2)
        if cut == 0:  # Python slice(0,0) => empty, match JS intent
            left_tail_src = []
        else:
            left_tail_src = left_tokens[:cut]
        left_tail = list(reversed(left_tail_src))
        left_tail = [mirror_places_within_token(tok, clamp_stage(stage)) for tok in left_tail]
        S1 = list(left_tokens) + left_tail

        # Final lead token list per your JS:
        # return [...S1, rightTokens, ...S1rev, rightRaw];
        S1rev = list(reversed(S1))
        # Note: rightTokens is a STRING here (as in your JS), rightRaw string appended at end
        return S1 + [right_tokens] + S1rev + [right_raw]

    # Legacy comma behavior (unchanged)
    if "," in raw:
        segments = [s.strip() for s in raw.split(",") if s.strip()]
        out = []
        for seg in segments:
            toks = tokenize_segment(seg)
            if not toks:
                continue
            mirror = list(reversed(toks[:-1]))  # plain mirror (no place reversal)
            out.extend(toks)
            out.extend(mirror)
        return out

    # No commas: simple tokenize, no mirroring
    return tokenize_segment(raw)


# ---------------- Apply a token to a row (unchanged) ----------------
def apply_token_to_row(row, token, stage):
    n = len(row)
    src = list(row)
    out = src[:]

    if token == "x":
        i = 0
        while i + 1 < n:
            out[i] = src[i + 1]
            out[i + 1] = src[i]
            i += 2
        return "".join(out)

    places = set()
    for ch in token:
        pos = symbol_to_index(ch)
        if pos and 1 <= pos <= stage:
            places.add(pos)

    i = 1  # 1-based walk
    while i <= n:
        j = i + 1
        if i in places:
            out[i - 1] = src[i - 1]
            i += 1
            continue
        if j > n:
            out[i - 1] = src[i - 1]
            i += 1
            continue
        if j in places:
            out[i - 1] = src[i - 1]
            i += 1
            continue

        out[i - 1] = src[j - 1]
        out[j - 1] = src[i - 1]
        i += 2

    return "".join(out)


# ---------------- Generate rows by repeating the lead token list ----------------
def generate_list(pn_string, stage, max_leads=12):
    s = clamp_stage(stage)
    rounds = rounds_for_stage(s)

    # expand_place_notation needs stage (for the ';' mapping)
    lead_tokens = expand_place_notation(pn_string, s)
    if not lead_tokens:
        return [rounds]

    print("Expanded PN tokens:", collapse_place_notation(lead_tokens))

    rows = [rounds]
    current = rounds
    leads = 0

    while leads < max_leads:
        for t in lead_tokens:
            current = apply_token_to_row(current, t, s)
            rows.append(current)
        leads += 1
        if current == rounds:
            break  # back to rounds
    return rows


def collapse_place_notation(tokens):
    """
    Collapse an expanded token list back into a compact PN string.
    Example: ["x","12","56","x","78"] => "x12.56x78"
    """
    if not tokens:
        return ""
    out = []
    for i, tok in enumerate(tokens):
        prev = tokens[i - 1] if i > 0 else None

        # If both prev and current are numbers/places, insert a dot
        is_num = lambda t: t != "x"
        if prev is not None and is_num(prev) and is_num(tok):
            out.append(".")
        out.append(tok)
    return "".join(out)
