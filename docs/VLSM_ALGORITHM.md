# VLSM Allocation Engine — Technical Explanation

Module: `src/engines/vlsm/` · Pure, deterministic, no I/O, no Cisco config generation.

## 1. Data representation

Every address is an **unsigned 32-bit integer**, produced with multiplicative math
(`((a*256 + b)*256 + c)*256 + d`) — always < 2^32, comfortably inside
`Number.MAX_SAFE_INTEGER` (2^53 − 1), so no floating-point precision loss is possible.
Every bitwise operator result is normalised with `>>> 0` to defeat JavaScript's
signed-32-bit unary behaviour above `0x80000000` (sign-boundary classes like 128.0.0.0/1
round-trip exactly — see `bits.test.ts`).

## 2. Prefix mapping (RFC 3021 aware) — `hostsToPrefix(h)`

| Demand | Prefix | Cap (usable) | Reason |
|---|---|---|---|
| ≤ 1 host | /32 | 1 | single-host route; the one address is usable |
| exactly 2 hosts | /31 | 2 | RFC 3021 point-to-point: both addresses usable, no network/broadcast dedup |
| n ≥ 3 hosts | smallest p with 2^(32−p) − 2 ≥ n | 2^(32−p) − 2 | classical two-address reservation (network + broadcast) |

Implementation drives the scan **downward from /32 to /0** and returns the first hit:
the *smallest* block that satisfies the demand (= highest prefix = least waste).
Walking upward instead (bug caught during development) starts at /0 and always "succeeds"
erroneously — the漠 downward scan is what makes "minimal block" a structural property.

## 3. Determinism guarantees

1. **Sort**: requests are sorted by demanded block size, descending; ties break on the
   *original collection index* (stable ordering), never on object identity or random state.
2. **Carving**: a monotone cursor within the root block. Each step advances the cursor by
   its own block size, so every new network address is automatically aligned on its own
   boundary (`networkInt % blockSize == 0` — asserted by tests).
3. **No randomness, no dates** anywhere in the allocation path — same input → byte-identical
   output object graph (asserted by the determinism test).
4. Input arrays are never mutated: the engine sorts a defensive copy.

## 4. Invariants (proven, not assumed)

- **Fit**: `cursor + blockSize ≤ rootEnd` — an oversized demand raises
  `AddressSpaceExhaustedError` naming the request, its block, cursor and root end.
- **No overlap**: monotone carving makes intersection structurally impossible; an O(n)
  boundary assertion still runs over the *emitted* list (neighbor blocks must not
  intersect) raising `SubnetOverlapError` if the invariant were ever violated —
  defense-in-depth for the acceptance criterion rather than a rubber stamp.
- **Containment**: every emitted network address is inside `[rootBase, rootBroadcast]`;
  tested pairwise.
- **Request validation**: positive integer host counts, ≤ 2^32 − 2 (the maximum usable
  IPv4 space), non-empty unique identifiers (duplicates raise `VlsmRequestError`).

## 5. Audience of the output — `SubnetPlanItem`

Per allocation: `network`, `prefix`, `mask` (CIDR→mask conversion), `wildcard`
(exact bit complement — for OSPF `network` statements and ACLs), `broadcast`
(`network | hostBits`; empty string for /31 and /32 where the concept does not exist),
`firstHost`, `lastHost`, **`gateway = firstHost`** (first usable IP reserved per the
functional spec), `totalAddresses` (= 2^(32−p), /31→2, /32→1), `capacity` (usable),
`requestedHosts`, and `utilization` = requested/capacity (rounded to 4 dp).

Root-level `efficiency` = Σ(usable capacity of carved blocks) / (usable capacity of root).

## 6. Boundary behaviour quick table

| Input | Result |
|---|---|
| Root `192.168.1.0/24`: 100/50/20 hosts | /25+ /26+ /27+ blocks, gateways .1/.129/.193 (worked example) |
| Copper-style 2-host router link | /31 (both usable, gateway = first, no broadcast) |
| Loopback (1 host) | /32 single-address block |
| Root `10.9.0.0/29`, demand 500 | `AddressSpaceExhaustedError` |
| Duplicate ids, zero/negative/fractional hosts | `VlsmRequestError` |
| Root `192.168.1.5/24` (unaligned) | `VlsmRequestError` naming the normalised base |
| 800 mixed demands in a /16 | single pass, O(n log n), no overlap (tested pairwise) |
