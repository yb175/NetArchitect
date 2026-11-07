/**
 * Input-side domain models (NetworkRequirements) — Foundation/Profiles agent.
 * Deliberately SEPARATE from design results (design.model.ts): requirements
 * describe what the user asked for; nothing generated is stored here.
 *
 * Aliases re-export the frozen contract types. There is no independent
 * schema here, by design — see src/validation/ for the enforcement layer.
 */
import type {
  CampusLanInput,
  MetroManInput,
  GlobalWanInput,
  NetArchInput,
  BuildingSpec,
  MetroSiteSpec,
  WanCitySpec,
  VlanRequest,
  ValidatedRun,
} from "../../contracts/input.js";
import type { InputSourceKind } from "../../contracts/input.js";

export type {
  CampusLanInput,
  MetroManInput,
  GlobalWanInput,
  BuildingSpec,
  MetroSiteSpec,
  WanCitySpec,
  VlanRequest,
};

/** Public alias keeps the architect-approved name `InputSource`. */
export type InputSourceKindAlias = InputSourceKind;
export type InputSource = InputSourceKind;

/**
 * The complete set of user-supplied network parameters for one run — either
 * a preset load or custom JSON. Discriminated on `profile`.
 */
export type NetworkRequirements = NetArchInput;

/**
 * A validated requirements bundle: parsed input + provenance + boundary
 * advisories produced during ingestion (non-fatal observations).
 */
export type RequirementsEnvelope = ValidatedRun;

/** Profile metadata for CLI listing (`netarch profiles`). */
export interface ProfileDescriptor {
  kind: "campus-lan" | "metro-man" | "global-wan";
  label: string;
  presetFile: string;
  /** Deals-in text drawn from the assignment, never invented numbers. */
  focus: string;
}
