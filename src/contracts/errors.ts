/**
 * Canonical error taxonomy shared by every module.
 * The assignment mandates PhysicalDistanceViolationError by name.
 */
export class NetArchError extends Error {
  public readonly code: string;
  constructor(code: string, message: string) {
    super(`${code}: ${message}`);
    this.name = new.target.name;
    this.code = code;
  }
}

export class ValidationError extends NetArchError {
  constructor(message: string) {
    super("VALIDATION_ERROR", message);
  }
}

/** Raised when copper is requested beyond the 100 m Ethernet limit (IEEE 802.3an). */
export class PhysicalDistanceViolationError extends NetArchError {
  public readonly runMeters: number;
  public readonly requestedMedium: string;
  constructor(runMeters: number, requestedMedium: string, detail: string) {
    super(
      "PHYSICAL_DISTANCE_VIOLATION",
      `Copper run of ${runMeters} m exceeds the 100 m IEEE 802.3an limit for ${requestedMedium}. ${detail}`,
    );
    this.runMeters = runMeters;
    this.requestedMedium = requestedMedium;
  }
}

/** Raised when the root block cannot fit the requested subnets. */
export class AddressSpaceExhaustedError extends NetArchError {
  constructor(baseNetwork: string, requestedHosts: number, message: string) {
    super(
      "ADDRESS_SPACE_EXHAUSTED",
      `Root block ${baseNetwork} cannot satisfy a ${requestedHosts}-host request. ${message}`,
    );
  }
}

/** Internal invariant: allocator output must never overlap. */
export class SubnetOverlapError extends NetArchError {
  constructor(a: string, b: string) {
    super("SUBNET_OVERLAP", `Allocated subnets ${a} and ${b} overlap — allocator invariant broken.`);
  }
}

/** Raised when a MAN/WAN link exceeds the reachable optical standard. */
export class ReachabilityError extends NetArchError {
  constructor(runMeters: number, bestReachM: number) {
    super(
      "OPTICAL_REACH_EXCEEDED",
      `Required run of ${runMeters} m exceeds the longest supported standard reach (${bestReachM} m).`,
    );
  }
}
