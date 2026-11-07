/**
 * Validation utilities shared by external JSON ingestion and internal
 * design checks — Foundation/Profiles agent.
 *
 * Boundary rule: PURE VALIDATION ONLY. No network algorithms live here
 * (no subnet carving, no media selection, no routing choices). The only
 * arithmetic permitted is sanity introspection of user input (address
 * relevance/alignment, capacity comparisons) which is documented below
 * and tested.
 */

export interface ParsedCidr {
  baseIp: "0.0.0.0" | string;
  prefix: number;
  /** First `prefix` bits are network; remainder are host bits. */
  networkBits: number;
  nonZeroHostBits: number;
  isNetworkAddressAligned: boolean;
  /** Dotted-decimal netmask (2^hostbits trick not used — pure bit-count). */
  maskString: string;
}

/** Maximum prefix accepted as a *routed* block (host addresses exist). */
export const MAX_ROUTED_PREFIX = 32;

function octets(ip: string): number[] | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  const nums: number[] = [];
  for (const p of parts) {
    if (!/^\d{1,3}$/.test(p)) return null;
    const n = Number(p);
    if (n < 0 || n > 255) return null;
    nums.push(n);
  }
  return nums;
}

/**
 * Parse and sanity-check an IPv4 CIDR string.
 * Uses integer arithmetic only — it checks that the declared network bits
 * are actually zero in the supplied base address (i.e., the base is the
 * true network address of the block, e.g. "10.0.0.5/16" is NOT aligned).
 */
export function parseCidrV4(value: string): ParsedCidr | null {
  const trimmed = value.trim();
  const m = /^(\d{1,3}(?:\.\d{1,3}){3})\/(\d{1,2})$/.exec(trimmed);
  if (!m) return null;
  const ip = m[1] as string;
  const prefix = Number(m[2]);
  if (prefix > MAX_ROUTED_PREFIX) return null;
  const bytes = octets(ip);
  if (!bytes) return null;

  const hostBits = 32 - prefix;
  const ipInt = (((bytes[0] ?? 0) << 24) >>> 0) + ((bytes[1] ?? 0) << 16) + ((bytes[2] ?? 0) << 8) + (bytes[3] ?? 0);
  const hostMask = hostBits === 0 ? 0 : (0xFFFFFFFF >>> prefix) >>> 0;
  const nonZeroHostBits = (ipInt & hostMask) >>> 0;
  const aligned = nonZeroHostBits === 0;

  // Reconstruct the aligned base address for normalised output.
  const baseInt = (ipInt & ~hostMask) >>> 0;
  const baseOctets = [(baseInt >>> 24) & 255, (baseInt >>> 16) & 255, (baseInt >>> 8) & 255, baseInt & 255];

  // Dotted mask from the prefix (bit-count → 4 octets, arithmetic only).
  const maskInt = hostBits === 0 ? 0xFFFFFFFF : (0xFFFFFFFF << hostBits) >>> 0;
  const maskOctets = [(maskInt >>> 24) & 255, (maskInt >>> 16) & 255, (maskInt >>> 8) & 255, maskInt & 255];

  return {
    baseIp: baseOctets.join("."),
    prefix,
    networkBits: prefix,
    nonZeroHostBits,
    isNetworkAddressAligned: aligned,
    maskString: maskOctets.join("."),
  };
}

/** Usable host capacity of a block (network+broadcast excluded; /31 exempt per RFC 3021). */
export function usableHosts(prefix: number): number {
  if (prefix >= 31) return prefix === 31 ? 2 : 1;
  return 2 ** (32 - prefix) - 2;
}
