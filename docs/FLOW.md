# FLOW.md — How the Modules Are Interlinked

## Full pipeline

```
            ┌─────────────────────────────┐
 caller ───▶ ExplainCollector (created first, threads through every stage)
            └─────────────────────────────┘

  presets/*.json  or  custom.json
        │
        ▼
┌──────────────────┐
│ 1. PROFILES      │  Zod validation → ValidatedRun (input + advisories)
└────────┬─────────┘
         ▼
┌──────────────────┐    queries: run length, role per link
│ 2. MEDIA ENGINE  │◀─── rule table (Cat6a/OM4/OS2, reach limits)
└────────┬─────────┘    raises PhysicalDistanceViolationError / ReachabilityError
         │  MediaRecommendation per link role
         ▼
┌──────────────────┐
│ 3. TOPOLOGY      │  sites, tier, devices (roles), links
└────────┬─────────┘    consumes Media by "<site>:<role>" key
         │  Topology
         ▼
┌──────────────────┐
│ 4. VLAN ENGINE   │  802.1Q ids, trunks, native VLAN policy
└────────┬─────────┘
         │  VlanRequest[] (drives subnet sizing)
         ▼
┌──────────────────┐
│ 5. VLSM ENGINE   │  bitrate allocator: sort desc → carve → zero-overlap invariant
└────────┬─────────┘    raises AddressSpaceExhaustedError
         │  VlsmPlan (subnets, masks, wildcards, broadcast, gateways)
         ▼
┌──────────────────┐
│ 6. ROUTING       │  protocol chooser (AS count + subnet count + domain count)
└────────┬─────────┘    single-area OSPF │ multi-area + eBGP │ IPsec + QoS
         │  RoutingPlan (areas, summaries, bgp sessions, tunnels)
         ▼
┌──────────────────┐
│ 7. CONFIG GEN    │  iOS lines per device (VLAN db, trunks, SVIs, OSPF/BGP/IPsec)
└────────┬─────────┘
         │  DeviceConfig[]
         ▼
┌──────────────────┐
│ 8. VERIFICATION  │  V-01..V-08 checks (overlap, capacity, wildcard recompute, media feasibility, latency)
└────────┬─────────┘    fail-closed gate
         │  VerificationReport (passed=true required)
         ▼
┌──────────────────┐
│ 9. EXPORT        │  exports/<scenario>/: report.md, design.json,
└────────┬─────────┘                     verification.md, explain-log.json, configs/*.ios
         │  ExportManifest
         ▼
┌──────────────────┐
│ 10. ORCHESTRATOR │  wires 1→9, records timing in RunReport,
└────────┬─────────┘  surfaces Rejections, gates output
         └──▶ CLI / Integration tests
```

## Data hand-offs (what actually travels between engines)

| From → To | Payload | Contract type |
|---|---|---|
| Profiles → all | validated input | `ValidatedRun` |
| Media → Topology | per-role transceiver choice | `MediaRecommendation` |
| Topology → VLAN/Routing/ConfigGen/Verify | devices, links, sites | `Topology` |
| VLAN → VLSM/ConfigGen | numbered VLANs + trunk list | `VlanPlan` |
| VLAN → VLSM | host counts per VLAN | `VlanRequest[]` |
| VLSM → Routing/ConfigGen/Verify/Export | subnets + wildcards + broadcast + gateways | `VlsmPlan` |
| Routing → ConfigGen/Verify | areas, sessions, tunnels, QoS | `RoutingPlan` |
| ConfigGen → Verify/Export | per-device IOS lines | `DeviceConfig[]` |
| Verify → Export (gate) | check results | `VerificationReport` |
| Every engine → ExplainCollector | rationale records | `ExplainRecord[]` |
| Orchestrator → caller | full run summary | `RunReport` |

## Why wiring is built this way

- **One-directional flow, no engine-to-engine calls.** The orchestrator is the only module
  that decides execution order, so adding a stage (e.g. a QoS engine) means exactly one edit.
- **ExplainCollector is created first** and handed to every engine — rationale can be recorded
  from the very first Zod advisory all the way to the final export line, giving one
  end-to-end "why" narrative per scenario.
- **Verification consumes the same types it gatekeeps** — it recomputes masks/overlap
  independently instead of trusting upstream math, so it is a real check, not a rubber stamp.
- **Failure paths short-circuit, but surface in `RunReport.rejections`** — an illegal copper
  run never produces a config file, yet it is still reported for the user.
