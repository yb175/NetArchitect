# NetArchitect — Integration Status

Updated at every integration. `main` is always required to typecheck + test + run examples.

## Current state: FOUNDATION & PROFILES PHASE LANDED (contract amendments A+1/A+2)
- [x] Repository scaffold (package.json, tsconfig, vitest, gitignore)
- [x] Shared contracts authored and typechecking (`src/contracts/*`) — v1.1
- [x] Three preset fixtures authored (`presets/*.json`) — global-wan cloud canonicalized
- [x] Domain models + enums as typed aliases (`src/domain/{models,enums}`)
- [x] Profiles: loader (preset + custom), catalog, documented defaults (`src/profiles`)
- [x] Validation: Zod shapes + semantic checks + link-endpoint checks (`src/validation`)
- [x] 41 tests passing; `example:profiles` runnable
- [x] HLD, LLD, DATA_CONTRACTS, ASSUMPTIONS, DECISION, FLOW, INTEGRATION_STATUS, ARCHITECTURE_DECISIONS
- [ ] Specialist wave-1 module implementations (media / topology / vlan+vlsm / routing)
- [ ] Config generation + exports
- [ ] Verification engine + failure-path tests
- [ ] GNS3/Packet Tracer evidence for 3 scenarios
- [ ] ai_audit_log.md (≥2 real AI-found flaws + remediation)

## Module status board
| Module | Owner | Status | Tests | Example |
|---|---|---|---|---|
| contracts | Lead Architect | done (v1.1 — amendments A+1 type exports, A+2 cloudVpc.iotNodes) | — | — |
| profiles | Foundation/Profiles agent | **done** — loader + defaults + catalog | 41 tests passing (`tests/profiles.test.ts`, `tests/validation.test.ts`) | `examples/run-profiles-demo.ts` |
| domain models | Foundation/Profiles agent | done — typed aliases + DeviceInterface/NetworkDesign | alias honesty tests | same example |
| media | Agent-B | pending | | |
| topology | Agent-C | pending | | |
| vlan | Agent-D | pending | | |
| vlsm | Agent-D | pending | | |
| routing | Agent-E | pending | | |
| explain | Agent-G | pending | | |
| configgen | Agent-F | pending | | |
| verify | Agent-G | pending | | |
| export | Agent-G | pending | | |
| orchestrator | Lead Architect | pending | | |

## Integration gates (every PR must pass)
1. `npm run typecheck` clean
2. `npm test` — no existing test broken, new module tests included
3. One runnable example under `examples/`
4. No edits outside the agent's owned directories (enforced by review)
5. No stub/placeholder bodies accepted as "done"

## Known interface risks to resolve before merge
| Risk | Mitigation |
|---|---|
| Topology types vs media output shape drift | contracts emit `ImportEnvelope` structurally identical to MediaRecommendation |
| Wildcard-mask recomputation divergence | verify agent recomputes independently; disagreement = test failure, not silent pass |
| PT/GNS3 command coverage | configgen emits only commands verified parseable; exotic IOS guarded behind flags |
