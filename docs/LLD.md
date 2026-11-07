# NetArchitect — Low-Level Design (LLD)

Per-module detail, algorithms, and rule triggers. Contract signatures live in `src/contracts/`;
this document records the *logic* behind each signature.

## 1. Profiles (`src/profiles/`)
- `loadPreset(name)`: reads `presets/<name>.json`, validates through the profile schema, tags
  `source:"preset"`.
- `validateCustom(raw)`: same schemas, `source:"custom"`.
- Adversaries: wrong profile tag, missing rootBlockCidr, campus with ≠3 buildings, metro with
  a distance outside 15–35 km, WAN city with role "cloud-vpc" also present inside `cities`.
- Boundary grace: accept values exactly at limits (100 m, 400 m, 15 km, 35 km, 5 ms) — the
  rule table itself decides which bucket they fall into; validator only checks ranges.

## 2. Media engine (`src/media/`)
Normative table (single source of physics):

| Rule | Condition | Medium + standard | Reach | Reference |
|---|---|---|---|---|
| MEDIA.01 | run ≤ 100 m (access) | Cat6a, 10GBASE-T | 100 m | IEEE 802.3an |
| MEDIA.02 | 101–400 m (backbone) | OM4 MMF, 10GBASE-SR | 400 m | IEEE 802.3ae (850 nm dispersion) |
| MEDIA.03 | 401 m – 10 km | OS2 SMF, 10GBASE-LR | 10,000 m | IEEE 802.3ae clause |
| MEDIA.04 | 10.001–40 km (MAN/WAN) | OS2 SMF, 10GBASE-ER | 40,000 m | 1550 nm optical budget |
| MEDIA.05 | copper requested > 100 m | raise `PhysicalDistanceViolationError` | — | attenuation beyond spec |

Exact-boundary semantics: 100 m → Cat6a; 400 m → OM4; 10 km → LR; 40 km → ER; >40 km →
`ReachabilityError`. Rationale text must name the boundary that was crossed (e.g. "22 km exceeds
OM4's 400 m attenuation limit").

## 3. Topology engine (`src/topology/`)
- Campus: collapsed core (2 stacked core switches) + per-building distribution/access stacks;
  links: core↔distribution (media from MEDIA.02/03/04 by run), access uplinks.
- Metro: 1 HQ router + per-site edge routers over EVPL circuits; dual EVPL handoffs when
  `dualHomedFailover`; QoS classes marked at site edges.
- WAN: per-city WAN router + IPsec tunnel devices + VPC VPN gateway; BGP sessions toward VPC.

## 4. VLAN engine (`src/vlan/`)
Deterministic numbering: requests in listed order → vlanId from 10 upward (+10 each), skipping
native VLAN 99. Trunks: all inter-tier physical links carry allowed VLANs = all planned IDs
minus native; native VLAN is unused/untagged hardening practice (never VLAN 1).

## 5. VLSM engine (`src/vlsm/`)
Bitwise allocator:
1. `hostsToPrefix(h)`: usable = 2^(32-p) − 2; special case h ≤ 2 → /31 (RFC 3021).
2. Sort requests descending by required block size.
3. Carve within `rootBlockCidr` sequentially; each block starts at the previous block's end.
4. Zero-overlap is an internal invariant — an overlap is a `SubnetOverlapError` (defect, never
   a "user error"), because the allocator's monotone-carving design forbids it structurally.
5. Reject partial-fit: remaining slack < next block → `AddressSpaceExhaustedError`.
6. Emit utilization = requested/capacity and an efficiency narrative.

## 6. Routing engine (`src/routing/`)
- Chooser: single AS & ≤ 50 subnets → single-area OSPF (Area 0, RFC 2328 note on convergence);
  multiple sites/cloud → multi-area OSPF (+ eBGP at domain borders, RFC 4364-style separation);
  summarization at ABRs `area X range …`, toward BGP `aggregate-address`.
- WAN IPsec: IKEv2 proposal, protected subnets from VLSM output, crypto ACLs.
- Metro QoS: DSCP classes map (ef→EF, af31→AF31, best-effort) with bandwidth percentages.

## 7. Config generator (`src/configgen/`)
Renderer per device: hostname, `service timestamps`, VLAN DB, 802.1Q trunks (`switchport
mode trunk`, allowed list, `native vlan 99`), 10G interfaces per media spec, SVIs from subnet
plan (first host), OSPF `router ospf 1` `router-id` + `network … area …` using wildcard masks,
`ip route-summary`, BGP/`neighbor`, IKEv2 `crypto` blocks, hardened lines (passwords, `no ip
domain-lookup`). Output is copy-paste ready per assignment rubric item 3.

## 8. Verification engine (`src/verify/`)
Fail-closed checks (export blocked when any fails):
- V-01 zero-overlap (pairwise containment test on live allocator output)
- V-02 every subnet's `usable ≥ requested`
- V-03 wildcard = inverse netmask, recomputed independently
- V-04 VLAN ids unique, 1..4094, native unused
- V-05 every physical link has a feasible media spec (no copper > 100 m slipping through)
- V-06 routers referenced by OSPF/BGP exist in topology
- V-07 metro end-to-end latency < target (provider skew math, documented assumption)
- V-08 wildcard-mask edge cases (/31, /32, block boundaries)

## 9. Export manager (`src/export/`)
Layout:
```
exports/<scenario>/
├─ report.md          # full design + rationale (rendered ExplainLog)
├─ design.json        # structured intermediate models
├─ verification.md
├─ explain-log.json
└─ configs/<DEVICE>.ios
```
Filenames sanitized; manifest lists artifacts + byte sizes for the submission checklist.

## 10. Orchestrator + CLI (`src/orchestrator/`)
```
netarch run  --preset campus-lan [--out exports]
netarch run  --input custom.json [--out exports]
netarch validate --input custom.json
```
Stage timing recorded in RunReport.stages; first failure aborts with a readable diagnosis.
