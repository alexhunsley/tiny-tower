from collections import Counter
from itertools import combinations

# ---------- core stats helpers ----------

def _pair_distance_in_row(row, a, b):
    pa = row.index(a)
    pb = row.index(b)
    return abs(pa - pb)

def pair_min_distance_two_rows(row_this, row_next, a, b):
    """
    Two-row min-distance (order-independent).

    Returns the minimum of:
      (i)  same-row distance between a and b in row_this, and
      (ii) wrap distance across the boundary between row_this and row_next,
           defined as the minimum of BOTH directions:
              A_this -> B_next   and   B_this -> A_next
    If row_next is None, returns (i).

    Accepts rows as lists of ints or digit strings like "12345678".
    """
    # Allow strings like "12345678"
    if isinstance(row_this, str):
        row_this = [int(c) for c in row_this]
    if row_next is not None and isinstance(row_next, str):
        row_next = [int(c) for c in row_next]

    # (i) same-row distance
    d_same = _pair_distance_in_row(row_this, a, b)

    if row_next is None:
        return d_same

    n = len(row_this)
    posA_this = row_this.index(a)
    posB_this = row_this.index(b)
    posA_next = row_next.index(a)
    posB_next = row_next.index(b)

    # (ii) cross-row distances measured on the concatenated index space:
    # row_this positions: 0..n-1
    # row_next positions: n..2n-1
    d_wrap_A_to_B = (n + posB_next) - posA_this
    d_wrap_B_to_A = (n + posA_next) - posB_this

    d_wrap = min(d_wrap_A_to_B, d_wrap_B_to_A)

    return min(d_same, d_wrap)

def _distances_for_pair(rows, a, b, include_wraparounds=False):
    """
    Vector of distances for a given pair over all rows.

    If include_wraparounds is True:
      - For every odd-indexed row i (i = 1, 3, 5, ...), use the minimum of
        the same-row distance on row i and the wrap distance from A on row i
        to B on row i+1. If row i is the last row, use same-row distance.
      - For even-indexed rows, use the same-row distance as usual.

    If include_wraparounds is False:
      - Use same-row distance for all rows.
    """
    dists = []
    n_rows = len(rows)
    for i, r in enumerate(rows):
        if include_wraparounds and (i % 2 == 1) and (i + 1 < n_rows):
            d = pair_min_distance_two_rows(r, rows[i + 1], a, b)
        else:
            d = _pair_distance_in_row(r, a, b)
        dists.append(d)
    return dists

def _mean(xs):
    return sum(xs) / len(xs) if xs else float('nan')

def _median(xs):
    n = len(xs)
    if n == 0:
        return float('nan')
    xs = sorted(xs)
    mid = n // 2
    return xs[mid] if n % 2 else 0.5 * (xs[mid - 1] + xs[mid])

def _stdev(xs):
    n = len(xs)
    if n <= 1:
        return 0.0
    mu = _mean(xs)
    return (sum((x - mu) ** 2 for x in xs) / n) ** 0.5

def _adjacency_rate(distances):
    n = len(distances)
    return (sum(1 for d in distances if d == 1) / n) if n else 0.0

def _run_lengths_adjacent(distances):
    runs, cur = [], 0
    for d in distances:
        if d == 1:
            cur += 1
        else:
            if cur > 0: runs.append(cur)
            cur = 0
    if cur > 0:
        runs.append(cur)
    return runs

def _togetherness_score(mean_distance, n_bells):
    dmin, dmax = 1, n_bells - 1
    if dmax == dmin:
        return 1.0
    clamped = max(dmin, min(mean_distance, dmax))
    return 1.0 - (clamped - dmin) / (dmax - dmin)

def distance_distribution(distances, n_bells):
    total = len(distances)
    counts = Counter(distances)
    return {d: (counts.get(d, 0) / total * 100.0 if total else 0.0)
            for d in range(1, n_bells)}

# ---------- tenor metrics & ranking ----------

