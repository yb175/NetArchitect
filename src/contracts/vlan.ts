/**
 * VLAN engine contracts (802.1Q tagging, trunking, SVI planning).
 * OWNER: VLSM+VLAN specialist agent (implementation in src/vlan/).
 */
import type { ExplainRecord } from "./explain.js";

export interface VlanItem {
  vlanId: number; // 1..4094, unique
  name: string;
  purpose: "management" | "staff" | "students" | "wireless" | "servers" | "iot" | "voice" | "guests";
  /** Matches a SubnetPlanItem.name from the VLSM engine. */
  subnetName: string;
}

export interface TrunkPlan {
  /** Links that must carry 802.1Q and their allowed VLANs. */
  linkId: string;
  allowedVlanIds: number[];
  /** Unused/untagged native VLAN (never 1, per hardening guidance). */
  nativeVlanId: number;
}

export interface VlanPlan {
  items: VlanItem[];
  trunks: TrunkPlan[];
  /** SVIs requested per layer-3 device (routers/L3 switches). */
  svis: Array<{ deviceId: string; vlanId: number; ipCidr: string }>;
  explanations: ExplainRecord[];
}

export interface VlanRequestItem {
  name: string;
  purpose: "management" | "staff" | "students" | "wireless" | "servers" | "iot" | "voice" | "guests";
  hosts: number;
}

export interface VlanEngineInput {
  requests: VlanRequestItem[];
  siteIds: string[];
}
