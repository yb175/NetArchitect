/**
 * Pure IPv4 bitwise calculation utilities — VLSM engine.
 *
 * No state, no I/O, no networking policy — arithmetic only. All 32-bit
 * unsigned correctness:
 *  - parse/serialize via multiplicative math (values ≤ 2^32 fall well
 *    inside Number.MAX_SAFE_INTEGER, so no float precision loss).
 *  - every bitwise operator result is normalised with `>>> 0`.
 *  - blocks measured in counts (2^k), never in shifted intermediates.
 */

export interface Int4 {
  a: number;
  b: number;
  c: number;
  d: number;
}

/** Parse "a.b.c.d" into an unsigned 32-bit integer, or null on failure. */
export function ipToUint32(ip: string): number | null {
  const parts = ip.split(".");
  if (parts.length !== 4) return null;
  let value = 0;
  for (let i = 0; i < 4; i++) {
    const part = parts[i];
    if (!part || !/^\d{1,3}$/.test(part)) return null;
    const n = Number(part);
    if (n > 255 || n < 0) return null;
    value = value * 256 + n;
  }
  return value >>> 0;
}

/** Serialize an unsigned 32-bit integer back to dotted-decimal. */
export function uint32ToIp(value: number): string {
  const v = value >>> 0;
  return `${(v >>> 24) & 255}.${(v >>> 16) & 255}.${(v >>> 8) & 255}.${v & 255}`;
}

/** Split an address integer into its four octet components. */
export function uint32ToOctets(value: number): Int4 {
  const v = value >>> 0;
  return { a: (v >>> 24) & 255, b: (v >>> 16) & 255, c: (v >>> 8) & 255, d: v & 255 };
}

/**
 * Netmask integer for a prefix. Bit-arithmetic path:
 * `(~(0xFFFFFFFF >>> prefix)) >>> 0`, with /0 → 0x00000000 and /32 → 0xFFFFFFFF.
 */
export function prefixToMaskInt(prefix: number): number {
  if (prefix <= 0) return 0;
  if (prefix >= 32) return 0xFFFFFFFF;
  return (0xFFFFFFFF ^ (0xFFFFFFFF >>> prefix)) >>> 0;
}

/** Wildcard mask — the exact bit complement of the netmask (for ACLs/OSPF network statements). */
export function maskIntToWildcard(maskInt: number): number {
  return (0xFFFFFFFF ^ (maskInt >>> 0)) >>> 0;
}

export function prefixToWildcardInt(prefix: number): number {
  return maskIntToWildcard(prefixToMaskInt(prefix));
}

/** Network address = base & mask (normalised unsigned). */
export function networkOf(ipInt: number, prefix: number): number {
  return (ipInt & prefixToMaskInt(prefix)) >>> 0;
}

/** Broadcast address = network | host-bits. For /31 and /32 there is no broadcast concept. */
export function broadcastOf(networkInt: number, prefix: number): number | null {
  if (prefix >= 31) return null; // RFC 3021: /31 has no network/broadcast; /32 is a single host
  const hostMask = maskIntToWildcard(prefixToMaskInt(prefix));
  return ((networkInt >>> 0) | hostMask) >>> 0;
}

/**
 * hostCount → smallest prefix whose *usable* capacity covers the demand,
 * with RFC 3021 special handling:
 *   hosts ≤ 1 → /32 (a single host address is itself usable)
 *   hosts == 2 → /31 (both addresses usable; no network/broadcast doubled)
 *   else       → smallest p with 2^(32-p) − 2 ≥ hosts
 * Returns the prefix, or −1 when no IPv4 prefix can serve the request.
 */
export function hostsToPrefix(hosts: number): number {
  if (!Number.isFinite(hosts) || hosts <= 0) return -1;
  if (hosts <= 1) return 32;
  if (hosts === 2) return 31;
  // Walk the prefix DOWNWARD from /32 so the *smallest* block that can carry
  // the demand wins (higher prefix = smaller block = less waste).
  for (let p = 32; p >= 0; p--) {
    if (usableCapacity(p) >= hosts) return p;
  }
  return -1;
}

/** Usable host capacity of a prefix under RFC 3021 semantics. */
export function usableCapacity(prefix: number): number {
  if (prefix >= 31) return prefix === 31 ? 2 : 1;
  if (prefix === 0) return 4294967294; // 2^32 − 2
  return 2 ** (32 - prefix) - 2;
}

/** Total addresses in a block (2^(32-prefix)); /31→2, /32→1 by definition of the host range. */
export function totalAddresses(prefix: number): number {
  if (prefix >= 32) return 1;
  return 2 ** (32 - prefix);
}

/** Block size as a plain integer count of addresses (never a bitwise product). */
export const blockSize = totalAddresses;

/**
 * CIDR-to-subnet-mask conversion: prefix → dotted-decimal mask string.
 */
export function prefixToMaskString(prefix: number): string {
  return uint32ToIp(prefixToMaskInt(prefix));
}

export function prefixToWildcardString(prefix: number): string {
  return uint32ToIp(prefixToWildcardInt(prefix));
}

/** Validate a subnet request numerically (name/id cleanliness + host count). */
export function assertValidHostCount(hosts: number): void {
  if (typeof hosts !== "number" || !Number.isInteger(hosts) || hosts < 1) {
    throw new Error(
      `VLSM_INVALID_REQUEST: host count must be a positive integer ≥ 1 (got ${String(hosts)}).`,
    );
  }
  if (!Number.isSafeInteger(hosts) || hosts > 4294967294) {
    throw new Error(
      `VLSM_HOST_OVERFLOW: host count ${hosts} exceeds the maximum usable IPv4 space (2^32 − 2).`,
    );
  }
}
