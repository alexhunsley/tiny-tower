from collections import Counter
from itertools import combinations

def _pair_distance_in_row(row, a, b):
    pa = row.index(a)
    pb = row.index(b)
    return abs(pa - pb)

def _distances_for_pair(rows, a, b):
    return [_pair_distance_in_row(r, a, b) for r in rows]

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

def tenor_metrics(rows, tenor_pair=(7, 8)):
    if not rows:
        raise ValueError("rows must be a non-empty list of rows.")
    n_bells = len(rows[0])

    a, b = tenor_pair
    dists = _distances_for_pair(rows, a, b)

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

def rank_all_pairs(rows, exclude={1}, include_bells=None):
    """
    Rank ALL unordered bell pairs (a,b) with a<b, excluding bells in `exclude`.
    If include_bells is provided, only those bells are considered (minus `exclude`).
    Default excludes treble (1) so you get 2–8 on 8 bells.
    """
    if not rows:
        raise ValueError("rows must be a non-empty list of rows.")

    # Derive the bell set robustly from the data (union over rows),
    # unless the caller supplies an explicit include_bells set.
    if include_bells is None:
        bells_set = set()
        for r in rows:
            bells_set.update(r)
    else:
        bells_set = set(include_bells)

    if exclude:
        bells_set -= set(exclude)

    # Ensure deterministic ordering
    bells = sorted(bells_set)

    # Sanity: need at least 2 bells to form pairs
    if len(bells) < 2:
        return []

    n_bells_in_row = len(rows[0])

    summaries = []
    for a, b in combinations(bells, 2):  # <-- ALL unordered pairs, no adjacency restriction
        dists = _distances_for_pair(rows, a, b)
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

# ---------------------------
# Example:
rows = [
    [1,2,3,4,5,6,7,8],
    [2,1,3,4,5,6,7,8],
    [2,3,1,4,5,6,7,8],
    [2,3,4,1,5,6,7,8],
    [2,3,4,5,1,6,7,8],
    [2,3,4,5,6,1,7,8],
    [2,3,4,5,6,7,1,8],
    [2,3,4,5,6,7,8,1],
]
print(tenor_metrics(rows, (7,8)))

ranked = rank_all_pairs(rows, exclude={1})  # includes (2,4), (2,5), ... etc.
for s in ranked:
    print(s["pair"], s["mean_distance"], s["max_distance"])