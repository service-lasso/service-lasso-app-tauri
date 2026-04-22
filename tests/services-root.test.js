import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareStarterServicesRoot } from "../src/services-root.js";

test("desktop-alt starter servicesRoot is prepared with an echo-service wrapper manifest", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "service-lasso-app-tauri-services-"));
  const echoServiceRepoRoot = path.join(root, "lasso-echoservice");
  const sourceServicesRoot = path.join(root, "services-template");
  const servicesRoot = path.join(root, ".workspace", "services");

  try {
    await mkdir(echoServiceRepoRoot, { recursive: true });
    await mkdir(path.join(sourceServicesRoot, "echo-service"), { recursive: true });
    await mkdir(path.join(sourceServicesRoot, "service-admin"), { recursive: true });
    await writeFile(
      path.join(echoServiceRepoRoot, "service.json"),
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
    await writeFile(
      path.join(sourceServicesRoot, "echo-service", "service.json"),
      "{\n  \"id\": \"echo-service\",\n  \"executable\": \"node\",\n  \"args\": [\"./run-echo-service.mjs\"]\n}\n",
      "utf8",
    );
    await writeFile(
      path.join(sourceServicesRoot, "service-admin", "service.json"),
      "{\n  \"id\": \"service-admin\",\n  \"enabled\": false\n}\n",
      "utf8",
    );

    const prepared = await prepareStarterServicesRoot({
      sourceServicesRoot,
      echoServiceRepoRoot,
      servicesRoot,
    });

    assert.equal(prepared.echoServiceRoot, path.join(servicesRoot, "echo-service"));
    assert.equal(prepared.serviceAdminRoot, path.join(servicesRoot, "service-admin"));
    const wrapperManifest = JSON.parse(await readFile(path.join(servicesRoot, "echo-service", "service.json"), "utf8"));
    assert.equal(wrapperManifest.id, "echo-service");
    assert.equal(wrapperManifest.executable, "node");
    assert.deepEqual(wrapperManifest.args, ["./run-echo-service.mjs"]);
    const adminManifest = JSON.parse(await readFile(path.join(servicesRoot, "service-admin", "service.json"), "utf8"));
    assert.equal(adminManifest.id, "service-admin");
    const wrapperEntrypoint = await readFile(prepared.wrapperEntrypointPath, "utf8");
    assert.match(wrapperEntrypoint, /spawn\("go", \["run", "\."\]/);
    assert.match(wrapperEntrypoint, new RegExp(JSON.stringify(echoServiceRepoRoot).slice(1, -1).replace(/[.*+?^${}()|[\]\\]/g, "\\$&")));
  } finally {
    await rm(root, { recursive: true, force: true });
  }
});
