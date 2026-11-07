/**
 * Profiles + domain model tests — Foundation/Profiles agent.
 * Verifies: preset loading, custom validation round-trip, default
 * documentation presence, and the alias-honesty of the design models.
 */
import { describe, it, expect } from "vitest";
import {
  loadPreset,
  validateCustomNetArchRequirements,
  loadPresetAsCustom,
  PresetNotFoundError,
  isKnownPreset,
  PROFILE_CATALOG,
  PROFILE_DEFAULTS,
} from "../src/profiles/index.js";
import {
  createEmptyDesign,
  type NetworkDesign,
  type SubnetRequest,
  type SubnetAllocation,
  type NetworkDecision,
} from "../src/domain/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const fixture = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${name}.json`, import.meta.url)), "utf8"));

describe("preset loading", () => {
  it("loads all three profile presets", async () => {
    const campus = await loadPreset("campus-lan");
    const metro = await loadPreset("metro-man");
    const wan = await loadPreset("global-wan");

    expect(campus.input.profile).toBe("campus-lan");
    expect(campus.source).toBe("preset");
    expect(metro.input.profile).toBe("metro-man");
    expect(wan.input.profile).toBe("global-wan");
  });

  it("campus preset reflects 1,600 nominal endpoints across 3 buildings", async () => {
    const campus = await loadPreset("campus-lan");
    const input = campus.input as Extract<typeof campus.input, { profile: "campus-lan" }>;
    expect(input.buildings).toHaveLength(3);
    expect(input.buildings.reduce((n, b) => n + b.endpoints, 0)).toBe(1600);
  });

  it("metro preset reflects 450 nominal users, dual-homed, 5 ms target", async () => {
    const metro = await loadPreset("metro-man");
    const input = metro.input as Extract<typeof metro.input, { profile: "metro-man" }>;
    expect(input.sites.reduce((n, s) => n + s.users, 0)).toBe(450);
    expect(input.dualHomedFailover).toBe(true);
    expect(input.latencyTargetMs).toBe(5);
  });

  it("wan preset reflects 2,000 nominal IoT/scanner nodes, IKEv2, multi-area", async () => {
    const wan = await loadPreset("global-wan");
    const input = wan.input as Extract<typeof wan.input, { profile: "global-wan" }>;
    expect(input.cities.reduce((n, c) => n + c.devices, 0) + input.cloudVpc.iotNodes).toBe(2000);
    expect(input.ikeVersion).toBe(2);
    expect(input.multiAreaOspf).toBe(true);
    expect(input.routeSummarization).toBe(true);
  });

  it("raises PresetNotFoundError with the catalog in the message", async () => {
    await expect(loadPreset("dungeon-edit")).rejects.toThrow(PresetNotFoundError);
    await expect(loadPreset("dungeon-edit")).rejects.toThrow(/campus-lan, metro-man, global-wan/);
  });

  it("isKnownPreset guards the CLI surface", () => {
    expect(isKnownPreset("metro-man")).toBe(true);
    expect(isKnownPreset("nope")).toBe(false);
    expect(Object.keys(PROFILE_CATALOG)).toHaveLength(3);
  });
});

describe("custom requirement validation", () => {
  it("accepts a valid custom metro scenario and tags source=custom", () => {
    const result = validateCustomNetArchRequirements(fixture("valid-custom-metro"));
    if ("error" in result) throw new Error(`unexpected reject: ${JSON.stringify(result)}`);
    expect(result.source).toBe("custom");
    expect(result.input.profile).toBe("metro-man");
    expect(result.input.dualHomedFailover).toBe(false);
    expect(result.advisories.length).toBeGreaterThan(0);
  });

  it("a preset re-validated as custom reports source=custom", async () => {
    const roundTripped = await loadPresetAsCustom("campus-lan");
    expect(roundTripped.source).toBe("custom");
  });

  it("returns structured diagnostics for invalid custom input", () => {
    const result = validateCustomNetArchRequirements(fixture("invalid-campus-duplicate-ids"));
    if (!("error" in result)) throw new Error("expected rejection");
    expect(result.diagnostics.some((d) => d.code === "DUPLICATE_ID")).toBe(true);
    expect(result.diagnostics.some((d) => d.code === "UNALIGNED_BASE_ADDRESS")).toBe(true);
  });
});

describe("documented defaults exist and are honest", () => {
  it("every profile has a defaults record", () => {
    expect(PROFILE_DEFAULTS).toHaveProperty("campus-lan");
    expect(PROFILE_DEFAULTS).toHaveProperty("metro-man");
    expect(PROFILE_DEFAULTS).toHaveProperty("global-wan");
  });

  it("campus defaults: RSTP, 802.1Q-native VLAN 99, 10G backbone hand-off", () => {
    const d = PROFILE_DEFAULTS["campus-lan"];
    expect(d.rstpMode).toBe(true);
    expect(d.nativeVlanId).toBe(99);
    expect(d.backboneBandwidthMbps).toBe(10000);
    expect(d.endpointsPerAp).toBe(24);
  });

  it("metro defaults document the sub-5 ms and dual-homing posture", () => {
    const d = PROFILE_DEFAULTS["metro-man"];
    expect(d.latencyTargetMs).toBe(5);
    expect(d.dualHomedFailover).toBe(true);
    expect(d.defaultQosClasses.length).toBeGreaterThanOrEqual(2);
  });

  it("wan defaults use a private BGP AS in the documented range", () => {
    const d = PROFILE_DEFAULTS["global-wan"];
    expect(d.ikeVersion).toBe(2);
    expect(d.privateAsNumber).toBeGreaterThanOrEqual(64512);
    expect(d.privateAsNumber).toBeLessThanOrEqual(65534);
  });
});

describe("design models are honest aliases", () => {
  it("createEmptyDesign produces a typed scaffold with no requirement data", () => {
    const design: NetworkDesign = createEmptyDesign("campus-lan", "custom");
    expect(design.profile).toBe("campus-lan");
    expect(design.sites).toEqual([]);
    expect(design.routing).toBeNull();
    expect(design.verification).toBeNull();
    // Input separation rule: design scaffold must not carry requirement payloads
    expect("buildings" in design).toBe(false);
    expect("vlanRequests" in design).toBe(false);
  });

  it("SubnetRequest / SubnetAllocation / NetworkDecision vocab compile and flow", () => {
    const req: SubnetRequest = { name: "MGMT", hosts: 20 };
    const alloc: Partial<SubnetAllocation> = {
      name: "MGMT",
      requestedHosts: 20,
      capacity: 30,
    };
    const decision: NetworkDecision = {
      id: "TEST.ALIAS-1",
      module: "vlsm",
      rule: "TEST.01",
      decision: "Alias honesty check",
      rationale: "Types flow from the frozen contracts without duplication.",
      inputs: { name: "MGMT", hosts: 20 },
      references: ["RFC 1219"],
    };
    expect(req.hosts).toBe(20);
    expect(alloc.capacity).toBe(30);
    expect(decision.module).toBe("vlsm");
  });
});
