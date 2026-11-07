/**
 * Configuration generator contracts (Cisco IOS-XE style output).
 * OWNER: config-gen specialist agent (implementation in src/configgen/).
 */
import type { Device, Link } from "./topology.js";
import type { VlanPlan } from "./vlan.js";
import type { SubnetPlanItem } from "./vlsm.js";
import type { RoutingPlan } from "./routing.js";

export interface ConfigBundleInput {
  name: string; // scenario id, used for filenames
  devices: Device[];
  links: Link[];
  vlanPlan: VlanPlan;
  subnets: SubnetPlanItem[];
  routing: RoutingPlan;
}

export interface DeviceConfig {
  deviceId: string;
  deviceName: string;
  fileName: string; // e.g. exports/global-wan/CORE-1.ios
  lines: string[];
}

export interface ConfigGenResult {
  configs: DeviceConfig[];
  /** Deferred issues (e.g. "PoE not modelled on platform X"). */
  warnings: string[];
}

export interface ConfigGenerator {
  generate(input: ConfigBundleInput): ConfigGenResult;
}
