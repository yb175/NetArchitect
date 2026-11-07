/**
 * Design-result-side domain models — Foundation/Profiles agent.
 * Holds the generated design ONLY (never user requirements), so an
 * orchestrator can serialise a complete, self-contained design document.
 *
 * Aliases re-export frozen contract types so every downstream engine and
 * future prompt keeps a single, drift-free vocabulary.
 */
import type { Site, Device, DeviceRole, Link } from "../../contracts/topology.js";
import type { VlanItem, TrunkPlan, VlanPlan } from "../../contracts/vlan.js";
import type { SubnetPlanItem, VlsmRequest } from "../../contracts/vlsm.js";
import type { OspfAreaPlan, RoutingPlan } from "../../contracts/routing.js";
import type { ExplainRecord } from "../../contracts/explain.js";
import type { DeviceConfig } from "../../contracts/config.js";
import type { VerificationReport } from "../../contracts/verification.js";
import type { InputSourceKind } from "../../contracts/input.js";
import type { LinkKind, ProfileKind, AddressFamily } from "../enums/index.js";

type InputSource = InputSourceKind;

/* ------------------------------------------------------------------ */
/* Aliases over frozen contracts (names from the approved domain list) */
/* ------------------------------------------------------------------ */

export type { Site, Device, DeviceRole, RoutingPlan, TrunkPlan, VlanPlan };

/** A logical layer-2 broadcast zone and its mapped subnet (contract `VlanItem`). */
export type VLAN = VlanItem;

/** A modeled cable/circuit between two devices (contract `Link`). */
export type NetworkLink = Link;

/** A host-count requirement fed to the VLSM allocator (contract `VlsmRequest`). */
export type SubnetRequest = VlsmRequest;

/** A carved subnet from the VLSM plan (contract `SubnetPlanItem`). */
export type SubnetAllocation = SubnetPlanItem;

/** A single OSPF area design (contract `OspfAreaPlan`). */
export type RoutingDomain = OspfAreaPlan;

/** One explainable architectural decision (contract `ExplainRecord`). */
export type NetworkDecision = ExplainRecord;

/** Copy-paste-ready IOS output for one device (contract `DeviceConfig`). */
export type DeviceConfiguration = DeviceConfig;

/* ------------------------------------------------------------------ */
/* Agent-owned models (no contract change required)                    */
/* ------------------------------------------------------------------ */

/** One port/interface of a configured device, enough for IOS rendering. */
export interface DeviceInterface {
  deviceId: string;
  /** Cisco port name, e.g. "GigabitEthernet1/0/1", "Tunnel10", "Vlan20". */
  name: string;
  kind: "rj45" | "sfp" | "sfp-plus" | "svi" | "tunnel" | "loopback";
  speedMbps?: 100 | 1000 | 10000 | 40000;
  poe?: boolean;
  /** Trunk mode: allowed VLANs (when modelling trunks). */
  trunkAllowedVlanIds?: number[];
  /** Access/native VLAN when modelling a switchport access link. */
  accessVlanId?: number;
  /** L3 address in CIDR form when modelled as a routed interface / SVI. */
  ipCidr?: string | null;
  description?: string;
}

/** Device specialization for the design document: adds modeled interfaces. */
export interface ConfiguredDevice extends Device {
  interfaces: DeviceInterface[];
}

/** Link refinement used by design realisation (configgen-compatible). */
export interface RealizedLink extends Link {
  kind: LinkKind;
  /** Point-of-presence-level metric trail for verification audits. */
  computedLatencyMs?: number;
}

/**
 * The complete generated design for one scenario run — output side only.
 * Optional stages stay null until their engine completes (orchestrator
 * fills them stage-by-stage; verification gates the export).
 */
export interface NetworkDesign {
  profile: ProfileKind;
  /** Traceability to how the run was launched (never the requirements themselves). */
  requirementSource: InputSource;
  generatedAtIso: string;
  addressFamily: AddressFamily;
  sites: Site[];
  devices: ConfiguredDevice[];
  links: RealizedLink[];
  vlans: VLAN[];
  trunks: TrunkPlan[];
  subnets: SubnetAllocation[];
  routing: RoutingPlan | null;
  decisions: NetworkDecision[];
  configs: DeviceConfiguration[];
  verification: VerificationReport | null;
}

/** Deterministic empty design scaffold (orchestrator starts from this). */
export function createEmptyDesign(profile: ProfileKind, requirementSource: InputSource): NetworkDesign {
  return {
    profile,
    requirementSource,
    generatedAtIso: new Date().toISOString(),
    addressFamily: "ipv4",
    sites: [],
    devices: [],
    links: [],
    vlans: [],
    trunks: [],
    subnets: [],
    routing: null,
    decisions: [],
    configs: [],
    verification: null,
  };
}
