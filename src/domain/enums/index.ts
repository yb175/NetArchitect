/**
 * Domain enums and tag unions — Foundation/Profiles agent, PR phase one.
 *
 * Canonical literal unions live in the frozen contracts (src/contracts/).
 * This module re-exports them and adds agent-owned unions that are not
 * contract-level (interface kinds, transports, cloud vendors). Re-exporting
 * keeps ONE source of truth for every downstream agent.
 */
import { z } from "zod";
import type { Medium, EthernetStandard } from "../../contracts/media.js";
import type { VlanPurpose } from "../../contracts/input.js";
import type { QosClass as QosClassSchema } from "../../contracts/input.js";
import type { QosClassKind } from "../../contracts/input.js";
import type {
  DeviceRole,
  Device,
  Topology,
  TopologyRequest,
} from "../../contracts/topology.js";

export type { Medium, EthernetStandard, VlanPurpose, DeviceRole, Device, Topology, TopologyRequest };

/** Scenario selector (mirror of contracts/input.ts NetArchInput discriminant). */
export type ProfileKind = "campus-lan" | "metro-man" | "global-wan";

/** Physical or virtual link category (mirror of contracts/topology.ts Link.kind). */
export type LinkKind = "physical" | "evpl" | "ipsec-tunnel" | "bgp-session";

/** WAN city transport technology (mirror of contracts/input.ts WanCitySpec.transport). */
export type WanTransport = "leased-dc" | "ipsec-internet";

/** Public cloud vendor for the Global WAN VPC (mirror of contracts/input.ts cloudVpc.provider). */
export type CloudProvider = "aws" | "azure" | "gcp";

/** Story-level site taxonomy (mirror of contracts/topology.ts Site.kind). */
export type SiteKind = "building" | "man-site" | "city" | "cloud-vpc";

/** QoS class labels (mirror of contracts/input.ts QosClass). */
export type QosClassification = QosClassKind;

/** Hardware port/connector type on a modeled device interface. */
export type DeviceInterfaceKind =
  | "rj45"
  | "sfp"
  | "sfp-plus"
  | "svi"
  | "tunnel"
  | "loopback";

/** Interface speed buckets actually supported by 10G-class campus gear. */
export type InterfaceSpeedMbps = 100 | 1000 | 10000 | 40000;

/** Address-family scope of release 1 (IPv4 only). */
export type AddressFamily = "ipv4";
