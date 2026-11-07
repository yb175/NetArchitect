/**
 * Deterministic VLSM allocator — VLSM engine core.
 *
 * Algorithm (see docs/VLSM_ALGORITHM.md):
 *  1. Validate the root CIDR (parse + network-alignment).
 *  2. Validate every host request (>0, integer, ≤ IPv4 maximum, unique id).
 *  3. Sort requests descending by demanded block size (stable tie-break on
 *     the original collection index for full determinism).
 *  4. Map each host demand to the minimal RFC-3021-aware prefix.
 *  5. Carve monotonically from the root base address: cursor += blockSize.
 *     Alignment is a structural invariant (every step moves by the block's
 *     own size), so overlap is impossible; an O(n) assertion still enforces
 *     it (defense-in-depth for the no-overlap acceptance criterion).
 *  6. Reject any request that does not fit the remaining root capacity.
 *  7. Reserve the first usable IP as the gateway.
 *  8. Emit per-block and root-level utilization with rationale records.
 *
 * This module contains NO Cisco configuration generation.
 */
import type {
  SubnetPlanItem,
  VlsmPlan,
  VlsmRequest,
  VlsmRootBlock,
} from "../../contracts/vlsm.js";
import type { ExplainRecord } from "../../contracts/explain.js";
import { AddressSpaceExhaustedError, SubnetOverlapError } from "../../contracts/errors.js";
import { parseCidrV4 } from "../../validation/cidr.js";
import {
  broadcastOf,
  hostsToPrefix,
  ipToUint32,
  prefixToMaskString,
  prefixToWildcardString,
  totalAddresses,
  uint32ToIp,
  usableCapacity,
} from "./bits.js";

/** Error raised when a request itself is malformed (zero/negative hosts, bad id). */
export class VlsmRequestError extends Error {
  public readonly code = "VLSM_INVALID_REQUEST";
  public readonly argumentPath: string;
  constructor(message: string, argumentPath: string) {
    super(`${message} [at ${argumentPath}]`);
    this.name = "VlsmRequestError";
    this.argumentPath = argumentPath;
  }
}

/** Parse an address that at this point is *known* to be well-formed (internal invariant). */
function u32(ip: string): number {
  const value = ipToUint32(ip);
  if (value === null) {
    throw new VlsmRequestError(`Internal error: malformed IPv4 "${ip}".`, "internal.ip");
  }
  return value;
}

/**
 * Deterministically allocate non-overlapping subnets from a root block.
 *
 * @param rootCidr  Root IPv4 CIDR, e.g. "192.168.1.0/24". MUST be a network-
 *                  aligned base address of the declared prefix.
 * @param requests  Array of { name, hosts } demands. Mutated? No — copied and
 *                  sorted on a copy. Input is never mutated.
 * @returns         VlsmPlan with subnets sorted descending by size, each item
 *                  carrying network/prefix/mask/wildcard/broadcast/first/last/
 *                  gateway/totalAddresses/capacity/utilization.
 * @throws VlsmRequestError              zero/negative/non-integer hosts, blank name, duplicates
 * @throws AddressSpaceExhaustedError    demand exceeds the root block
 * @throws SubnetOverlapError            internal invariant violation (never expected)
 */