def tenor_metrics(rows, tenor_pair=(7, 8), include_wraparounds=False):
    if not rows:
        raise ValueError("rows must be a non-empty list of rows.")
    # Convert from strings like "12345678" → [1,2,3,4,5,6,7,8]
    if isinstance(rows[0], str):
        rows = [[int(c) for c in r] for r in rows]

    n_bells = len(rows[0])
    a, b = tenor_pair
    dists = _distances_for_pair(rows, a, b, include_wraparounds=include_wraparounds)

    mu = _mean(dists)
    med = _median(dists)
    sd = _stdev(dists)
    dmax = max(dists) if dists else 0
    adj = _adjacency_rate(dists)
    runs = _run_lengths_adjacent(dists)
    mean_run = _mean(runs) if runs else 0.0
    max_run = max(runs) if runs else 0

    return {
        "pair": tenor_pair,
        "n_rows": len(rows),
        "mean_distance": mu,
        "median_distance": med,
        "std_distance": sd,
        "max_distance": dmax,
        "adjacency_rate": adj,
        "adjacency_mean_run": mean_run,
        "adjacency_max_run": max_run,
        "togetherness_score": _togetherness_score(mu, n_bells),
        "distribution_pct": distance_distribution(dists, n_bells),
    }

def rank_all_pairs(rows, exclude={1}, include_bells=None, include_wraparounds=False):
    """
    Rank ALL unordered bell pairs (a,b) with a<b, excluding bells in `exclude`.
    If include_bells is provided, only those bells are considered (minus `exclude`).
    Default excludes treble (1). Distances optionally use wraparounds.
    """
    if not rows:
        raise ValueError("rows must be a non-empty list of rows.")
    # Convert from strings if needed
    if isinstance(rows[0], str):
        rows = [[int(c) for c in r] for r in rows]

    # Build bell set from data unless explicitly specified
    if include_bells is None:
        bells_set = set()
        for r in rows:
            bells_set.update(r)
    else:
        bells_set = set(include_bells)

    if exclude:
        bells_set -= set(exclude)

    bells = sorted(bells_set)
    if len(bells) < 2:
        return []

    n_bells_in_row = len(rows[0])
    summaries = []
    for a, b in combinations(bells, 2):
        dists = _distances_for_pair(rows, a, b, include_wraparounds=include_wraparounds)
        mu = _mean(dists)
        med = _median(dists)
        sd = _stdev(dists)
        dmax = max(dists) if dists else 0
        adj = _adjacency_rate(dists)
        runs = _run_lengths_adjacent(dists)
        mean_run = _mean(runs) if runs else 0.0
        max_run = max(runs) if runs else 0
        summaries.append({
            "pair": (a, b),
            "n_rows": len(rows),
            "mean_distance": mu,
            "median_distance": med,
            "std_distance": sd,
            "max_distance": dmax,
            "adjacency_rate": adj,
            "adjacency_mean_run": mean_run,
            "adjacency_max_run": max_run,
            "togetherness_score": _togetherness_score(mu, n_bells_in_row),
            "distribution_pct": distance_distribution(dists, n_bells_in_row),
        })

    # Sort best→worst: mean asc, then max asc, then stdev asc, then adjacency desc
    summaries.sort(key=lambda s: (
        s["mean_distance"],
        s["max_distance"],
        s["std_distance"],
        -s["adjacency_rate"],
    ))
    return summaries

# ---------- triangular heatmap HTML ----------

