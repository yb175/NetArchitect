/**
 * Validation engine tests — Foundation/Profiles agent deliverable.
 * Covers the rubric's edge-case requirements: meaningful failure messages,
 * boundary values, unique IDs, CIDR sanity, capacity conflicts.
 */
import { describe, it, expect } from "vitest";
import { parseCidrV4, usableHosts } from "../src/validation/index.js";
import { validateLinkEndpoints } from "../src/validation/index.js";
import { validateNetArchInput } from "../src/validation/index.js";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

const preset = (name: string) =>
  JSON.parse(
    readFileSync(
      fileURLToPath(new URL(`../presets/${name.endsWith(".json") ? name : `${name}.json`}`, import.meta.url)),
      "utf8",
    ),
  );

const fixture = (name: string) =>
  JSON.parse(readFileSync(fileURLToPath(new URL(`./fixtures/${name}`, import.meta.url)), "utf8"));

describe("cidr parsing", () => {
  it("parses and normalises a valid CIDR", () => {
    const parsed = parseCidrV4("10.20.0.0/16");
    expect(parsed).not.toBeNull();
    expect(parsed?.prefix).toBe(16);
    expect(parsed?.isNetworkAddressAligned).toBe(true);
    expect(parsed?.maskString).toBe("255.255.0.0");
  });

  it("detects unaligned base addresses", () => {
    const parsed = parseCidrV4("10.0.0.5/16");
    expect(parsed?.isNetworkAddressAligned).toBe(false);
    expect(parsed?.baseIp).toBe("10.0.0.0");
  });

  it("rejects malformed, oversized, or octet-overflow input", () => {
    expect(parseCidrV4("10.0.0.0/33")).toBeNull();
    expect(parseCidrV4("300.1.1.1/8")).toBeNull();
    expect(parseCidrV4("not-a-cidr")).toBeNull();
    expect(parseCidrV4("10.20.0.0")).toBeNull();
  });

  it("computes usable host counts (network+broadcast excluded, /31 exempt)", () => {
    expect(usableHosts(24)).toBe(254);
    expect(usableHosts(31)).toBe(2);
    expect(usableHosts(32)).toBe(1);
  });
});

describe("preset profile validation", () => {
  it.each(["campus-lan.json", "metro-man.json", "global-wan.json"])("%s loads and validates", (file) => {
    const result = validateNetArchInput(preset(file), "preset");
    expect(result.ok).toBe(true);
    expect(result.value).toBeDefined();
    expect(result.errors).toEqual([]);
  });
});

describe("campus-lan validation edge cases", () => {
  const base = preset("campus-lan.json");

  it("rejects wrong building count (assignment nominal = 3)", () => {
    const mut = { ...base, buildings: base.buildings.slice(0, 2) };
    const result = validateNetArchInput(mut, "custom");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.message.toLowerCase().includes("array"))).toBe(true);
  });

  it("flags duplicate building ids as DUPLICATE_ID with readable message", () => {
    const result = validateNetArchInput(fixture("invalid-campus-duplicate-ids.json"), "custom");
    expect(result.ok).toBe(false);
    const dup = result.errors.find((e) => e.code === "DUPLICATE_ID");
    expect(dup?.message).toContain('Duplicate buildings id "BLD-A"');
  });

  it("raises UNALIGNED_BASE_ADDRESS for a 10.50.0.5/16 root", () => {
    const result = validateNetArchInput(fixture("invalid-campus-duplicate-ids.json"), "custom");
    expect(result.errors.some((e) => e.code === "UNALIGNED_BASE_ADDRESS")).toBe(true);
  });

  it("accepts the 100 m Cat6a boundary exactly, with advisory", () => {
    const mut = {
      ...base,
      buildings: base.buildings.map((b: Record<string, unknown>) => ({ ...b, accessRunMeters: 100 })),
    };
    const result = validateNetArchInput(mut, "custom");
    expect(result.ok).toBe(true);
    expect(result.advisories.some((a) => a.includes("Boundary value: 100"))).toBe(true);
  });

  it("rejects backbone beyond the 400 m OM4 limit", () => {
    const mut = {
      ...base,
      buildings: base.buildings.map((b: Record<string, unknown>) => ({ ...b, backboneRunMeters: 400 })),
    };
    mut.buildings[0].backboneRunMeters = 401;
    const result = validateNetArchInput(mut, "custom");
    expect(result.ok).toBe(false);
  });
});

