/**
 * Semantic validation of requirements and design graphs — Foundation agent.
 * Layered ON TOP of the frozen Zod union (never re-implementing shape rules):
 * 1. shape/schema: Zod (contracts/input.ts)
 * 2. semantics:    cross-field + uniqueness + alignment checks here
 * 3. boundary notes: advisory strings for near-limit values
 *
 * NO networking algorithms live in this module (see domain rules file).
 */
import { z } from "zod";
import {
  NetArchInput,
  CampusLanInput,
  MetroManInput,
  GlobalWanInput,
  type InputSourceKind,
  type NetArchInput as NetArchInputT,
} from "../contracts/input.js";
import { usableHosts, parseCidrV4 } from "./cidr.js";
import type { InputDiagnostic, ValidationResult } from "./types.js";

/* ------------------------------------------------------------------ */
/* Zod issue → readable diagnostics                                    */
/* ------------------------------------------------------------------ */

export function formatZodIssues(issues: z.ZodIssue[]): InputDiagnostic[] {
  return issues.map((issue) => ({
    path: issue.path.length > 0 ? issue.path.join(".") : "(root)",
    code: "SCHEMA_MISMATCH" as const,
    message: `${issue.message} (received ${JSON.stringify(issue.code)})`,
  }));
}

/* ------------------------------------------------------------------ */
/* Boundary + nominal advisory log                                     */
/* ------------------------------------------------------------------ */

const ADVISORY_LIMITS = [
  { value: 100, label: "cat6a max reach (m)" },
  { value: 400, label: "OM4 SR max reach (m)" },
  { value: 15, label: "metro minimum distance (km)" },
  { value: 35, label: "metro maximum distance (km)" },
  { value: 5, label: "metro latency target (ms)" },
  { value: 50, label: "OSPF single-area subnet ceiling" },
];

function advisoryForLimit(value: number, label: string): string {
  return `Boundary value: ${value} sits exactly at the ${label} — engines treat it as inclusive.`;
}

/* ------------------------------------------------------------------ */
/* Semantic checks                                                     */
/* ------------------------------------------------------------------ */

function checkUniqueIds(list: Array<{ id: string }>, what: string, errors: InputDiagnostic[]): void {
  const seen = new Map<string, number>();
  list.forEach((entry, idx) => {
    const prior = seen.get(entry.id);
    if (prior !== undefined) {
      errors.push({
        path: `${what}[${idx}].id`,
        code: "DUPLICATE_ID",
        message: `Duplicate ${what} id "${entry.id}" also appears at index ${prior}.`,
      });
    } else {
      seen.set(entry.id, idx);
    }
  });
}

function checkRootBlock(cidr: string, path: string, errors: InputDiagnostic[], advisories: string[]): void {
  const parsed = parseCidrV4(cidr);
  if (parsed === null) {
    errors.push({
      path,
      code: "INVALID_CIDR",
      message: `Root block "${cidr}" is not a valid dotted-decimal IPv4 CIDR or has prefix > 32.`,
    });
    return;
  }
  if (!parsed.isNetworkAddressAligned) {
    errors.push({
      path,
      code: "UNALIGNED_BASE_ADDRESS",
      message:
        `Root block base ${cidr} is not aligned to a /${parsed.prefix} network boundary — ` +
        `normalise it to ${parsed.baseIp}/${parsed.networkBits}.`,
    });
  }
  if (parsed.prefix > 30) {
    advisories.push(`Root block ${cidr} can host almost nothing; a /30 is a 2-host block.`);
  }
}

function checkCapacity(
  rootCidr: string,
  requestedHosts: number,
  path: string,
  errors: InputDiagnostic[],
): void {
  const parsed = parseCidrV4(rootCidr);
  if (parsed === null) return; // already reported
  const capacity = usableHosts(parsed.prefix);
  if (requestedHosts > capacity) {
    errors.push({
      path,
      code: "CAPACITY_CONFLICT",
      message: `Total host demand (${requestedHosts}) exceeds the root block capacity of ${rootCidr} (${capacity} usable hosts). The VLSM engine would raise AddressSpaceExhaustedError.`,
    });
  }
}

