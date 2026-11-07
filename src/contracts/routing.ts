/**
 * Routing engine contracts (OSPF area design, BGP, IPsec VPN, QoS markers).
 * OWNER: routing specialist agent (implementation in src/routing/).
 */
import type { ExplainRecord } from "./explain.js";
import type { Site, Device } from "./topology.js";
import type { SubnetPlanItem } from "./vlsm.js";

export interface OspfAreaPlan {
  /** 0 = backbone. Areas 1..n for remote sites / non-backbone cities. */
  areaId: number;
  label: string;
  siteIds: string[];
  /** Networks (in wildcard form) to advertise under `network x y area n`. */
  networks: Array<{ cidr: string; wildcard: string }>;
  /** ABRs summarizing into/out of this area. */
  summaryRoutes?: Array<{ abrDeviceId: string; summaryCidr: string }>;
}

export interface BgpSession {
  localDeviceId: string;
  neighborIp: string;
  remoteAsNumber: number;
  /** Advertised aggregates (e.g. summarized IoT supernet toward cloud). */
  advertiseCidrs: string[];
}

export interface VpnTunnel {
  deviceId: string;
  peerPublicIp: string;
  ikeVersion: 2;
  cryptoProfileName: string;
  /** Protected subnets (crypto ACL). */
  localProtectedCidr: string;
  remoteProtectedCidr: string;
}

export interface QosPolicyClass {
  className: string; // e.g. "VOICE-EF"
  dscp: string; // e.g. "ef", "af31"
  /** Shaping/priority bandwidth % of the EVPL handoff. */
  bandwidthPct: number;
}

export interface RoutingPlan {
  asNumber: number;
  protocol:
    | "single-area-ospf" // 1 AS, < 50 subnets
    | "multi-area-ospf" // multi-site / WAN isolation
    | "ospf-ebgp"; // multi-domain (cloud VPC)
  areas: OspfAreaPlan[];
  bgp: BgpSession[];
  vpnTunnels: VpnTunnel[];
  qos?: QosPolicyClass[];
  explanations: ExplainRecord[];
}

export interface RoutingEngineInput {
  sites: Site[];
  devices: Device[];
  subnets: SubnetPlanItem[];
  /** Profile-level flags that steer the protocol chooser. */
  profile: "campus-lan" | "metro-man" | "global-wan";
  asNumber: number;
}