describe("metro-man validation edge cases", () => {
  const base = preset("metro-man.json");

  function mutateSite(distanceKm: number) {
    return { ...base, sites: [{ ...base.sites[0], distanceKm }] };
  }

  it("rejects a 10 km site (below the 15 km MAN floor)", () => {
    const result = validateNetArchInput(mutateSite(10), "custom");    expect(result.ok).toBe(false);
    const err = result.errors.find((e) => e.path.includes("distanceKm"));
    expect(err).toBeDefined();
  });

  it("rejects a 40 km site (above the 35 km MAN ceiling)", () => {
    const result = validateNetArchInput(mutateSite(40), "custom");
    expect(result.ok).toBe(false);
  });

  it("requires exactly one HQ site", () => {
    const mut = { ...base, sites: base.sites.map((s: Record<string, unknown>) => ({ ...s, role: "remote" })) };
    const result = validateNetArchInput(mut, "custom");
    expect(result.errors.some((e) => e.code === "SITE_ROLE_CONFLICT")).toBe(true);
  });

  it("honours the 5 ms target boundary with an advisory", () => {
    const result = validateNetArchInput(base, "preset");
    expect(result.advisories.some((a) => a.includes("Boundary value: 5"))).toBe(true);
  });
});

describe("global-wan validation edge cases", () => {
  const base = preset("global-wan.json");

  it("rejects cloud-vpc role inside cities (cloudVpc block is canonical)", () => {
    const mut = {
      ...base,
      cities: [...base.cities, { ...base.cities[0], id: "EXTRA", role: "cloud-vpc", devices: 10 }],
    };
    const result = validateNetArchInput(mut, "custom");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === "CLOUD_ROLE_IN_CITIES")).toBe(true);
  });

  it("raises CAPACITY_CONFLICT when VLAN demand exceeds the root block", () => {
    const mut = {
      ...base,
      rootBlockCidr: "10.40.0.0/22", // capacity: 1,022 usable hosts
      vlanRequests: base.vlanRequests.map((v: { hosts: number }) => ({ ...v, hosts: 2000 })),
    }; // total demand: 8,000 > 1,022
    const result = validateNetArchInput(mut, "custom");
    expect(result.errors.some((e) => e.code === "CAPACITY_CONFLICT")).toBe(true);
  });

  it("rejects duplicate VPN peer IPs", () => {
    const mut = {
      ...base,
      cloudVpc: {
        ...base.cloudVpc,
        vpnPeerPublicIps: [base.cloudVpc.vpnPeerPublicIps[0], base.cloudVpc.vpnPeerPublicIps[0]],
      },
    };
    const result = validateNetArchInput(mut, "custom");
    expect(result.errors.some((e) => e.code === "DUPLICATE_PEER_IP")).toBe(true);
  });
});

describe("custom fixture: valid metro-man requirement", () => {
  it("accepts the documented valid custom metro requirement", () => {
    const result = validateNetArchInput(fixture("valid-custom-metro.json"), "custom");
    expect(result.ok).toBe(true);
    expect(result.value?.profile).toBe("metro-man");
  });
});

describe("link endpoint structural checks", () => {
  const devices = [{ id: "CORE-1" }, { id: "DIST-A1" }];

  it("passes for well-formed links", () => {
    const errors = validateLinkEndpoints(
      [{ id: "L1", aDeviceId: "CORE-1", bDeviceId: "DIST-A1" }],
      devices,
    );
    expect(errors).toEqual([]);
  });

  it("reports unknown endpoints and self-loops with codes", () => {
    const errors = validateLinkEndpoints(
      [
        { id: "L1", aDeviceId: "GHOST", bDeviceId: "DIST-A1" },
        { id: "L2", aDeviceId: "CORE-1", bDeviceId: "CORE-1" },
      ],
      devices,
    );
    const codes = errors.map((e) => e.code);
    expect(codes).toContain("UNKNOWN_LINK_ENDPOINT");
    expect(codes).toContain("SELF_LINK");
    expect(errors.find((e) => e.code === "UNKNOWN_LINK_ENDPOINT")?.message).toContain('"GHOST"');
  });
});

describe("schema-level garbage", () => {
  it("rejects a wrong-profile tag with a readable message", () => {
    const bad = { ...preset("campus-lan.json"), profile: "not-a-profile" };
    const result = validateNetArchInput(bad, "custom");
    expect(result.ok).toBe(false);
    expect(result.errors[0]?.code).toBe("SCHEMA_MISMATCH");
  });

  it("rejects hosts: 0 (below inclusive floor of 1)", () => {
    const mut = preset("campus-lan.json");
    mut.vlanRequests[0].hosts = 0;
    const result = validateNetArchInput(mut, "custom");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.path.includes("hosts"))).toBe(true);
  });

  it("rejects a malformed rootBlockCidr with INVALID_CIDR", () => {
    const mut = { ...preset("metro-man.json"), rootBlockCidr: "10.5.0.0/33" };
    const result = validateNetArchInput(mut, "custom");
    expect(result.ok).toBe(false);
    expect(result.errors.some((e) => e.code === "INVALID_CIDR")).toBe(true);
  });

  it("rejects completely missing required profile parameters", () => {
    const result = validateNetArchInput({ profile: "metro-man" }, "custom");
    expect(result.ok).toBe(false);
    expect(result.errors.length).toBeGreaterThan(3);
  });
});
