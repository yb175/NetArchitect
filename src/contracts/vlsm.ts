/**
 * VLSM engine contracts (bitwise IPv4 subnet allocator).
 * OWNER: VLSM+VLAN specialist agent (implementation in src/vlsm/).
 */
import type { ExplainRecord } from "./explain.js";

export interface VlsmRequest {
  /** Query ví dụ: subnet name from the VLAN plan, or P2P link name. */
  name: string;
  /** Usable hosts required (engine adds +2 for network/broadcast itself). */
  hosts: number;
}

export interface VlsmRootBlock {
  baseNetwork: string; // "10.0.0.0/16"
  prefix: number; // e.g. 16
}

export interface SubnetPlanItem {
  name: string;
  index: number; // allocation order (largest first)
  network: string; // "10.0.4.0"
  prefix: number; // 23
  mask: string; // dotted-decimal
  /** Wildcard mask (inverse). Critical test target. */
  wildcard: string;
  broadcast: string;
  firstHost: string;
  lastHost: string;
  /** Total usable addresses including T negotiation for /31. */
  requestedHosts: number;
  capacity: number;
  utilization: number; // 0..1 (requested/capacity)
}

export interface VlsmPlan {
  root: VlsmRootBlock;
  subnets: SubnetPlanItem[]; // sorted descending by size (allocation order)
  /** Aggregate efficiency narrative: smallest-prefix-waste heuristic. */
  efficiency: number;
  explanations: ExplainRecord[];
}

/**
 * hostCount → smallest prefix with ≥ hosts usable addresses.
 * Special case: hosts === 2 → /31 (RFC 3021 point-to-point).
 */
export type HostsToPrefix = (hosts: number) => number | -1;
