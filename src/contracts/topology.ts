/**
 * Topology engine contracts — intermediate device/link model used by every
 * downstream engine (VLAN, VLSM, routing, config gen, verification).
 * OWNER: topology specialist agent (implementation in src/topology/).
 */
import type { ExplainRecord } from "./explain.js";
import type { TransceiverSpec, EthernetStandard } from "./media.js";
import type { BuildingSpec } from "./input.js";
import type { MetroSiteSpec } from "./input.js";
import type { WanCitySpec } from "./input.js";

export type DeviceRole =
  | "core-switch"
  | "distribution-switch"
  | "access-switch"
  | "edge-router"
  | "wan-router"
  | "cloud-vpn-gateway";

export interface Device {
  id: string;
  name: string;
  role: DeviceRole;
  siteId: string;
  /** Config generator assigns mgmt IP from the plan; stays optional here. */
  mgmtIp?: string;
  /** Switch chassis port count when relevant to media/port math. */
  portCount?: number;
  /** Access switch must supply PoE (wireless APs / scanners). */
  poe?: boolean;
}

export interface Link {
  id: string;
  /** Device ids; both must exist in the same Topology. */
  aDeviceId: string;
  bDeviceId: string;
  kind: "physical" | "evpl" | "ipsec-tunnel" | "bgp-session";
  /** Present when kind === "physical"; resolved by the media engine. */
  phys?: {
    runMeters: number;
    spec: TransceiverSpec;
    standard: EthernetStandard;
  };
  bandwidthMbps: number;
  latencyMs?: number;
  /** For MAN/WAN circuits: which site pair the circuit joins. */
  betweenSites?: [string, string];
}

export interface Site {
  id: string;
  label: string;
  kind: "building" | "man-site" | "city" | "cloud-vpc";
  deviceIds: string[];
}

export interface Topology {
  tier: "collapsed-core" | "three-tier";
  sites: Site[];
  devices: Device[];
  links: Link[];
  explanations: ExplainRecord[];
}

export type LinkRoleKey = `${string}:${string}`;
export type LinkRoleQuery = "access" | "building-backbone" | "man-evpl" | "wan";

export type ProfileShape =
  | { profile: "campus-lan"; buildings: BuildingSpec[] }
  | { profile: "metro-man"; sites: MetroSiteSpec[] }
  | { profile: "global-wan"; cities: WanCitySpec[] };

export interface TopologyRequest {
  profileShape: ProfileShape;
  /** Media engine results keyed by "<siteId>:<role>" link-role keys. */
  mediaByRole: Map<LinkRoleKey, ImportEnvelope>;
}

/** MediaRecommendation is imported structurally to avoid a cycle at runtime. */
export interface ImportEnvelope {
  chosen: TransceiverSpec;
  explanations: ExplainRecord[];
}
