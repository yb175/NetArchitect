/**
 * Documented, configurable profile defaults — Foundation/Profiles agent.
 *
 * These are OUR engineering defaults where the assignment is silent. They
 * are surfaced in report.md as " configurable default (not an assignment
 * fact)" so reviewers can trace every number. None of them are silently
 * baked into engine math without appearing in ExplainRecord inputs.
 */

export interface CampusDefaults {
  /** Vertical/backbone oversubscription headroom for uplink sizing. */
  backboneHeadroomPct: number;
  /** Endpoints served per wireless access PoE coverage unit. */
  endpointsPerAp: number;
  /** Access-port count multiplier for growth room (assignment silent). */
  accessPortHeadroomPct: number;
  collapsedCore: boolean;
  ospfSingleArea: boolean;
  rstpMode: true;
  /** Uplink bandwidth between tiers unless overridden. */
  backboneBandwidthMbps: 10000;
  nativeVlanId: 99;
}

export interface MetroDefaults {
  evplBandwidthMbps: 200;
  latencyTargetMs: 5;
  dualHomedFailover: true;
  /** Per-provider handoff baseline when input omits QoS classes. */
  defaultQosClasses: ["ef-voice", "af31-transactional", "best-effort"];
  evplHandoffBandwidthMbps: 1000;
}

export interface WanDefaults {
  ikeVersion: 2;
  multiAreaOspf: true;
  routeSummarization: true;
  /** IoT node transport unless city overrides. */
  defaultTransport: "ipsec-internet";
  /** BGP AS reserved for sample deployments (private range, documented). */
  privateAsNumber: 65001;
}

export interface ProfileDefaultsCatalog {
  "campus-lan": CampusDefaults;
  "metro-man": MetroDefaults;
  "global-wan": WanDefaults;
}

export const PROFILE_DEFAULTS: ProfileDefaultsCatalog = {
  "campus-lan": {
    backboneHeadroomPct: 20,
    endpointsPerAp: 24,
    accessPortHeadroomPct: 20,
    collapsedCore: true,
    ospfSingleArea: true,
    rstpMode: true,
    backboneBandwidthMbps: 10000,
    nativeVlanId: 99,
  },
  "metro-man": {
    evplBandwidthMbps: 200,
    latencyTargetMs: 5,
    dualHomedFailover: true,
    defaultQosClasses: ["ef-voice", "af31-transactional", "best-effort"],
    evplHandoffBandwidthMbps: 1000,
  },
  "global-wan": {
    ikeVersion: 2,
    multiAreaOspf: true,
    routeSummarization: true,
    defaultTransport: "ipsec-internet",
    privateAsNumber: 65001,
  },
};