export function allocateVlsm(rootCidr: string, requests: VlsmRequest[]): VlsmPlan {
  /* 1. Validate root ------------------------------------------------ */
  const parsedRoot = parseCidrV4(rootCidr);
  if (parsedRoot === null) {
    throw new VlsmRequestError(`Root CIDR "${rootCidr}" is not a valid dotted-decimal IPv4 CIDR (or prefix > 32).`, "rootCidr");
  }
  if (!parsedRoot.isNetworkAddressAligned) {
    throw new VlsmRequestError(
      `Root "${rootCidr}" is not aligned to its /${parsedRoot.prefix} boundary — normalise to ${parsedRoot.baseIp}/${parsedRoot.prefix}.`,
      "rootCidr",
    );
  }

  const rootBase = u32(parsedRoot.baseIp);
  const rootCapacity = usableCapacity(parsedRoot.prefix);
  const rootBlockSize = totalAddresses(parsedRoot.prefix);
  const rootEnd = rootBase + rootBlockSize; // safe: < 2^33

  /* 2. Validate requests + uniqueness ------------------------------- */
  const seenNames = new Map<string, number>();
  requests.forEach((req, idx) => {
    const path = `requests[${idx}](${req?.name ?? "?"})`;
    if (!req || typeof req !== "object") {
      throw new VlsmRequestError("Request is not an object.", path);
    }
    if (typeof req.name !== "string" || req.name.trim().length === 0) {
      throw new VlsmRequestError("Subnet name/identifier must be a non-empty string.", path);
    }
    if (seenNames.has(req.name)) {
      throw new VlsmRequestError(
        `Duplicate subnet identifier "${req.name}" (first seen at index ${seenNames.get(req.name)}).`,
        path,
      );
    }
    seenNames.set(req.name, idx);
    assertValidHostCount(req.hosts, path);
  });

  /* 3. Sort descending by demanded block size, stable on index ------- */
  const ordered = requests
    .map((req, inputIndex) => ({ req, inputIndex }))
    .sort((x, y) => {
      const capX = hostsToPrefix(x.req.hosts);
      const capY = hostsToPrefix(y.req.hosts);
      if (capX !== capY) return capX - capY; // lower prefix = bigger block first
      return x.inputIndex - y.inputIndex;
    });

  /* 4–7. Monotone carving ------------------------------------------- */
  const explanations: ExplainRecord[] = [];
  const subnets: SubnetPlanItem[] = [];
  let cursor = rootBase;

  for (const { req, inputIndex } of ordered) {
    const prefix = hostsToPrefix(req.hosts);
    if (prefix === -1 || prefix < parsedRoot.prefix) {
      throw new AddressSpaceExhaustedError(
        rootCidr,
        req.hosts,
        `Request "${req.name}" needs a /${prefix === -1 ? "…" : prefix} inside a /${parsedRoot.prefix} root — impossible.`,
      );
    }
    const block = totalAddresses(prefix);
    if (cursor + block > rootEnd) {
      throw new AddressSpaceExhaustedError(
        rootCidr,
        req.hosts,
        `Request "${req.name}" (${block} addresses at /${prefix}) does not fit — cursor at ${uint32ToIp(cursor)}, root ends at ${uint32ToIp(rootEnd - 1)}.`,
      );
    }

    const networkInt = cursor;
    const bcast = broadcastOf(networkInt, prefix);
    const firstUsable = prefix === 32 ? networkInt : prefix === 31 ? networkInt : networkInt + 1;
    const lastUsable = bcast === null ? (prefix === 32 ? networkInt : networkInt + 1) : bcast - 1;
    const capacity = usableCapacity(prefix);
    const utilization = capacity > 0 ? req.hosts / capacity : 0;

    const item: SubnetPlanItem = {
      name: req.name,
      index: subnets.length,
      network: uint32ToIp(networkInt),
      prefix,
      mask: prefixToMaskString(prefix),
      wildcard: prefixToWildcardString(prefix),
      broadcast: bcast === null ? "" : uint32ToIp(bcast),
      firstHost: uint32ToIp(firstUsable),
      lastHost: uint32ToIp(lastUsable),
      gateway: uint32ToIp(firstUsable), // A+3: gateway = first usable IP
      totalAddresses: block, // A+4
      requestedHosts: req.hosts,
      capacity,
      utilization: Math.round(utilization * 10000) / 10000,
    };
    subnets.push(item);
    explanations.push({
      module: "vlsm",
      id: `VLSM.ALLOC-${item.index}-${req.name}`,
      rule: "VLSM.DESCENDING-CARVE",
      decision: `Allocated ${req.name} as ${item.network}/${prefix}`,
      rationale:
        `${req.hosts} requested hosts map to the minimal /${prefix} under RFC 3021 host-capacity math; ` +
        `carved monotonically after all larger blocks, gateway reserved at ${item.gateway} (first usable IP).`,
      inputs: { hosts: req.hosts, inputIndex, prefix },
      references: ["RFC 950", "RFC 3021"],
    });

    cursor += block;
  }

  /* 8. Utilization + invariants ------------------------------------- */
  const allocatedCapacity = subnets.reduce((acc, s) => acc + s.capacity, 0);
  const efficiency = rootCapacity > 0 ? Math.round((allocatedCapacity / rootCapacity) * 10000) / 10000 : 0;
  explanations.push({
    module: "vlsm",
    id: "VLSM.UTILIZATION",
    rule: "VLSM.CAPACITY",
    decision: `Root-block utilization ${(efficiency * 100).toFixed(2)}%`,
    rationale:
      `(${allocatedCapacity} usable addresses of ${rootCapacity} in ${rootCidr}, ` +
      `${subnets.length} blocks carved, ${rootBlockSize - (cursor - rootBase)} address(es) left free.`,
    inputs: { allocatedCapacity, rootCapacity },
    references: ["RFC 950"],
  });
  assertNoOverlap(subnets);
 explanations.push({
    module: "vlsm",
    id: "VLSM.NO-OVERLAP",
    rule: "VLSM.INVARIANT",
    decision: "No-overlap invariant holds across all allocations.",
    rationale: "Monotone carving guarantees non-intersection; verified with an O(n) boundary assertion.",
    inputs: { count: subnets.length },
    references: ["RFC 950"],
  });

  return {
    root: { baseNetwork: parsedRoot.baseIp, prefix: parsedRoot.prefix },
    subnets,
    efficiency,
    explanations,
  };
}

function assertValidHostCount(hosts: number, path: string): void {
  if (typeof hosts !== "number" || !Number.isInteger(hosts) || hosts < 1) {
    throw new VlsmRequestError(
      `Host count must be a positive integer ≥ 1 (got ${String(hosts)}).`,
      `${path}.hosts`,
    );
  }
  if (hosts > 4294967294) {
    throw new VlsmRequestError(
      `Host count ${hosts} exceeds the maximum usable IPv4 space (2^32 − 2).`,
      `${path}.hosts`,
    );
  }
}

/**
 * O(n) no-overlap assertion on the *emitted* allocation list:
 * every block must end strictly before the next block's network address.
 * This is defense-in-depth — the carving loop makes overlap structurally
 * impossible, but the acceptance criterion demands we *prove* it live.
 */
function assertNoOverlap(subnets: readonly SubnetPlanItem[]): void {
  for (let i = 1; i < subnets.length; i++) {
    const prev = subnets[i - 1];
    const cur = subnets[i];
    if (prev === undefined || cur === undefined) continue;
    // /31 and /32 have no broadcast address — their end is lastHost.
    const prevEndIp = prev.prefix >= 31 ? prev.lastHost : prev.broadcast;
    const prevEnd = u32(prevEndIp) + 1;
    const curStart = u32(cur.network);
    if (prevEnd > curStart) {
      throw new SubnetOverlapError(
        `${prev.network}/${prev.prefix}`,
        `${cur.network}/${cur.prefix}`,
      );
    }
  }
}
