/**
 * Verification engine contracts — programmatic boundary checks that must
 * pass before the export manager is allowed to emit artifacts.
 * OWNER: verification specialist agent (implementation in src/verify/).
 */
import type { Link } from "./topology.js";
import type { SubnetPlanItem } from "./vlsm.js";
import type { RoutingPlan } from "./routing.js";

export type CheckCategory =
  | "vlsm"
  | "media"
  | "routing"
  | "vlan"
  | "config"
  | "latency";

export interface VerificationCheck {
  id: string;
  name: string;
  category: CheckCategory;
  passed: boolean;
  detail: string;
}

export interface VerificationReport {
  passed: boolean;
  checks: VerificationCheck[];
  /** Non-blocking advisories from boundary-leaning values (e.g. 99m cat6a). */
  advisories: string[];
}

export interface VerificationInput {
  subject: string; // scenario name
  subnets: SubnetPlanItem[];
  vlanIds: number[];
  devices: Array<{ id: string; name: string; role: string }>;
  links: Link[];
  routing: RoutingPlan;
}
