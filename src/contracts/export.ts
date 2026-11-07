/**
 * Export manager contracts — produces design report + IOS files + JSON.
 * OWNER: export specialist agent (implementation in src/export/).
 */
export interface ExportedArtifact {
  path: string;
  kind: "ios-config" | "markdown-report" | "json-design" | "verification" | "explain-log";
  bytes: number;
}

export interface ExportManifest {
  scenario: string;
  generatedAtIso: string;
  source: "preset" | "custom";
  artifacts: ExportedArtifact[];
}

export interface ExportDirectoryLayout {
  /** Root directory (e.g. exports/global-wan). */
  root: string;
  manifest: ExportManifest;
}

export interface ExportBundle {
  scenarioName: string;
  configs: Array<{ fileName: string; lines: string[] }>;
  reportMarkdown: string;
  designJson: unknown;
  verificationMarkdown: string;
}

export interface ExportManager {
  export(bundle: ExportBundle): Promise<ExportDirectoryLayout>;
}
