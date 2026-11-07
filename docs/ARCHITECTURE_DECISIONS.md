# NetArchitect — Architecture Decisions (ADR-style log)

## ADR-001 — Modular monolith, TypeScript + Node
**Status:** accepted.
A CLI pipeline with 10 processing stages fits a single Node process perfectly. Network effects
are nil; requirements demand artifacts on disk, not services. Microservices would add
serialisation/versioning failure modes without a single benefit.

## ADR-002 — Contract-first development
**Status:** accepted.
Every module is implemented against `src/contracts/` before any two agents meet in a merge.
Rationale: rules engines are pure functions — the type signatures *are* most of the design, so
nailing them first eliminates interface conflicts at integration, where multi-agent work
usually blows up.

## ADR-003 — Zod at one boundary only
**Status:** accepted.
Input ingestion validates via Zod at the ingest boundary; downstream modules consume typed
intermediates (TS structural types), not re-validated data — keeping the pipeline lean and
error surfacing explainable in one place.

## ADR-004 — Fail-closed verification gate
**Status:** accepted.
If any verification check fails, the export manager refuses to emit artifacts. rationale: the
rubric rewards *flawless* bitwise allocation; publishing a config with an overlap would
destroy more points than a late failure.

## ADR-005 — Explainability as a first-class data structure
**Status:** accepted.
Rather than scattering `console.log`, every engine returns `ExplainRecord`s keyed by rule id
with inputs, references and rationale. The exporter renders them into report.md AND
explain-log.json — the same record set backs both the human narrative and the machine-checkable
audit trail.

## ADR-006 — Media rule table as the single physics source
**Status:** accepted.
Reach limits (100/400/10000/40000 m) exist in exactly one module. Other modules import the
table rather than restating numbers, so no rule duplication can drift (a classic source of
"config generator disagrees with explainability engine" bugs).

## ADR-007 — Campus addressing is campus-wide VLAN-subnet based
**Status:** accepted.
Rejected alternative: per-building /24 blocks with L3 boundaries at each IDF (cleaner failure
domains but violates the assignment's explicit focus on 802.1Q trunking + single-area OSPF and
complicates the VLSM demo). Documented as a trade-off in ASSUMPTIONS.md #4.

## ADR-008 — Packet Tracer compatibility mode
**Status:** proposed.
Config generator offers a flag that disables IOS-XE-only commands so the three preset configs
can be loaded into GNS3/OR Packet Tracer for the verification evidence deliverable. Acceptance
criteria require evidence, so this mode ships in release 1.