def generate_distance_heatmap_html(
    rows,
    title="no-title",
    exclude={1},
    include_bells=None,
    include_wraparounds=False,
):
    suffix = f"__wraparound" if include_wraparounds else ""
    filename = f"pair_distance_heatmap__{title}{suffix}.html"

    """
    Create an HTML file with an upper-triangular half-grid of MEAN distances
    between bells A and B. Cell background is a white→orange heatmap
    (higher mean distance = more orange).
    """
    if not rows:
        raise ValueError("rows must be a non-empty list of rows.")
    # Convert from strings if needed
    if isinstance(rows[0], str):
        rows = [[int(c) for c in r] for r in rows]

    # Determine bell set
    if include_bells is None:
        bells_set = set()
        for r in rows:
            bells_set.update(r)
    else:
        bells_set = set(include_bells)

    if exclude:
        bells_set -= set(exclude)

    bells = sorted(bells_set)
    if len(bells) < 2:
        raise ValueError("Need at least two bells to build a grid.")

    n_bells_in_row = len(rows[0])
    dmin, dmax_possible = 1, n_bells_in_row - 1

    # Precompute mean distances for all unordered pairs (with wraparound option)
    mean_dist = {}
    for a, b in combinations(bells, 2):
        dists = _distances_for_pair(rows, a, b, include_wraparounds=include_wraparounds)
        mean_dist[(a, b)] = _mean(dists)

    # Colour mapping: linear blend white (255,255,255) to orange (255,140,0)
    def to_rgb_hex(mean_d):
        if mean_d is None:
            return "#ffffff"
        t = 0.0 if dmax_possible == dmin else (max(dmin, min(mean_d, dmax_possible)) - dmin) / (dmax_possible - dmin)
        w = (255, 255, 255)
        o = (255, 140, 0)
        r = int(round(w[0] + t * (o[0] - w[0])))
        g = int(round(w[1] + t * (o[1] - w[1])))
        b = int(round(w[2] + t * (o[2] - w[2])))
        return f"#{r:02x}{g:02x}{b:02x}"

    css = """
    <style>
      body { font-family: system-ui, -apple-system, Segoe UI, Roboto, Arial, sans-serif; padding: 16px; }
      h1 { font-size: 18px; margin: 0 0 12px 0; }

        caption {
          caption-side: top;
          margin-bottom: 8px;
          width: 100%;                 /* match table width */
        }

        .caption {
          display: flex;
          align-items: right;
          justify-content: flex-end;
          gap: 6.2rem;
          width: 100%;
          white-space: nowrap;             /* keep on one line */
        }

        .cap-title {
          margin: 0;
          font-size: 18px;
          flex: 1 1 auto;                  /* title takes remaining space */
          min-width: 0;                    /* allow shrink for ellipsis */
          overflow: hidden;
          text-overflow: ellipsis;
        }

        .subtitle {
          color: #555;
          font-size: 14px;
          font-weight: normal;
          white-space: nowrap;
          margin-left: auto;
          text-align: right;
          }
      table { border-collapse: separate; border-spacing: 2px; }
      td, th {
        min-width: 44px; height: 36px; text-align: center;
        font-variant-numeric: tabular-nums;
      }
      td {
        border: 1px solid #ddd; border-radius: 6px; padding: 4px 6px;
      }      
      td.empty {
          border: none !important;
          background: none !important;
      }
      # th { background: #f6f7f9; }
      .legend { margin-top: 12px; font-size: 12px; color: #555; }
      .chip { display:inline-block; width: 16px; height: 12px; border: 1px solid #ddd; vertical-align: middle; }
    </style>
        """

      # td.blank { background: #fafafa; color: #bbb; }

    subtitle = "bell pair distances"
    html = [f"""<!doctype html><meta charset='utf-8'>
    <title>{title}</title>
    {css}
    """]
    html.append("<table>")
    html.append(f"""
        <table>
            <caption class="caption">
              <h1 class="cap-title">{title}</h1>
              <span class="subtitle">{subtitle}</span>
            </caption>
    """)

    x_axis_bells = bells[1:][::-1]
    y_axis_bells = bells[:-1]

    # print(f"AXES: X {x_axis_bells}")
    # print(f"AXES: Y {y_axis_bells}")

    html.append("<table>")
    # html.append("<tr><th></th>" + "".join(f"<th>{b}</th>" for b in bells) + "</tr>")
    html.append("<tr><th></th>" + "".join(f"<th>{b}</th>" for b in x_axis_bells) + "</tr>")

    for i, a in enumerate(y_axis_bells):
        row_cells = []
        row_cells.append(f"<th>{a}</th>")
        for j, b in enumerate(x_axis_bells):
            if b <= a:
                row_cells.append("<td class='empty'></td>")                
            else:
                m = mean_dist[(a, b)]
                color = to_rgb_hex(m)
                val = f"{m:.2f}" if m == m else ""
                # print(f"Doing {j, b} and {i, a}: dist = {m}")

                row_cells.append(f"<td style='background:{color}' title='mean distance {a}–{b}: {val}'>{val}</td>")
        html.append("<tr>" + "".join(row_cells) + "</tr>")
    html.append("</table>")

    out = "\n".join(html)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(out)
    return filename


