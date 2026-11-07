/**
 * Structured validation result contract — Foundation/Profiles agent.
 * Errors block the run; advisories are non-fatal boundary observations
 * that get carried into the explain log downstream.
 */

export type DiagnosticCode =
  // schema-level (Zod)
  | "SCHEMA_MISMATCH"
  | "WRONG_PROFILE_TAG"
  // semantic input checks
  | "DUPLICATE_ID"
  | "INVALID_CIDR"
  | "UNALIGNED_BASE_ADDRESS"
  | "HOST_COUNT_OUT_OF_RANGE"
  | "DISTANCE_OUT_OF_RANGE"
  | "SITE_ROLE_CONFLICT"
  | "CLOUD_ROLE_IN_CITIES"
  | "DUPLICATE_PEER_IP"
  | "MISSING_REQUIRED_FIELD"
  | "CAPACITY_CONFLICT"
  // design-graph checks (link endpoint references)
  | "UNKNOWN_LINK_ENDPOINT"
  | "SELF_LINK"
  // internal guard
  | "UNREADABLE_INPUT"
  | "VALIDATION_NOT_RUN";

export interface InputDiagnostic {
  path: string;
  code: DiagnosticCode;
  message: string;
}

export interface ValidationResult<T = unknown> {
  ok: boolean;
  /** Present only when the schema accepted the payload (pre-semantic). */
  value?: T;
  errors: InputDiagnostic[];
  /** Non-fatal observations (exact-boundary values, nominal-count drift). */
  advisories: string[];
}
