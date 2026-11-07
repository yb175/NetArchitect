# DECISION.md — Meaningful Decisions & Why They Were Taken

A plain-language decision log. For formal ADR-style entries see `ARCHITECTURE_DECISIONS.md`.

| # | Decision | Why it was taken |
|---|----------|------------------|
| 1 | **TypeScript + Node.js, modular monolith** | All engines are pure functions producing files — no network services needed. A monolith removes serialisation/versioning problems entirely; ten stages in one process is simpler and testable. |
| 2 | **Contract-first development** | Four agents building engines in isolation would collide at merge time. Freezing typed contracts first means each agent codes against the same fixed interfaces and integration is mechanical. |
| 3 | **CLI as the initial interface** | The rubric needs "npm test"-style automation and repeatable runs; a CLI is deterministic and trivially CI-able. A web dashboard adds UI maintenance without scoring points. |
| 4 | **JSON input + Zod validation at one boundary** | JSON is human-writable for custom requirements; Zod gives us precise error messages for the "gracefully handles boundary inputs" rubric item. Validated once, everything downstream is typed — no re-validation anywhere. |
| 5 | **Zod for validation** | Assignment-agnostic choice: zero-dependency, tree-shakeable, best TS inference. |
| 6 | **Vitest for automated testing** | Same runner for unit + integration tests, native ESM, fast watch mode — matches the TS/Node stack without extra tooling. |
| 7 | **Structured intermediate network/device models between every stage** | Prevents "stringly-typed" piping. `Topology → VlanPlan → VlsmPlan → RoutingPlan` carry meaning, not text dumps, which is what lets verification recheck invariants independently. |
| 8 | **Cisco IOS as the initial target** | Explicitly the assignment's evaluation target (config files loaded into Packet Tracer/GNS3). Supporting other platforms adds abstraction tax with zero grading value. |
| 9 | **Filesystem as artifact store** | Deliverables ARE files (`.ios` configs, `report.md`, `design.json`). A database or object store would complicate the submission pipeline. |
| 10 | **Media rule table owned by one module** | 100 m / 400 m / 10 km / 40 km limits exist exactly once. If explainability and configgen each restated the numbers, they could drift and contradict each other — the #1 cause of AI-native drift bugs in this class of tool. |
| 11 | **`PhysicalDistanceViolationError` on copper > 100 m** | The assignment names this error explicitly; it is a *raise, not a fallback*. Fallbacks would silently mask bad user input and lose the rubric's requested error behavior. |
| 12 | **VLSM: descending-size sort + monotone carving** | Matches the assignment's stated algorithm exactly; monotone carving makes overlap *structurally impossible* (a second occurrence is treated as an allocator defect, not a user error). |
| 13 | **/31 allowed for point-to-point links (RFC 3021), /32 reserved for loopbacks** | Standard practice for router-router links; also a good edge-case test target for wildcard masks. |
| 14 | **Single-area OSPF for campus; multi-area OSPF + eBGP for WAN** | Assignment table: 1 AS & <50 subnets → Area 0; multi-site/cloud → domain isolation. The routing engine derives the choice from input, it isn't hard-coded per scenario. |
| 15 | **Explainability as first-class data, not print lines** | Every engine returns `ExplainRecord`s (rule, rationale, inputs, references). One record set renders both the human narrative and the machine-checkable log — the "natural-language justification" rubric item (25 pts) is then covered for *every* decision, not a handful. |
| 16 | **Fail-closed verification gate before export** | Publishing a config with an overlap or an illegal copper run would lose more rubric points than a late export failure. So if any check fails, the exporter refuses to run. |
| 17 | **Strict agent ownership boundaries (no shared directories)** | Prevents merge conflicts between specialist agents; every PR also declares exactly which directories it touched and the reviewer can verify the claim instantly. |
| 18 | **GNS3/Packet Tracer compatibility mode in the config generator** | Needed to satisfy the "verification exports" deliverable. We emit only commands verified parseable by the simulators and gate exotic IOS-XE syntax behind a flag. |
| 19 | **Assumptions recorded in `ASSUMPTIONS.md`** | Every judgement call (AP density, provider latency split, IPsec overhead) is written down and made testable, so boundary disputes can be resolved by evidence rather than argument. |
| 20 | **No microservices / databases / message brokers, whatever the future holds** | Optional future work (a web GUI, a diff engine) can all be built on the same orchestrator function; nothing here forces infrastructure changes later. |

*Spelling note: filed as `DECISION.md`; the requested filename `desicion.md` would have been a typo.*

## Added during the Foundation & Profiles phase

| # | Decision | Why it was taken |
|---|----------|------------------|
| 21 | **`cloudVpc` block is the sole canonical cloud definition; `cloud-vpc` city role rejected by validation** | Kills the earlier contract wrinkle where cloud could be defined twice and drift apart. Validation error code `CLOUD_ROLE_IN_CITIES` makes the rule observable; the WAN preset now carries 4 cities + a separate canonical VPC block (with `iotNodes`). |
| 22 | **Domain models are typed aliases over frozen contracts (`src/domain/`)** | The assigned model list (NetworkRequirements, NetworkDesign, …) maps 1:1 to approved contract types instead of duplicating them — zero drift possible; `docs/DATA_CONTRACTS.md` carries the mapping table. |
| 23 | **Nominal-count and exact-boundary values become advisories, not errors** | Keeps validation useful for custom scenarios while preserving the assignment's boundary semantics (inclusive limits) — advisories flow into the explain log so reviewers see them. |
| 24 | **Capacity-conflict pre-check in validation** | A VLAN demand exceeding the root block is a user-facing arithmetic mismatch (capacity check only — no subnet carving happens in the profile manager). It fails fast with a message naming what the VLSM engine would later raise. |