from collections import Counter

def count_patterns(rows, width=5, include_wraparounds=False):
    """
    Count fixed-width substrings across a list of strings.

    When include_wraparounds is True:
      - even rows (0,2,4,...) are scanned within-row as usual
      - odd rows (1,3,5,...) are NOT scanned within-row; instead we scan
        the entire concatenation rows[i] + rows[i+1] (if next row exists).
        If there's no next row, the odd row contributes nothing.

    Note: This may count substrings fully contained in rows[i+1] again when
    the loop reaches that even row. That matches your clarification.
    """
    if width <= 0:
        return []

    counts = Counter()

    for i, row in enumerate(rows):
        # front music!
        row = row[0:width]

        row_sorted = ''.join(sorted(row))

        # if row_sorted != "23456":
        if row_sorted != "123456":
            continue

        # front music:
        # 1: '132456' - bob on 245 to make 524, then get queens 135246. (in middle-ish of method)
        #     - also swap 2,3 for rounds obv which is also there once.
        #
        # 1: '142365' 29 - bob 365 to get little tittums: 142536. 
        #
        n = len(row)
        if not include_wraparounds:
            # Normal: count all substrings within this row
            if n >= width:
                for s in range(n - width + 1):
                    counts[row[s:s+width]] += 1
            continue

        # include_wraparounds = True
        if i % 2 == 0:
            # Even row: within-row scan
            if n >= width:
                for s in range(n - width + 1):
                    counts[row[s:s+width]] += 1
        else:
            # Odd row: scan row+next_row only (no within-row for this row)
            if i + 1 >= len(rows):
                continue  # no next row -> skip
            joined = row + rows[i + 1]
            m = len(joined)
            if m >= width:
                for s in range(m - width + 1):
                    counts[joined[s:s+width]] += 1

    # Return sorted list of (count, pattern), highest count first then pattern
    return sorted(((c, p) for p, c in counts.items()),
                  key=lambda t: (-t[0], t[1]))


def add_overlap_scores(pattern_counts):
    """
    Given a list of (count, pattern) tuples, return a list of
    (count, pattern, overlap_score) where overlap_score is the sum over all
    other patterns of the overlap length. Overlaps are counted on both edges:
      - suffix(pattern) == prefix(other)
      - prefix(pattern) == suffix(other)
    Self-overlaps are not counted.

    Sorted by:
      1. count (descending)
      2. overlap_score (descending)
      3. pattern (ascending)
    """
    def _overlap_suffix_prefix(a, b):
        max_k = min(len(a), len(b)) - 1
        for k in range(max_k, 0, -1):
            if a[-k:] == b[:k]:
                return k
        return 0

    def _overlap_prefix_suffix(a, b):
        max_k = min(len(a), len(b)) - 1
        for k in range(max_k, 0, -1):
            if a[:k] == b[-k:]:
                return k
        return 0

    patterns = [p for _, p in pattern_counts]
    n = len(patterns)
    scores = [0] * n

    for i in range(n):
        a = patterns[i]
        for j in range(n):
            if i == j:
                continue
            b = patterns[j]

            score_mult = 2

            scores[i] += pow(_overlap_suffix_prefix(a, b), 2)
            scores[i] += pow(_overlap_prefix_suffix(a, b), 2)

    results = [(count, pattern, scores[idx]) for idx, (count, pattern) in enumerate(pattern_counts)]

    # Sort: count ↓, overlap ↓, pattern ↑
    results.sort(key=lambda x: (-x[0], x[2], x[1]))
    return results



