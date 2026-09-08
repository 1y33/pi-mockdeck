import assert from "node:assert/strict";
import { mkdtemp, readFile, rm } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterEach, describe, it } from "node:test";
import { createArtifact } from "../src/artifact.js";
import { DEFAULT_CONFIG } from "../src/config.js";
import { ArtifactStore } from "../src/store.js";

const roots: string[] = [];
afterEach(async () => { await Promise.all(roots.splice(0).map((root) => rm(root, { recursive: true, force: true }))); });

async function store(): Promise<ArtifactStore> {
  const root = await mkdtemp(join(tmpdir(), "mockdeck-"));
  roots.push(root);
  const value = new ArtifactStore(root, 10);
  await value.init();
  return value;
}

describe("ArtifactStore", () => {
  it("persists, indexes, exports, and deletes artifacts", async () => {
    const value = await store();
    const artifact = createArtifact({ title: "Colored", canvas: ["[accent]Hello[/]"] }, DEFAULT_CONFIG);
    await value.save(artifact);
    assert.equal(value.list().length, 1);
    assert.equal((await value.get(artifact.id))?.title, "Colored");
    const exported = await value.exportText(artifact);
    assert.ok((await readFile(exported, "utf8")).includes("Hello"));
    assert.ok(!(await readFile(exported, "utf8")).includes("[accent]"));
    assert.equal(await value.delete(artifact.id), true);
    assert.deepEqual(value.list(), []);
  });

  it("persists folder moves across reload and index recovery", async () => {
    const value = await store();
    const artifact = createArtifact({ title: "Nested", folder: " App / Mobile / ", canvas: ["ok"] }, DEFAULT_CONFIG);
    await value.save(artifact);
    const root = roots[roots.length - 1]!;
    for (const folder of ["App/Mobile", "Other/Desktop", ""]) {
      await value.save({ ...artifact, folder });
      const reloaded = new ArtifactStore(root, 10);
      await reloaded.init();
      assert.equal((await reloaded.get(artifact.id))?.folder, folder);
      assert.equal(reloaded.list()[0]?.folder, folder);
      await rm(join(root, "index.json"));
      const recovered = new ArtifactStore(root, 10);
      await recovered.init();
      assert.equal(recovered.list()[0]?.folder, folder);
    }
  });

  it("rebuilds an absent index from artifact files", async () => {
    const value = await store();
    const artifact = createArtifact({ title: "Recovered", canvas: ["ok"] }, DEFAULT_CONFIG);
    await value.save(artifact);
    const root = roots[roots.length - 1]!;
    await rm(join(root, "index.json"));
    const recovered = new ArtifactStore(root, 10);
    await recovered.init();
    assert.equal(recovered.list()[0]?.title, "Recovered");
  });
});
