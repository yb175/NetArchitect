/**
 * Preset loading + custom input ingestion — Foundation/Profiles agent.
 * External JSON boundary; all Zod + semantic checking funnels through
 * src/validation/. No networking algorithms here.
 */
import { readFile } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import {
  type InputSourceKind,
  type ValidatedRun,
} from "../contracts/input.js";
import type { InputDiagnostic } from "../validation/types.js";
import { validateNetArchInput, parseCidrV4 } from "../validation/index.js";
import type { ProfileDescriptor } from "../domain/models/requirements.model.js";

export type PresetName = "campus-lan" | "metro-man" | "global-wan";

/** Metadata surfaced by the CLI (`netarch profiles`) — text tracks the assignment. */
export const PROFILE_CATALOG: Record<PresetName, ProfileDescriptor> = {
  "campus-lan": {
    kind: "campus-lan",
    label: "Campus LAN",
    presetFile: "presets/campus-lan.json",
    focus: "Cat6a vs MMF, 802.1Q VLANs, RSTP, single-area OSPF",
  },
  "metro-man": {
    kind: "metro-man",
    label: "Metro MAN",
    presetFile: "presets/metro-man.json",
    focus: "OS2 SMF, EVPL, sub-5 ms QoS, dual-homed failover",
  },
  "global-wan": {
    kind: "global-wan",
    label: "Global WAN",
    presetFile: "presets/global-wan.json",
    focus: "IPsec VPN, multi-area OSPF/BGP, route summarization",
  },
};

export class PresetNotFoundError extends Error {
  public readonly presetName: string;
  constructor(name: string) {
    super(
      `Preset "${name}" not found. Available presets: ${Object.keys(PROFILE_CATALOG).join(", ")}.`,
    );
    this.name = "PresetNotFoundError";
    this.presetName = name;
  }
}

function presetUrl(name: PresetName): URL {
  const relativeUrl = new URL(`../../presets/${name}.json`, import.meta.url);
  // Make the path absolute for fs on all platforms.
  return relativeUrl;
}

/** Load one of the three built-in presets, fully validated, tagged as preset. */
export async function loadPreset(name: PresetName): Promise<ValidatedRun> {
  if (!(name in PROFILE_CATALOG)) throw new PresetNotFoundError(name);
  let rawText: string;
  try {
    rawText = await readFile(fileURLToPath(presetUrl(name)), "utf8");
  } catch (err) {
    throw new PresetNotFoundError(name);
  }

  let raw: unknown;
  try {
    raw = JSON.parse(rawText);
  } catch (err) {
    throw new Error(`Preset "${name}" contains malformed JSON: ${(err as Error).message}`);
  }

  const input = validateNetArchInput(raw, "preset");
  if (!input.ok || !input.value) {
    const details = input.errors.map((e) => ` - [${e.code}] ${e.path}: ${e.message}`).join("\n");
    throw new Error(`Preset "${name}" failed validation:\n${details}`);
  }
  return { input: input.value, source: "preset", advisories: input.advisories };
}

/**
 * Validate arbitrary user JSON as a custom scenario run (same schemas as presets).
 * Returns a ValidatedRun on success or a structured failure.
 */
export function validateCustomNetArchRequirements(
  raw: unknown,
): ValidatedRun | { error: string; diagnostics: InputDiagnostic[] } {
  const checked = validateNetArchInput(raw, "custom");
  if (!checked.ok) {
    return { error: "Custom requirements failed validation", diagnostics: checked.errors };
  }
  return { input: checked.value as ValidatedRun["input"], source: "custom", advisories: checked.advisories };
}

/** Load one of the three profiles *as custom requirements* (runtime mutation case). */
export async function loadPresetAsCustom(name: PresetName): Promise<ValidatedRun> {
  const preset = await loadPreset(name);
  return { ...preset, source: "custom" };
}

/** Anything else the profile manager should NOT be handling (boundary guard). */
export function isKnownPreset(name: string): name is PresetName {
  return name in PROFILE_CATALOG;
}

export { validateNetArchInput, parseCidrV4 };