# ---------------------------
# Example usage:
# rows = ["12345678", "21345678", "23145678", "23415678", "23451678", "23456178", "23456718", "23456781"]
# print(tenor_metrics(rows))
# ranked = rank_all_pairs(rows, exclude={1})
# print(ranked[:5])
# print(generate_distance_heatmap_html(rows, filename="pair_distance_heatmap.html"))


# bristol 8
# rows = ["12345678",
#         "28436517", # H
#         "12846357",
#         "21438675", # H
#         "24136857",
#         "42316587", # H
#         "24135678",
#         "42315768", # H
#         "24351786",
#         "23457168", # H
#         "32541786",
#         "35247168","53427618","35246781","32547618","23456781","24365871","42638517","46235871","64328517","46238157","42631875","24368157","23461875","32416857","23146587","32415678","23145768","21347586","12435768","21345678","12436587","14263857","41628375","14268735","41627853","46128735","64218375","46123857","64213587","46231578","42635187","24361578","23465187","32645817","23468571","24365817","42638571","46283751","64827315","68423751","86247315","68427135","64821753","46287135","42681753","24618735","42168375","24613857","42163587","41265378","14623587","41263857","14628375","16482735","61847253","16487523","61845732","68147523","86417253","68142735","86412375","68421357","64823175","46281357","42683175","24863715","42687351","46283715","64827351","68472531","86745213","87642531","78465213","87645123","86741532","68475123","64871532","46817523","64187253","46812735","64182375","61483257","16842375","61482735","16847253","18674523","81765432","18675342","81763524","87165342","78615432","87164523","78614253","87641235","86742153","68471235","64872153","46782513","64875231","68472513","86745231","87654321","78563412","75864321","57683412","75863142","78561324","87653142","86751324","68715342","86175432","68714523","86174253","81672435","18764253","81674523","18765432","17856342","71583624","17853264","71582346","75183264","57813624","75186342","57816432","75861423","78564132","87651423","86754132","68574312","86753421","87654312","78563421","75836241","57382614","53786241","35872614","53782164","57381246","75832164","78531246","87513264","78153624","87516342","78156432","71854623","17586432","71856342","17583624","15738264","51372846","15732486","51374268","53172486","35712846","53178264","35718624","53781642","57386124","75831642","78536124","87356214","78532641","75836214","57382641","53728461","35274816","32578461","23754816","32574186","35271468","53724186","57321468","75312486","57132846","75318264","57138624","51736842","15378624","51738264","15372846","13527486","31254768","13524678","31256487","32154678","23514768","32157486","23517846","32571864","35278146","53721864","57328146","75238416","57324861","53728416","35274861","32547681","23456718","24357681","42536718","24356178","23451687","32546178","35241687","53214678","35124768","53217486","35127846","31528764","13257846","31527486","13254768"]

