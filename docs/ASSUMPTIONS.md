# NetArchitect — Assumptions
Recorded so reviewers can see every judgement call the design makes. Each assumption is
testable or was checked against a primary reference.

1. **Media rule table** is taken directly from the assignment: 100 m Cat6a / 400 m OM4
   (10GBASE-SR) / 10 km OS2-LR / 40 km OS2-ER. We treat these as normative reach limits, not
   marketing maxima, and enforce exact-boundary inclusivity at ≤100, ≤400, ≤10 km, ≤40 km.
2. **Metro EVPL latency**: provider skew is not knowable a priori; we model 5 ms as the
   *provider transport budget* and compute the design's contribution (hop count × per-hop
   switching latency ≈ 50 µs/10GE port + propagation 5 µs/km) and document the split.
3. **1,600 campus endpoints** are treated as active drops maxed across buildings (620/580/400);
   AP count is derived at ~1 AP : 24 endpoints — access-port sizing uses 1.2× headroom.
4. **Campus VLAN subnets are logical, not per-building**: the VLSM plan covers campus-wide
   VLANs; per-building addressing scoping would fragment subnets and is explicitly rejected in
   ARCHITECTURE_DECISIONS.
5. **WAN transport** for cities is IPsec-over-public-Internet with leased DC only where the
   preset says so; IPsec overhead (≈73 bytes/tunnel) is documented but not subtracted from
   throughput math for v1 (limitation recorded in verification evidence).
6. **Cisco IOS-XE syntax** is generated for release 1; Packet Tracer compatibility mode is a
   checkbox in the config generator (avoids commands PT doesn't parse).
7. **/31 for point-to-point** links per RFC 3021; /32 is accepted only for loopbacks.
8. **Verification can only prove invariants** (math, overlap, masks). It cannot prove
   real-world deployability; GNS3/Packet Tracer evidence is produced separately per scenario
   and stored under `exports/<scenario>/` with limitations noted.
9. **Dual-homed EVPL** assumes static route_failover timing to the second PE handoff; BGP is
   out of scope for metro per assignment wording.
10. **OSPF areas for WAN**: backbone city = area 0, branch cities in area 1..n, cloud VPC
    reachable only through BGP+IPsec — never advertised into OSPF wholesale.

## Agent-added assumptions (Foundation & Profiles phase)

11. **Configurable defaults where the assignment is silent** (`src/profiles/defaults.ts` —
    surfaced in every report, never silently baked into engine math):
    | Default | Value | Why |
    |---|---|---|
    | endpoints per AP | 24 | standard wireless density for classroom/office campus |
    | access-port headroom | 20 % | growth room without oversized chassis |
    | backbone headroom | 20 % | corridor adjustment for riser distance |
    | native VLAN | 99, unused | 802.1Q hardening practice |
    | campus backbone handoff | 10 Gbps | matches the Cat6a/OM4 rule table's 10G class |
    | metro EVPL default | 200 Mbps, 1000 Mbps handoff | preset value; physical handoff one class above |
    | WAN private AS | 65001 | RFC 6996 private AS space |
12. **Cloud-VPC canonicalization (ADR-009)**: the `cloudVpc` block is the single cloud
    definition; a `cloud-vpc` role inside `cities` is a validation error
    (`CLOUD_ROLE_IN_CITIES`). The preset was corrected accordingly (4 cities + separate
    `cloudVpc` with `iotNodes`).
13. **Nominal-count drift is advisory, never an error**: 1,600 campus endpoints, 450 metro
    users, 2,000 WAN nodes are the assignment's nominals; custom runs that deviate get a
    documented advisory instead of a rejection.
14. **Exact-boundary values produce advisories** (100 m, 400 m, 15/35 km, 5 ms): validation
    accepts them and the engines decide inclusively; users see the boundary in the report.
