import math
import csv

# ---------- LCM helpers ----------
def lcm(a, b):
    return abs(a * b) // math.gcd(a, b)

def lcm_list(nums):
    v = 1
    for n in nums:
        v = lcm(v, n)
    return v

# ---------- Partition generator (no 1s) ----------
def partitions(n, max_part=None):
    """Generate all integer partitions of n using parts >= 2 (no 1s), nondecreasing order."""
    if n == 0:
        yield []
        return
    if max_part is None:
        max_part = n
    for i in range(2, max_part + 1):
        if n - i < 0:
            break
        for tail in partitions(n - i, i):
            yield [i] + tail

# ---------- Place-notation symbol mapping (1..30) ----------
# 1..9, 0=10, E=11, T=12, A=13, B=14, C=15, D=16,
# F=17, G=18, H=19, J=20, K=21, L=22, M=23, N=24,
# P=25, Q=26, R=27, S=28, U=29, V=30
PN_SYMBOLS = {
    1:"1", 2:"2", 3:"3", 4:"4", 5:"5", 6:"6", 7:"7", 8:"8", 9:"9",
    10:"0", 11:"E", 12:"T", 13:"A", 14:"B", 15:"C", 16:"D",
    17:"F", 18:"G", 19:"H", 20:"J", 21:"K", 22:"L", 23:"M", 24:"N",
    25:"P", 26:"Q", 27:"R", 28:"S", 29:"U", 30:"V"
}

def encode_place(n: int) -> str:
    if not (1 <= n <= 30):
        raise ValueError(f"Place {n} out of supported range 1..30")
    return PN_SYMBOLS[n]

# ---------- PN construction ----------
def pn_for_partition(parts_desc):
    """
    Build PN for a partition given in descending order.
    Rules:
      - Even k -> contributes 'x.1k'
      - Odd  k -> contributes 'k.1'
      - Before encoding each k-block, add offset = sum(previous parts) to all numeric places.
      - Combine all first-parts and second-parts across blocks; sort numeric places in each half.
      - NEW RULE: If the first half contains any numeric places, suppress all 'x' in the first half.
                  (So you never get 'x1' or 'xF' — it's either only x's, or only places.)
    """
    offset = 0
    a_numeric_places = []   # numeric places for first half
    a_cross_count = 0       # count of 'x' from even parts
    b_numeric_places = []   # numeric places for second half

    for k in parts_desc:
        if k % 2 == 0:
            # even k -> "x.1k"
            a_cross_count += 1
            b_numeric_places.extend([1 + offset, k + offset])
        else:
            # odd k -> "k.1"
            a_numeric_places.append(k + offset)
            b_numeric_places.append(1 + offset)
        offset += k

    # Sort and encode numeric places
    a_places_encoded = "".join(encode_place(n) for n in sorted(a_numeric_places))
    b_places_encoded = "".join(encode_place(n) for n in sorted(b_numeric_places))

    # Apply the "no x mixed with places" rule in the first half
    if a_places_encoded:
        a_part = a_places_encoded            # suppress all x's if any places exist
    else:
        a_part = "x" * a_cross_count         # only x's (possibly empty)

    b_part = b_places_encoded
    return f"{a_part}.{b_part}"

# ---------- Compute and write CSV ----------
def main():
    rows = []
    for total in range(5, 31):
        best_lcm = 0
        best_parts = []

        for p in partitions(total):
            if not p:
                continue
            val = lcm_list(p)
            if val > best_lcm:
                best_lcm = val
                best_parts = [p]
            elif val == best_lcm:
                best_parts.append(p)

        for p in best_parts:
            parts_desc = sorted(p, reverse=True)
            partition_str = " + ".join(map(str, parts_desc))
            pn = pn_for_partition(parts_desc)
            rows.append({
                "n": total,
                "partition": partition_str,
                "max_lcm": best_lcm,
                "changes": best_lcm * 2,
                "PN": pn
            })

    with open("max_lcm_partitions_with_pn.csv", "w", newline="") as f:
        writer = csv.DictWriter(f, fieldnames=["n", "partition", "max_lcm", "changes", "PN"])
        writer.writeheader()
        writer.writerows(rows)

    print("✅ CSV file 'max_lcm_partitions_with_pn.csv' written.")

if __name__ == "__main__":
    main()
    