# ed royal method
# x30x14x12.50.16x34x10x16x70.16x16.70.16x16.70x16x10x34x16.50.12x14x30x10
rows = ["1234567890", "2143658709", "1246385079", "2164830597", "2614385079", "6241830597", "6214385079", "2641358709", "2463157890", "4236518709", "2436157890", "4263518709", "4625381079", "6452830197", "6548231079", "5684320197", "6548230917", "6452839071", "4625380917", "4263589071", "2436859701", "2348657910", "3284569701", "3825467910", "8352647190", "3825461709", "3284567190", "2348651709", "2436815079", "4263180597", "2463815079", "4236180597", "4321685079", "3412658709", "3421567890", "4312658709", "4132567890", "1423658709", "4126385079", "1462830597", "1648203957", "6184029375", "1680492735", "6108947253", "6018492735", "0681947253", "0618492735", "6081429375", "6804123957", "8640219375", "6840123957", "8604219375", "8062491735", "0826947153", "0289641735", "2098467153", "0289647513", "0826945731", "8062497513", "8604295731", "6840925371", "6489023517", "4698205371", "4962803517", "9426083157", "4962801375", "4698203157", "6489021375", "6840912735", "8604197253", "6804912735", "8640197253", "8461092735", "4816029375", "4861203957", "8416029375", "8146203957", "1864029375", "8160492735", "1806947253", "1089674523", "0198765432", "1097856342", "0179583624", "0719856342", "7091583624", "7019856342", "0791865432", "0978164523", "9087615432", "0987164523", "9078615432", "9706851342", "7960583124", "7695081342", "6759803124", "7695083214", "7960582341", "9706853214", "9078652341", "0987562431", "0895764213", "8059672431", "8506974213", "5860794123", "8506971432", "8059674123", "0895761432", "0987516342", "9078153624", "0978516342", "9087153624", "9801756342", "8910765432", "8901674523", "9810765432", "9180674523", "1908765432", "9107856342", "1970583624", "1795038264", "7159302846", "1753920486", "7135294068", "7315920486", "3751294068", "3715920486", "7351902846", "7539108264", "5793012846", "7593108264", "5739012846", "5370921486", "3507294168", "3052791486", "0325974168", "3052794618", "3507296481", "5370924618", "5739026481", "7593206841", "7952308614", "9725036841", "9270538614", "2907358164", "9270531846", "9725038164", "7952301846", "7593210486", "5739124068", "7539210486", "5793124068", "5971320486", "9517302846", "9571038264", "5917302846", "5197038264", "1579302846", "5173920486", "1537294068", "1352749608", "3125476980", "1324567890", "3142658709", "3412567890", "4321658709", "4312567890", "3421576980", "3245179608", "2354716980", "3254179608", "2345716980", "2437561890", "4273658109", "4726351890", "7462538109", "4726358019", "4273650891", "2437568019", "2345760891", "3254670981", "3526479018", "5362740981", "5637249018", "6573429108", "5637241980", "5362749108", "3526471980", "3254617890", "2345168709", "3245617890", "2354168709", "2531467890", "5213476980", "5231749608", "2513476980", "2153749608", "1235476980", "2134567890", "1243658709", "1426385079", "4162830597", "1468203957", "4186029375", "4816203957", "8461029375", "8416203957", "4861230597", "4682135079", "6428310597", "4628135079", "6482310597", "6843201957", "8634029175", "8360421957", "3806249175", "8360429715", "8634027951", "6843209715", "6482307951", "4628037591", "4260835719", "2406387591", "2043685719", "0234865179", "2043681597", "2406385179", "4260831597", "4628013957", "6482109375", "4682013957", "6428109375", "6241803957", "2614830597", "2641385079", "6214830597", "6124385079", "1642830597", "6148203957", "1684029375", "1860492735", "8106947253", "1809674523", "8190765432", "8910674523", "9801765432", "9810674523", "8901647253", "8096142735", "0869417253", "8069142735", "0896417253", "0984671523", "9048765132", "9407861523", "4970685132", "9407865312", "9048763521", "0984675312", "0896473521", "8069743251", "8607942315", "6870493251", "6784092315", "7648902135", "6784091253", "6870492135", "8607941253", "8069714523", "0896175432", "8096714523", "0869175432", "0681974523", "6018947253", "6081492735", "0618947253", "0168492735", "1086947253", "0189674523", "1098765432", "1907856342", "9170583624", "1975038264", "9157302846", "9517038264", "5971302846", "5917038264", "9571083624", "9750186342", "7905813624", "9705186342", "7950813624", "7598031264", "5789302146", "5873901264", "8537092146", "5873902416", "5789304261", "7598032416", "7950834261", "9705384621", "9073586412", "0937854621", "0398756412", "3089576142", "0398751624", "0937856142", "9073581624", "9705318264", "7950132846", "9750318264", "7905132846", "7091538264", "0719583624", "0791856342", "7019583624", "7109856342", "1790583624", "7195038264", "1759302846", "1573920486", "5137294068", "1532749608", "5123476980", "5213749608", "2531476980", "2513749608", "5231794068", "5327190486", "3572914068", "5372190486", "3527914068", "3259741608", "2395476180", "2934571608", "9243756180", "2934576810", "2395478601", "3259746810", "3527948601", "5372498061", "5734290816", "7543928061", "7459320816", "4795230186", "7459321068", "7543920186", "5734291068", "5372419608", "3527146980", "5327419608", "3572146980", "3751249608", "7315294068", "7351920486", "3715294068", "3175920486", "1357294068", "3152749608", "1325476980"]