/** Numbers that default upstream from selection order are flagged here, not invented. */
function collectCampusAdvisories(input: CampusLanInput, advisories: string[]): void {
  if (input.buildings.length !== 3) {
    advisories.push("Campus profile nominal is 3 buildings; deviation is allowed but documented.");
  }
  for (const b of input.buildings) {
    if (b.accessRunMeters === 100) {
      advisories.push(advisoryForLimit(100, "cat6a max reach (m)"));
    }
    if (b.backboneRunMeters === 100) {
      advisories.push(advisoryForLimit(100, "cat6a max reach (m)"));
    }
    if (b.backboneRunMeters === 400) {
      advisories.push(advisoryForLimit(400, "OM4 SR max reach (m)"));
    }
  }
  const totalEndpoints = input.buildings.reduce((acc, b) => acc + b.endpoints, 0);
  if (totalEndpoints !== 1600) {
    advisories.push(`Campus nominal endpoint count is 1,600; run total is ${totalEndpoints} (allowed, documented).`);
  }
}

function collectMetroAdvisories(input: MetroManInput, errors: InputDiagnostic[], advisories: string[]): void {
  const hqCount = input.sites.filter((s) => s.role === "hq").length;
  if (hqCount !== 1) {
    errors.push({
      path: "sites",
      code: "SITE_ROLE_CONFLICT",
      message: `Metro profile requires exactly 1 HQ site; found ${hqCount}.`,
    });
  }
  for (const s of input.sites) {
    if (s.distanceKm === 15) advisories.push(advisoryForLimit(15, "metro minimum distance (km)"));
    if (s.distanceKm === 35) advisories.push(advisoryForLimit(35, "metro maximum distance (km)"));
  }
  if (input.latencyTargetMs === 5) advisories.push(advisoryForLimit(5, "metro latency target (ms)"));
}

function collectWanAdvisories(input: GlobalWanInput, errors: InputDiagnostic[], advisories: string[]): void {
  if (input.cities.some((c) => c.role === "cloud-vpc")) {
    errors.push({
      path: "cities",
      code: "CLOUD_ROLE_IN_CITIES",
      message: "Cities must not carry role 'cloud-vpc' — the `cloudVpc` block is the single canonical cloud definition.",
    });
  }
  const seenIps = new Set<string>();
  input.cloudVpc.vpnPeerPublicIps.forEach((ip, idx) => {
    if (seenIps.has(ip)) {
      errors.push({
        path: `cloudVpc.vpnPeerPublicIps[${idx}]`,
        code: "DUPLICATE_PEER_IP",
        message: `Duplicate VPN peer IP ${ip}.`,
      });
    }
    seenIps.add(ip);
  });
  // Device demand truth-check: city devices + VPC IoT nodes vs. the 2,000 nominal devices.
  const totalDevices = input.cities.reduce((acc, c) => acc + c.devices, 0) + input.cloudVpc.iotNodes;
  advisories.push(
    `IoT/scanner nominal count is 2,000; run total is ${totalDevices} (cities ${input.cities.reduce((acc, c) => acc + c.devices, 0)} + VPC ${input.cloudVpc.iotNodes}) — allowed, documented.`,
  );
}

/**
 * Cross-field checks after Zod shape acceptance.
 * Throws nothing — returns structured diagnostics.
 */
export function semanticChecks(input: NetArchInputT): {
  errors: InputDiagnostic[];
  advisories: string[];
} {
  const errors: InputDiagnostic[] = [];
  const advisories: string[] = [];

  const totalHosts = input.vlanRequests.reduce((acc, v) => acc + v.hosts, 0);
  checkRootBlock(input.rootBlockCidr, "rootBlockCidr", errors, advisories);
  checkUniqueIds(
    input.profile === "campus-lan"
      ? input.buildings
      : input.profile === "metro-man"
        ? input.sites
        : input.cities,
    input.profile === "campus-lan" ? "buildings" : input.profile === "metro-man" ? "sites" : "cities",
    errors,
  );
  checkCapacity(input.rootBlockCidr, totalHosts, "vlanRequests", errors);

  if (input.profile === "campus-lan") collectCampusAdvisories(input, advisories);
  if (input.profile === "metro-man") collectMetroAdvisories(input, errors, advisories);
  if (input.profile === "global-wan") collectWanAdvisories(input, errors, advisories);

  return { errors, advisories };
}

/**
 * Full external-boundary validation: Zod union first, then semantic layer.
 * Returns a ValidationResult with the parsed value when everything passes.
 */
export function validateNetArchInput(raw: unknown, source: InputSourceKind): ValidationResult<NetArchInputT> {
  const shape = NetArchInput.safeParse(raw);
  if (!shape.success) {
    return { ok: false, errors: formatZodIssues(shape.error.issues), advisories: [] };
  }
  const { errors, advisories } = semanticChecks(shape.data);
  if (errors.length > 0) {
    return { ok: false, errors, advisories };
  }
  return { ok: true, value: shape.data, errors: [], advisories };
}
