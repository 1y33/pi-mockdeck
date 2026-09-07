export const MOCKUP_SCHEMA_VERSION = 1 as const;

export const TONES = ["text", "muted", "dim", "accent", "success", "warning", "error", "info"] as const;
export type Tone = (typeof TONES)[number];

export interface MockupViewport {
  width: number;
  height: number;
}

export interface MockupArtifact {
  schemaVersion: typeof MOCKUP_SCHEMA_VERSION;
  id: string;
  title: string;
  brief: string;
  variant: string;
  viewport: MockupViewport;
  canvas: string[];
  notes: string[];
  tags: string[];
  createdAt: string;
}

export interface MockupInput {
  title: string;
  brief?: string;
  variant?: string;
  viewport?: Partial<MockupViewport>;
  canvas: string[];
  notes?: string[];
  tags?: string[];
}

export interface ArtifactSummary {
  id: string;
  title: string;
  variant: string;
  tags: string[];
  createdAt: string;
}
