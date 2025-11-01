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
          gap: 10rem;
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
          # background: #aa0;
          font-size: 14px;
          font-weight: normal;
          white-space: nowrap;
          margin-left: 1.5rem;

          margin-left: auto;   /* ✅ this pushes it to the right edge */
          text-align: right;   /* ✅ right-justify the text inside */
          }
      table { border-collapse: separate; border-spacing: 2px; }
      th, td {
        min-width: 44px; height: 36px; text-align: center;
        border: 1px solid #ddd; border-radius: 6px; padding: 4px 6px;
        font-variant-numeric: tabular-nums;
      }
      td.empty {
          border: none !important;
          background: none !important;
      }
      th { background: #f6f7f9; }
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

    html.append("<table>")
    html.append("<tr><th></th>" + "".join(f"<th>{b}</th>" for b in bells) + "</tr>")

    for i, a in enumerate(bells):
        row_cells = [f"<th>{a}</th>"]
        for j, b in enumerate(bells):
            if j <= i:
                # row_cells.append("<td class='blank'>–</td>" if j == i else "<td class='blank'></td>")
                row_cells.append("<td class='empty'></td>")                
            else:
                m = mean_dist[(a, b)]
                color = to_rgb_hex(m)
                val = f"{m:.2f}" if m == m else ""
                row_cells.append(f"<td style='background:{color}' title='mean distance {a}–{b}: {val}'>{val}</td>")
        html.append("<tr>" + "".join(row_cells) + "</tr>")
    html.append("</table>")

    low = "#ffffff"
    high = to_rgb_hex(dmax_possible)
    html.append(f"""
    <div class="legend">
      <span class="chip" style="background:{low}"></span> low (1)
      &nbsp;→&nbsp;
      <span class="chip" style="background:{high}"></span> high ({dmax_possible})
    </div>
    """)

    out = "\n".join(html)
    with open(filename, "w", encoding="utf-8") as f:
        f.write(out)
    return filename

# ---------------------------
# Example usage:
# rows = ["12345678", "21345678", "23145678", "23415678", "23451678", "23456178", "23456718", "23456781"]
# print(tenor_metrics(rows))
# ranked = rank_all_pairs(rows, exclude={1})
# print(ranked[:5])
# print(generate_distance_heatmap_html(rows, filename="pair_distance_heatmap.html"))


# bristol 8
rows = ["12345678",
        "28436517", # H
        "12846357",
        "21438675", # H
        "24136857",
        "42316587", # H
        "24135678",
        "42315768", # H
        "24351786",
        "23457168", # H
        "32541786",
        "35247168","53427618","35246781","32547618","23456781","24365871","42638517","46235871","64328517","46238157","42631875","24368157","23461875","32416857","23146587","32415678","23145768","21347586","12435768","21345678","12436587","14263857","41628375","14268735","41627853","46128735","64218375","46123857","64213587","46231578","42635187","24361578","23465187","32645817","23468571","24365817","42638571","46283751","64827315","68423751","86247315","68427135","64821753","46287135","42681753","24618735","42168375","24613857","42163587","41265378","14623587","41263857","14628375","16482735","61847253","16487523","61845732","68147523","86417253","68142735","86412375","68421357","64823175","46281357","42683175","24863715","42687351","46283715","64827351","68472531","86745213","87642531","78465213","87645123","86741532","68475123","64871532","46817523","64187253","46812735","64182375","61483257","16842375","61482735","16847253","18674523","81765432","18675342","81763524","87165342","78615432","87164523","78614253","87641235","86742153","68471235","64872153","46782513","64875231","68472513","86745231","87654321","78563412","75864321","57683412","75863142","78561324","87653142","86751324","68715342","86175432","68714523","86174253","81672435","18764253","81674523","18765432","17856342","71583624","17853264","71582346","75183264","57813624","75186342","57816432","75861423","78564132","87651423","86754132","68574312","86753421","87654312","78563421","75836241","57382614","53786241","35872614","53782164","57381246","75832164","78531246","87513264","78153624","87516342","78156432","71854623","17586432","71856342","17583624","15738264","51372846","15732486","51374268","53172486","35712846","53178264","35718624","53781642","57386124","75831642","78536124","87356214","78532641","75836214","57382641","53728461","35274816","32578461","23754816","32574186","35271468","53724186","57321468","75312486","57132846","75318264","57138624","51736842","15378624","51738264","15372846","13527486","31254768","13524678","31256487","32154678","23514768","32157486","23517846","32571864","35278146","53721864","57328146","75238416","57324861","53728416","35274861","32547681","23456718","24357681","42536718","24356178","23451687","32546178","35241687","53214678","35124768","53217486","35127846","31528764","13257846","31527486","13254768"]

print(tenor_metrics(rows))
ranked = rank_all_pairs(rows, exclude={1})
print(ranked[:5])
# print(generate_distance_heatmap_html(rows, "Bristol Surprise Major", filename="pair_distance_heatmap.html"))

title = "Bristol Surprise Major"

generate_distance_heatmap_html(rows, title, include_wraparounds=True)
generate_distance_heatmap_html(rows, title)

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
