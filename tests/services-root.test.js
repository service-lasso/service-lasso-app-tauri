import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareStarterServicesRoot } from "../src/services-root.js";

test("desktop-alt starter servicesRoot is prepared with an echo-service wrapper manifest", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "service-lasso-app-tauri-services-"));
  const echoServiceRoot = path.join(root, "lasso-echoservice");
  const servicesRoot = path.join(root, ".workspace", "services");

  try {
    await mkdir(echoServiceRoot, { recursive: true });
    await writeFile(
      path.join(echoServiceRoot, "service.json"),
      `${JSON.stringify(
        {
          id: "echo-service",
          name: "Echo Service",
          description: "Harness",
          version: "0.0.0",
          enabled: true,
          executable: "go",
          args: ["run", "."],
          healthcheck: {
            type: "process",
          },
        },
        null,
        2,
      )}\n`,
      "utf8",
    );

    const prepared = await prepareStarterServicesRoot({
      echoServiceRoot,
      servicesRoot,
    });

    assert.equal(prepared.wrapperServiceRoot, path.join(servicesRoot, "echo-service"));
    const wrapperManifest = JSON.parse(await readFile(prepared.wrapperManifestPath, "utf8"));
    assert.equal(wrapperManifest.id, "echo-service");
    assert.equal(wrapperManifest.executable, "node");
    assert.deepEqual(wrapperManifest.args, ["./run-echo-service.mjs"]);
    assert.match(wrapperManifest.description, /Wrapped by service-lasso-app-tauri/);
    const wrapperEntrypoint = await readFile(prepared.wrapperEntrypointPath, "utf8");
    assert.match(wrapperEntrypoint, /spawn\("go", \["run", "\."\]/);
    assert.match(wrapperEntrypoint, new RegExp(JSON.stringify(echoServiceRoot).slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
