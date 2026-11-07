# NetArchitect — High-Level Design (HLD)

## Mission
A modular monolithic TypeScript application that ingests preset or custom network parameters,
executes algorithmic rule engines (L1 media physics → topology → VLAN/IP → routing), and emits
structured recommendations, **natural-language engineering justifications for every decision**,
and deployment-ready Cisco IOS configurations.

## Composition flow (orchestrator-owned)
```
ValidatedRun (Zod)
   → MediaEngine        (L1 physics: Cat6a / OM4 / OS2 rules + violation errors)
   → TopologyEngine     (sites, tier, devices, links; consumes Media results)
   → VlanEngine         (802.1Q plan, trunk/native etiquette)
   → VlsmEngine         (bitwise descending-sort allocator, zero-overlap invariant)
   → RoutingEngine      (single-area OSPF / multi-area + eBGP / IPsec VPN / QoS)
   → ConfigGenerator    (IOS-XE: VLANs, SVIs, trunks, OSPF, BGP, IPsec, ACLs)
   → VerificationEngine (VLSM overlap, wildcard mask, media, routing invariants)
   → ExportManager      (exports/<scenario>/: *.ios, report.md, design.json, verification.md)
```
Every engine pushes `ExplainRecord`s into a shared `ExplainCollector`; the report renderer
serialises the whole rationale chain. Verification failure **blocks export** (fail-closed).

## Pipeline invariants
1. Interfaces between stages are the Zod/TS contracts in `src/contracts/` — nothing else.
2. Engine order is fixed; no engine may call another engine directly (orchestrator passes data).
3. Rejections (e.g. `PhysicalDistanceViolationError`) surface in `RunReport.rejections` with
   code + message, never silent drops.
4. `main` must `typecheck && test && run examples` at every integration point.

## Repository layout
```
NetArchitect/
├─ src/contracts/        # ARCHITECT-OWNED shared domain models (frozen interface)
├─ src/profiles/         # preset loading + custom input validation (Zod)
├─ src/media/            # L1 rule engine (distance→medium+transceiver)
├─ src/topology/         # sites/devices/links intermediate model
├─ src/vlan/             # 802.1Q + trunk plan
├─ src/vlsm/             # bitwise subnet allocator
├─ src/routing/          # OSPF/BGP/IPsec/QoS planner
├─ src/explain/          # ExplainCollector (shared log implementation)
├─ src/configgen/        # Cisco IOS renderer
├─ src/verify/           # boundary invariants + checks
├─ src/export/           # artifacts: configs, report.md, design.json
├─ src/orchestrator/     # pipeline + CLI (netarch run/load/validate)
├─ presets/              # campus-lan.json, metro-man.json, global-wan.json
├─ examples/             # runnable end-to-end scripts (one per scenario)
├─ tests/                # Vitest suites per module + integration
└─ docs/                 # DECISION, FLOW, HLD, LLD, DATA_CONTRACTS, ASSUMPTIONS, INTEGRATION_STATUS, ARCHITECTURE_DECISIONS
```

## Ownership matrix (strict trunk boundaries)
| Agent | Owns | Must not touch |
|---|---|---|
| Lead Architect (me) | src/contracts, src/orchestrator, docs, presets | — |
| Agent-A (Profiles)   | src/profiles | contracts, other modules |
| Agent-B (Media)      | src/media    | contracts, orchestrator |
| Agent-C (Topology)   | src/topology | contracts, orchestrator |
| Agent-D (VLAN+VLSM)  | src/vlan, src/vlsm | contracts, orchestrator |
| Agent-E (Routing)    | src/routing  | contracts, orchestrator |
| Agent-F (ConfigGen)  | src/configgen| contracts, orchestrator |
| Agent-G (Verify+Export) | src/verify, src/export, src/explain | contracts, orchestrator |

## Out of scope (deliberate)
Microservices, databases, message brokers, Kubernetes, auth — none are required and all add
failure modes a CLI doesn't need. Cisco IOS-XE only for release 1 (IOS-XR/Juniper out).
