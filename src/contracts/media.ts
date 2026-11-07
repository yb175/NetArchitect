/**
 * Physical media engine contracts (L1 decision engine).
 * OWNER: media specialist agent (implementation in src/media/).
 */
import { z } from "zod";
import type { ExplainRecord } from "./explain.js";

export const Medium = z.enum(["cat6a", "om4", "os2"]);
export type Medium = z.infer<typeof Medium>;

export const EthernetStandard = z.enum(["10GBASE-T", "10GBASE-SR", "10GBASE-LR", "10GBASE-ER"]);
export type EthernetStandard = z.infer<typeof EthernetStandard>;

export interface TransceiverSpec {
  medium: Medium;
  standard: EthernetStandard;
  wavelengthNm: number;
  /** Cable-plant reach limit in meters (normative, per IEEE 802.3 clauses). */
  maxReachMeters: number;
  /** Tx power minus worst-case Rx sensitivity → optical link budget (dB). */
  powerBudgetDb?: number;
}

/** Normative parameters the engine enforces (single source of physics). */
export interface MediaRuleTable {
  cat6a: TransceiverSpec; // 10GBASE-T, 100 m, 802.3an
  om4: TransceiverSpec; // 10GBASE-SR, 400 m, 850 nm, 802.3ae
  os2lr: TransceiverSpec; // 10GBASE-LR, 10 km, 1310 nm
  os2er: TransceiverSpec; // 10GBASE-ER, 40 km, 1550 nm
}

export type LinkRole = "access" | "building-backbone" | "man-evpl" | "wan";

export interface MediaQuery {
  /** Cable run length in meters. */
  runMeters: number;
  role: LinkRole;
  /** If the user constrains the medium; engine may still refuse and justify. */
  requestedMedium?: Medium;
}

export interface MediaRecommendation {
  chosen: TransceiverSpec;
  /** Structured rationale — also pushed to the global explain log. */
  explanations: ExplainRecord[];
}

export interface MediaEngine {
  recommend(query: MediaQuery): MediaRecommendation;
  /** Cases the engine recognises as physically invalid (copper > 100 m). */
  isViolation(query: MediaQuery): PhysicalDistanceVerdict;
}

export interface PhysicalDistanceVerdict {
  violation: boolean;
  detail: string;
}
