import type { ExtensionAPI, ExtensionContext, Theme } from "@earendil-works/pi-coding-agent";
import { copyToClipboard } from "@earendil-works/pi-coding-agent";
import { Text } from "@earendil-works/pi-tui";
import { Type } from "typebox";
import { createArtifact } from "../src/artifact.js";
import { loadConfig, type MockdeckConfig } from "../src/config.js";
import { GalleryComponent, type GalleryAction } from "../src/gallery.js";
import { stripMarkup } from "../src/markup.js";
import { implementationPrompt } from "../src/prompt.js";
import { ArtifactStore } from "../src/store.js";
import type { MockupArtifact, MockupInput } from "../src/types.js";

const PublishParams = Type.Object({
  title: Type.String({ description: "Short concept title" }),
  brief: Type.Optional(Type.String({ description: "Original design brief" })),
  variant: Type.Optional(Type.String({ description: "What makes this concept distinct" })),
  viewport: Type.Optional(Type.Object({
    width: Type.Optional(Type.Integer({ minimum: 20, maximum: 500 })),
    height: Type.Optional(Type.Integer({ minimum: 8, maximum: 120 })),
  })),
  canvas: Type.Array(Type.String(), { minItems: 1, description: "ASCII lines with optional semantic [accent]...[/] color tags" }),
  notes: Type.Optional(Type.Array(Type.String())),
  tags: Type.Optional(Type.Array(Type.String())),
});

interface Runtime { cwd: string; config: MockdeckConfig; store: ArtifactStore }

export default function mockdeck(pi: ExtensionAPI) {
  let runtime: Runtime | undefined;
  let publishedSinceSettle = false;
  let galleryOpen = false;

  async function getRuntime(cwd: string): Promise<Runtime> {
    if (runtime?.cwd === cwd) return runtime;
    const config = loadConfig(cwd);
    const store = new ArtifactStore(config.storageDir, config.maxArtifacts);
    await store.init();
    runtime = { cwd, config, store };
    return runtime;
  }

  async function showGallery(ctx: ExtensionContext): Promise<void> {
    if (galleryOpen || ctx.mode !== "tui") return;
    galleryOpen = true;
    try {
      let keepOpen = true;
      while (keepOpen) {
        const current = await getRuntime(ctx.cwd);
        const artifacts = await current.store.all();
        const action = await ctx.ui.custom<GalleryAction>((tui, theme, _keys, done) =>
          new GalleryComponent(artifacts, theme, () => tui.requestRender(), done, current.config.solidBackground));
        if (!action || action.type === "close") break;
        keepOpen = await handleAction(action, current, ctx);
      }
    } finally { galleryOpen = false; }
  }

  async function handleAction(action: GalleryAction, current: Runtime, ctx: ExtensionContext): Promise<boolean> {
    switch (action.type) {
      case "copy":
        await copyToClipboard(action.artifact.canvas.map(stripMarkup).join("\n"));
        ctx.ui.notify("Mockup copied", "info");
        return true;
      case "delete": {
        const confirmed = await ctx.ui.confirm("Delete mockup?", `${action.artifact.title} cannot be restored.`);
        if (confirmed) await current.store.delete(action.artifact.id);
        return true;
      }
      case "export": {
        const path = await current.store.exportText(action.artifact);
        ctx.ui.notify(`Exported ${path}`, "info");
        return true;
      }
      case "generate": {
        const seed = action.artifact?.brief || action.artifact?.title || "";
        const brief = await ctx.ui.editor("Generate mockup concepts", seed);
        if (brief?.trim()) sendGenerationRequest(brief.trim(), current.config);
        return false;
      }
      case "use":
        ctx.ui.setEditorText(implementationPrompt(action.artifact));
        ctx.ui.notify("Implementation prompt placed in editor", "info");
        return false;
      case "close": return false;
    }
  }

  function sendGenerationRequest(brief: string, config: MockdeckConfig): void {
    pi.sendUserMessage(`Use the ascii-ui-design skill to generate ${config.defaultVariantCount} distinct ASCII interface concepts for this brief. Publish every concept with the mockdeck_publish tool. Do not implement code yet.\n\nBrief: ${brief}`);
  }

  pi.on("session_start", async () => { runtime = undefined; });
  pi.on("session_shutdown", async () => { runtime = undefined; galleryOpen = false; });
  pi.on("agent_settled", async (_event, ctx) => {
    if (!publishedSinceSettle) return;
    publishedSinceSettle = false;
    const current = await getRuntime(ctx.cwd);
    if (current.config.autoOpenAfterGeneration) await showGallery(ctx);
  });

  pi.registerCommand("mockup", {
    description: "Generate colored ASCII UI concepts from a brief",
    handler: async (args, ctx) => {
      const brief = args.trim();
      if (!brief) { ctx.ui.notify("Usage: /mockup <design brief>", "warning"); return; }
      if (!ctx.isIdle()) { ctx.ui.notify("Wait for the agent to finish before generating mockups", "warning"); return; }
      const current = await getRuntime(ctx.cwd);
      sendGenerationRequest(brief, current.config);
    },
  });

  pi.registerCommand("mockups", {
    description: "Browse, export, and select saved ASCII mockups",
    handler: async (_args, ctx) => { await showGallery(ctx); },
  });

  pi.registerTool({
    name: "mockdeck_publish",
    label: "Publish mockup",
    description: "Validate and publish one ASCII UI concept to the Mockdeck gallery. Raw ANSI is forbidden; use semantic tags: [accent], [success], [warning], [error], [info], [muted], [dim], and [/].",
    parameters: PublishParams,
    executionMode: "sequential",
    async execute(_toolCallId, params, _signal, _onUpdate, ctx) {
      const current = await getRuntime(ctx.cwd);
      const artifact = createArtifact(params as MockupInput, current.config);
      await current.store.save(artifact);
      publishedSinceSettle = true;
      return {
        content: [{ type: "text", text: `Published “${artifact.title}” (${artifact.canvas.length} lines, ${artifact.viewport.width}×${artifact.viewport.height})` }],
        details: artifact,
      };
    },
    renderCall(args, theme: Theme) {
      return new Text(theme.fg("toolTitle", theme.bold("mockdeck ")) + theme.fg("muted", args.title), 0, 0);
    },
    renderResult(result, _options, theme: Theme) {
      const artifact = result.details as MockupArtifact | undefined;
      return new Text(artifact ? theme.fg("success", `✓ Published ${artifact.title}`) : theme.fg("error", "Mockup publication failed"), 0, 0);
    },
  });
}
