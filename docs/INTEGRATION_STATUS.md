# NetArchitect — Integration Status

Updated at every integration. `main` is always required to typecheck + test + run examples.

## Current state: SCAFFOLDED (contracts phase)
- [x] Repository scaffold (package.json, tsconfig, vitest, gitignore)
- [x] Shared contracts authored and typechecking (`src/contracts/*`)
- [x] Three preset fixtures authored (`presets/*.json`)
- [x] HLD, LLD, DATA_CONTRACTS, ASSUMPTIONS, this file, ARCHITECTURE_DECISIONS
- [ ] Specialist module implementations (pending agent assignment)
- [ ] Config generation + exports
- [ ] Verification engine + failure-path tests
- [ ] GNS3/Packet Tracer evidence for 3 scenarios
- [ ] ai_audit_log.md (≥2 real AI-found flaws + remediation)

## Module status board
| Module | Owner | Status | Tests | Example |
|---|---|---|---|---|
| contracts | Lead Architect | done (v1.0, frozen) | — | — |
| profiles | Agent-A | pending | | |
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
