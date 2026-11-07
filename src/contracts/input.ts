/**
 * Input ingestion contracts — Zod schemas for the 3 preset profiles and
 * custom inputs. Custom input uses the SAME schemas as presets: users
 * fill the relevant profile shape with their own values.
 * OWNER: Lead Architect.
 */
import { z } from "zod";

/* ------------------------------------------------------------------ */
/* Campus LAN profile                                                  */
/* ------------------------------------------------------------------ */

export const VlanPurpose = z.enum([
  "management",
  "staff",
  "students",
  "wireless",
  "servers",
  "iot",
  "voice",
  "guests",
]);
export type VlanPurpose = z.infer<typeof VlanPurpose>;

export const VlanRequest = z.object({
  name: z.string().min(1).max(32),
  purpose: VlanPurpose,
  /** Hosts that must fit in this VLAN's subnet campus-wide. */
  hosts: z.number().int().min(1).max(20_000),
});
export type VlanRequest = z.infer<typeof VlanRequest>;

export const BuildingSpec = z.object({
  id: z.string().min(1).max(8),
  name: z.string().min(1),
  /** MDF↔IDF / IDF↔floor-switch vertical budget; must be ≤ 400 m total reach. */
  backboneRunMeters: z.number().min(1).max(400),
  floors: z.number().int().min(1).max(8).default(1),
  /** Access-level horizontal runs (workstation/AP drops). Typically ≤ 100 m. */
  accessRunMeters: z.number().min(1).max(100).default(90),
  endpoints: z.number().int().min(1).max(5_000),
});
export type BuildingSpec = z.infer<typeof BuildingSpec>;

export const CampusLanInput = z.object({
  profile: z.literal("campus-lan"),
  buildings: z.array(BuildingSpec).length(3),
  vlanRequests: z.array(VlanRequest).min(1).max(12),
  /** Root IPv4 block the VLSM allocator carves campus VLAN subnets from. */
  rootBlockCidr: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/),
  /** RSTP+802.1Q trunking between tiers; collapsed core assumed. */
  collapsedCore: z.boolean().default(true),
  ospfSingleArea: z.boolean().default(true),
});
export type CampusLanInput = z.infer<typeof CampusLanInput>;

/* ------------------------------------------------------------------ */
/* Metro MAN profile                                                   */
/* ------------------------------------------------------------------ */

export const MetroSiteSpec = z.object({
  id: z.string().min(1).max(8),
  name: z.string().min(1),
  role: z.enum(["hq", "remote"]),
  /** Provider handoff distance; 15–35 km implies OS2 + 10GBASE-ER class optics. */
  distanceKm: z.number().min(15).max(35),
  users: z.number().int().min(10).max(1_000),
});
export type MetroSiteSpec = z.infer<typeof MetroSiteSpec>;

export const QosClass = z.enum(["ef-voice", "af31-transactional", "af21-video", "best-effort"]);

export const MetroManInput = z.object({
  profile: z.literal("metro-man"),
  sites: z.array(MetroSiteSpec).min(3).max(6),
  evplBandwidthMbps: z.number().int().min(50).max(10_000),
  /** Hard SLA; the design must show end-to-end latency under this bound. */
  latencyTargetMs: z.number().min(1).max(10).default(5),
  qosClasses: z.array(QosClass).min(2).default(["ef-voice", "af31-transactional", "best-effort"]),
  /** Dual-homed EVPL to two PE handoffs per site (resiliency requirement). */
  dualHomedFailover: z.boolean().default(true),
  rootBlockCidr: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/),
  vlanRequests: z.array(VlanRequest).min(1).max(12),
});
export type MetroManInput = z.infer<typeof MetroManInput>;

/* ------------------------------------------------------------------ */
/* Global WAN profile                                                  */
/* ------------------------------------------------------------------ */

export const WanCityRole = z.enum(["hq", "branch", "cloud-vpc"]);

export const WanCitySpec = z.object({
  id: z.string().min(1).max(8),
  name: z.string().min(1),
  role: WanCityRole,
  /** IoT/scanner/edge nodes terminating locally. */
  devices: z.number().int().min(1).max(5_000),
  /** Access technology to each city's ND/edge: leased DC circuit vs IPsec over public. */
  transport: z.enum(["leased-dc", "ipsec-internet"]).default("ipsec-internet"),
});
export type WanCitySpec = z.infer<typeof WanCitySpec>;

export const GlobalWanInput = z.object({
  profile: z.literal("global-wan"),
  cities: z.array(WanCitySpec).min(4).max(8),
  cloudVpc: z.object({
    provider: z.enum(["aws", "azure", "gcp"]),
    vpcCidr: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/),
    /** S2S VPN termination endpoints inside the VPC (e.g. VGW tunnel IPs). */
    vpnPeerPublicIps: z.array(z.string().ip()).min(1).max(4),
  }),
  ikeVersion: z.literal(2).default(2),
  /** Cities beyond area 0 get areas 1..n; backbone + BGP connect them. */
  multiAreaOspf: z.boolean().default(true),
  /** Route summarization at ABRs and toward BGP (reduces LSDB/FIB size). */
  routeSummarization: z.boolean().default(true),
  rootBlockCidr: z.string().regex(/^(\d{1,3}\.){3}\d{1,3}\/\d{1,2}$/),
  vlanRequests: z.array(VlanRequest).min(1).max(12),
});
export type GlobalWanInput = z.infer<typeof GlobalWanInput>;

/* ------------------------------------------------------------------ */
/* Discriminated input union + source marker                           */
/* ------------------------------------------------------------------ */

export const NetArchInput = z.discriminatedUnion("profile", [
  CampusLanInput,
  MetroManInput,
  GlobalWanInput,
]);
export type NetArchInput = z.infer<typeof NetArchInput>;

/** How the input reached the system (affects report headers only). */
export const InputSource = z.enum(["preset", "custom"]).default("preset");

export interface ValidatedRun {
  input: NetArchInput;
  source: z.infer<typeof InputSource>;
  /** Non-fatal observations recorded by the validator (e.g. near-boundary values). */
  advisories: string[];
}

/**
 * Parse + validate raw JSON (preset file or custom user input).
 * Throws ValidationError with all Zod issues formatted on failure.
 */
export type ValidateInput = (raw: unknown, source?: z.infer<typeof InputSource>) => ValidatedRun;
