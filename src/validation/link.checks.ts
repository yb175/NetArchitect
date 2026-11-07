/**
 * Design-graph structure checks that belong with validation — used when a
 * pipeline stage hands back a graph of links referencing devices.
 * (The input JSON never carries links; this exists for the orchestrator's
 * sanity assertions between stages and for future custom design imports.)
 */
import type { InputDiagnostic } from "./types.js";

export interface LinkEndpointLike {
  id: string;
  aDeviceId: string;
  bDeviceId: string;
}

export interface DeviceIdLike {
  id: string;
}

/**
 * Every network link must reference devices that exist and must not be a
 * self-loop. Pure set arithmetic — no topology *design* logic.
 */
export function validateLinkEndpoints(
  links: readonly LinkEndpointLike[],
  devices: readonly DeviceIdLike[],
): InputDiagnostic[] {
  const known = new Set(devices.map((d) => d.id));
  const errors: InputDiagnostic[] = [];
  links.forEach((link, idx) => {
    if (!known.has(link.aDeviceId)) {
      errors.push({
        path: `links[${idx}].aDeviceId`,
        code: "UNKNOWN_LINK_ENDPOINT",
        message: `Link "${link.id}" references unknown device "${link.aDeviceId}".`,
      });
    }
    if (!known.has(link.bDeviceId)) {
      errors.push({
        path: `links[${idx}].bDeviceId`,
        code: "UNKNOWN_LINK_ENDPOINT",
        message: `Link "${link.id}" references unknown device "${link.bDeviceId}".`,
      });
    }
    if (link.aDeviceId === link.bDeviceId) {
      errors.push({
        path: `links[${idx}]`,
        code: "SELF_LINK",
        message: `Link "${link.id}" connects device "${link.aDeviceId}" to itself.`,
      });
    }
  });
  return errors;
}
