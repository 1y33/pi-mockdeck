import { stripMarkup } from "./markup.js";
import type { MockupArtifact } from "./types.js";

export function implementationPrompt(artifact: MockupArtifact): string {
  const notes = artifact.notes.length ? `\nDesign notes:\n${artifact.notes.map((note) => `- ${note}`).join("\n")}` : "";
  return `Implement the selected Mockdeck concept below. Treat it as a structural design direction, adapt it to the project's design system and responsive conventions, and verify the result.\n\nConcept: ${artifact.title} — ${artifact.variant}\nTarget viewport: ${artifact.viewport.width}×${artifact.viewport.height}\n\n\`\`\`text\n${artifact.canvas.map(stripMarkup).join("\n")}\n\`\`\`${notes}`;
}
