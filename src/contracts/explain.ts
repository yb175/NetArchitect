/**
 * Explainability contracts. Every engine emits ExplainRecord entries so the
 * final report contains natural-language engineering justifications for
 * EVERY media type, transceiver, routing protocol, and topology tier
 * decision (assignment rubric: 25 pts).
 * OWNER: Lead Architect; the collector lives in src/explain/.
 */

export type ExplainModule =
  | "media"
  | "topology"
  | "vlan"
  | "vlsm"
  | "routing"
  | "qos"
  | "security"
  | "verification";

export interface ExplainRecord {
  /** Stable id, e.g. "MEDIA.OM4-400M-BACKBONE". */
  id: string;
  module: ExplainModule;
  /** Rule tag that fired, e.g. "MEDIA.02" or "VLMS.DESCENDING-SORT". */
  rule: string;
  /** What was chosen, e.g. "OM4 multimode fiber on the building-A backbone". */
  decision: string;
  /** Why, in engineer-readable language, referencing the governing boundary. */
  rationale: string;
  /** Raw facts that fed the decision (numbers in, in the engine's units). */
  inputs: Record<string, unknown>;
  /** Normative references: "IEEE 802.3an", "RFC 2328", "RFC 4364". */
  references: string[];
}

export interface ExplainLog {
  records: ExplainRecord[];
}

export interface ExplainCollector {
  readonly log: ExplainLog;
  push(record: ExplainRecord): void;
  /** Merge another engine's log (used by the orchestrator). */
  merge(other: ExplainLog): void;
  /** Render the full rationale section of the design report. */
  renderMarkdown(): string;
}