print(tenor_metrics(rows))
ranked = rank_all_pairs(rows, exclude={1})
print(ranked[:5])
# print(generate_distance_heatmap_html(rows, "Bristol Surprise Major", filename="pair_distance_heatmap.html"))

title = "Bristol Surprise Major"

generate_distance_heatmap_html(rows, title, include_wraparounds=True)
generate_distance_heatmap_html(rows, title)

# test_rows = [
#     "12345678",
#     "23456781",
#     "34567812",
# ]



# # bristol: no wrap patterns:   13 x len 4, 
# # bristol: with wrap patterns: 11 x len 6, 15x5, 18x4  

# # no wraparound for front-music search
# patterns = count_patterns(rows, width=6, include_wraparounds=False)[::-1]
# # patterns = count_patterns(rows, width=5, include_wraparounds=True)[::-1]

# pattern_with_overlap_score = add_overlap_scores(patterns)[::-1]

# for count, pattern, overlap_score in pattern_with_overlap_score:
#     print(f"{count}: '{pattern}' {overlap_score}")

# print(f"\nCount, pattern, overlap score\n")



# music detection

# todo, read score_scheme from csv file in ~/Documents
score = calc_score(rows, score_scheme)


# exploitable patterns for ed method:
# looking at collections of likely numbers... like 23456 runs etc.
#
# 4: '57890' 653
# 6: '25678' 619
# 14: '67452' 659
# 14: '6745' 416
# 16: '85079' 679
# 16: '56342' 680
# 24: '6342' 437
# 24: '4523' 437


# music/comping finding:
#
# put in segments: plain, bobbed, singled.
#
# decide on call positions that I want to include,
# and define the leadhead mask.
# start maybe H, W, W.
# take cue from other comps as to what most common calling positions are.
#
# music detection: 
# detect wraparound music at hand->back.
# 
# bob 14, single 1234.
# LE for ed's method is 10. So it it repeat a lead at call like bristol?

# books/articles on comp strategies?
# ? courses in a peal of surp 10.
#

# print
# for c, p in [r for r in patterns if r[1] == "1357"]:
#     print(f"{p}: {c}")

# print
# for c, p in [r for r in patterns if r[1] == "2468"]:
#     print(f"{p}: {c}")

# print
# for c, p in [r for r in patterns if r[1] == "1526"]:
#     print(f"{p}: {c}")

# for c, p in [r for r in patterns if r[1] == "4321"]:
#     print(f"{p}: {c}")

# bristol has '75312486', interesting. swap 6,8?
#  -- yes, lead 2 is nice like this. lead starts 14263857 in plain course.
#
# LB8, bob first lead, bristol: starts bristol with 18642735

# opportunity cost?
# i.e. if we target one pattern for music,
#  it comes at cost of that pattern overlapping other patterns.
# 
# To minimise, find common patterns that have least disruptive effect
# on other patterns. So, for patts of set length, we want to minimise overlap.


# wrap-around looks ok:
# print(pair_min_distance_two_rows(rows[1], rows[2], 7, 8))
# print(pair_min_distance_two_rows(rows[1], rows[2], 8, 7))
# print(pair_min_distance_two_rows(rows[1], rows[2], 1, 2))
# print(pair_min_distance_two_rows(rows[1], rows[2], 2, 1))
 

# rows = rows
# print(tenor_metrics(rows, (7,8)))

# # Create heatmap excluding treble (default)
# print(generate_distance_heatmap_html(rows, filename="pair_distance_heatmap.html"))
# # Open the resulting HTML in your browser.
