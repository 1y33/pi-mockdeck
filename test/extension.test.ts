import assert from "node:assert/strict";
import { describe, it } from "node:test";
import type { ExtensionAPI } from "@earendil-works/pi-coding-agent";
import mockdeck from "../extensions/index.js";

describe("Mockdeck extension registration", () => {
  it("registers its public commands, tool, and lifecycle hooks", () => {
    const commands: string[] = [];
    const tools: string[] = [];
    const events: string[] = [];
    const api = {
      registerCommand: (name: string) => { commands.push(name); },
      registerTool: (tool: { name: string; parameters: { properties: Record<string, unknown> } }) => {
        tools.push(tool.name);
        assert.ok(tool.parameters.properties.folder, "publish tool exposes folder metadata");
      },
      on: (event: string) => { events.push(event); },
    } as unknown as ExtensionAPI;

    mockdeck(api);

    assert.deepEqual(commands.sort(), ["mockup", "mockups"]);
    assert.deepEqual(tools, ["mockdeck_publish"]);
    assert.deepEqual(events.sort(), ["agent_settled", "session_shutdown", "session_start"]);
  });
});
