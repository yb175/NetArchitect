# NetArchitect — Data Contracts

**The code is the contract.** This file indexes it; `src/contracts/index.ts` is the load-bearing
source of truth. Any mismatch between docs and code is resolved in favour of a contract change
request to the Lead Architect, followed by a documentation update.

## Input domain (`src/contracts/input.ts`)
| Type | Purpose |
|---|---|
| `CampusLanInput` | 3 buildings, VLANS, root block, collapsed core, single-area OSPF |
| `MetroManInput` | HQ + remotes, EVPL bandwidth, 5 ms target, QoS classes, dual-homing |
| `GlobalWanInput` | 4+ cities + AWS VPC spec (CIDR, peers), IKEv2, multi-area, summarization |
| `NetArchInput` | discriminated union — the single ingest point |
| `VlanRequest` | name / purpose / hosts shared by all profiles |

## Intermediate models
| Type | File | Producer → Consumers |
|---|---|---|
| `MediaRecommendation`, `TransceiverSpec`, `MediaQuery` | media.ts | media → topology, configgen |
| `Topology`, `Device`, `Link`, `Site` | topology.ts | topology → vlan, routing, configgen, verify |
| `VlanPlan`, `VlanItem`, `TrunkPlan` | vlan.ts | vlan → configgen, verify |
| `VlsmPlan`, `SubnetPlanItem` | vlsm.ts | vlsm → routing, configgen, verify, export |
| `RoutingPlan`, `OspfAreaPlan`, `BgpSession`, `VpnTunnel`, `QosPolicyClass` | routing.ts | routing → configgen, verify |
| `ConfigBundleInput`, `DeviceConfig` | config.ts | configgen → export, orchestrator |
| `VerificationReport`, `VerificationCheck` | verification.ts | verify → export (gate) |
| `ExplainRecord`, `ExplainLog`, `ExplainCollector` | explain.ts | every engine → export |
| `RunReport`, `RunOptions` | orchestrator.ts | orchestrator → CLI, tests |

## Error taxonomy (`src/contracts/errors.ts`)
- `PhysicalDistanceViolationError` — mandated name from the assignment
- `AddressSpaceExhaustedError`
- `SubnetOverlapError` (allocator invariant)
- `ReachabilityError` (optical reach)
- `ValidationError` (Zod aggregation)

## Change policy
1. Agent requests change with its proposed signature diff.
2. Architect evaluates blast radius across the ownership matrix.
3. Contract updated in one commit; dependent agents notified with the diff.
4. Fixtures (`presets/`) and contract tests updated in the same commit.
