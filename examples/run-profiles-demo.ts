/**
 * Runnable example: Foundation & Profiles module.
 * Demonstrates the ingest boundary — preset loading, custom validation,
 * advisory surfacing, and design-model scaffolding. No engine modules run.
 *
 * Usage: npm run example:profiles
 */
import {
  loadPreset,
  loadPresetAsCustom,
  validateCustomNetArchRequirements,
  PROFILE_CATALOG,
  PROFILE_DEFAULTS,
} from "../src/profiles/index.js";
import { createEmptyDesign } from "../src/domain/index.js";

const args = process.argv.slice(2);
const presetName = args[0] && args[0] in PROFILE_CATALOG ? args[0] : "campus-lan";

console.log("== NetArchitect · Profiles module demo ==\n");
console.log("Catalog:", Object.values(PROFILE_CATALOG).map((p) => `${p.kind} (${p.focus})`).join("\n         "));

console.log(`\n-- Loading preset: ${presetName} --`);
const preset = await loadPreset(presetName as "campus-lan" | "metro-man" | "global-wan");
console.log("profile:", preset.input.profile, "| source:", preset.source, "| advisories:", preset.advisories.length);
for (const advisory of preset.advisories) console.log("  •", advisory);

console.log("\n-- Previewing custom-required usage (same shape, custom provenance) --");
const asCustom = await loadPresetAsCustom(presetName as "campus-lan" | "metro-man" | "global-wan");
console.log("profile re-ingested as custom run:", asCustom.source);

console.log("\n-- Design scaffold seeded from validated requirements --");
const design = createEmptyDesign(preset.input.profile, asCustom.source);
console.log("empty NetworkDesign:", {
  profile: design.profile,
  sites: design.sites.length,
  links: design.links.length,
  routing: design.routing,
});

console.log("\n-- Invalid custom input demo --");
{
  const bad = {
    profile: "metro-man",
    sites: [
      { id: "HQ", name: "HQ", role: "hq", distanceKm: 40, users: 200 },
      { id: "REMOTE-1", name: "R1", role: "remote", distanceKm: 18, users: 100 },
      { id: "REMOTE-1", name: "R2", role: "remote", distanceKm: 20, users: 100 },
    ],
  };
  const rejected = validateCustomNetArchRequirements(bad);
  if ("error" in rejected) {
    console.log("rejected:", rejected.error);
    for (const d of rejected.diagnostics) console.log(`  ✗ [${d.code}] ${d.path}: ${d.message}`);
  } else {
    console.log("unexpected accept — validation regressed!");
    process.exitCode = 1;
  }
}

console.log("\nDefaults snapshot (documented, not assignment facts):");
console.log(JSON.stringify(PROFILE_DEFAULTS, null, 2));
