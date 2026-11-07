/**
 * Pure-calculation utility tests — VLSM engine.
 */
import { describe, it, expect } from "vitest";
import {
  ipToUint32,
  uint32ToIp,
  prefixToMaskInt,
  prefixToWildcardInt,
  prefixToMaskString,
  networkOf,
  broadcastOf,
  hostsToPrefix,
  usableCapacity,
  totalAddresses,
} from "../../../src/engines/vlsm/bits.js";

describe("ipToUint32 / uint32ToIp round-trips", () => {
  it("round-trips ordinary addresses", () => {
    expect(uint32ToIp(ipToUint32("10.0.0.1") as number)).toBe("10.0.0.1");
    expect(uint32ToIp(ipToUint32("192.168.1.128") as number)).toBe("192.168.1.128");
  });

  it("survives the >0x7FFFFFFF sign-boundary range", () => {
    expect(ipToUint32("255.255.255.255")).toBe(4294967295);
    expect(ipToUint32("128.0.0.1")).toBe(2147483649);
    expect(uint32ToIp(2147483649)).toBe("128.0.0.1");
    expect(uint32ToIp(4294967295)).toBe("255.255.255.255");
  });

  it("rejects malformed addresses", () => {
    expect(ipToUint32("256.1.1.1")).toBeNull();
    expect(ipToUint32("10.0.0")).toBeNull();
    expect(ipToUint32("foo.bar.1.1")).toBeNull();
    expect(ipToUint32("10.-1.0.0")).toBeNull();
  });
});

describe("mask / wildcard maths", () => {
  it("prefix→mask conversions hit known dotted-decimals", () => {
    expect(prefixToMaskString(0)).toBe("0.0.0.0");
    expect(prefixToMaskString(8)).toBe("255.0.0.0");
    expect(prefixToMaskString(23)).toBe("255.255.254.0");
    expect(prefixToMaskString(25)).toBe("255.255.255.128");
    expect(prefixToMaskString(32)).toBe("255.255.255.255");
  });

  it("wildcard mask is the exact bit complement", () => {
    expect(prefixToWildcardInt(24)).toBe(255);
    expect(prefixToMaskInt(24) + prefixToWildcardInt(24)).toBe(0xFFFFFFFF);
    expect(prefixToWildcardInt(32)).toBe(0);
    expect(prefixToWildcardInt(31)).toBe(1);
  });
});

describe("network / broadcast derivation", () => {
  it("network zeroes the host bits", () => {
    expect(networkOf(ipToUint32("10.20.8.77") as number, 22)).toBe(ipToUint32("10.20.8.0") as number);
    expect(uint32ToIp(networkOf(ipToUint32("192.168.1.129") as number, 25))).toBe("192.168.1.128");
  });

  it("broadcast for conventional prefixes is network | hostbits", () => {
    expect(uint32ToIp(broadcastOf(ipToUint32("192.168.1.0") as number, 26) as number)).toBe("192.168.1.63");
  });

  it("returns null broadcast for /31 and /32 (no broadcast concept)", () => {
    expect(broadcastOf(ipToUint32("10.0.0.4") as number, 31)).toBeNull();
    expect(broadcastOf(ipToUint32("10.0.0.4") as number, 32)).toBeNull();
  });
});

describe("hostsToPrefix (RFC 3021 aware)", () => {
  it("maps host demands to minimal prefixes", () => {
    expect(hostsToPrefix(1)).toBe(32);
    expect(hostsToPrefix(2)).toBe(31);
    expect(hostsToPrefix(3)).toBe(29);
    expect(hostsToPrefix(6)).toBe(29);
    expect(hostsToPrefix(7)).toBe(28);
    expect(hostsToPrefix(20)).toBe(27);
    expect(hostsToPrefix(50)).toBe(26);
    expect(hostsToPrefix(100)).toBe(25);
    expect(hostsToPrefix(126)).toBe(25);
  });

  it("rejects impossible demands with −1", () => {
    expect(hostsToPrefix(0)).toBe(-1);
    expect(hostsToPrefix(-5)).toBe(-1);
    expect(hostsToPrefix(4294967295)).toBe(-1); // 2^32 − 1 > 2^32 − 2 ⇒ impossible
  });
});

describe("capacity + block size semantics", () => {
  it("reserves two addresses on normal prefixes", () => {
    expect(usableCapacity(24)).toBe(254);
    expect(usableCapacity(30)).toBe(2);
    expect(totalAddresses(24)).toBe(256);
  });

  it("exempts /31 and /32 from the 2-address reservation", () => {
    expect(usableCapacity(31)).toBe(2);
    expect(usableCapacity(32)).toBe(1);
    expect(totalAddresses(31)).toBe(2);
    expect(totalAddresses(32)).toBe(1);
  });

  it("reports maximum valid IPv4 address capacity at /0", () => {
    expect(usableCapacity(0)).toBe(4294967294);
  });
});
