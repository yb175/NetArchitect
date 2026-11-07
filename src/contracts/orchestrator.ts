/**
 * Orchestrator contracts — the composition root that fans input through
 * the whole engine chain in dependency order and owns return paths.
 * OWNER: Lead Architect (implementation in src/orchestrator/).
 */
import type { ValidatedRun } from "./input.js";
import type { Topology } from "./topology.js";
import type { VlanPlan, VlanRequestItem } from "./vlan.js";
import type { VlsmPlan, VlsmRequest } from "./vlsm.js";
import type { RoutingPlan } from "./routing.js";
import type { ConfigBundleInput, DeviceConfig } from "./config.js";
import type { VerificationReport, VerificationInput } from "./verification.js";
import type { ExplainLog } from "./explain.js";
import type { ExportManifest } from "./export.js";

export interface PipelineStage {
  name: string;
  /** Wall-clock per stage for the run summary. */
  millis: number;
  ok: boolean;
}

export interface RunReport {
  scenario: string;
  input: ValidatedRun;
  topology?: Topology;
  vlanPlan?: VlanPlan;
  vlsm?: VlsmPlan;
  routing?: RoutingPlan;
  configInput?: ConfigBundleInput;
  configs?: DeviceConfig[];
  verification?: VerificationReport;
  explainLog: ExplainLog;
  stages: PipelineStage[];
  exports?: ExportManifest;
  /** Any engine rejection (PhysicalDistanceViolationError etc.) listed here. */
  rejections: Array<{ stage: string; code: string; message: string }>;
}

export interface RunOptions {
  /** Base directory for exports/ (default: ./exports). */
  outDir?: string;
  /** Stop without exporting (used by tests). */
  dryRun?: boolean;
}

export type RunNetArch = (input: ValidatedRun, opts?: RunOptions) => Promise<RunReport>;

/* Re-exports used by the orchestrator only. */
export type { VlanRequestItem, VlsmRequest, VerificationInput };
