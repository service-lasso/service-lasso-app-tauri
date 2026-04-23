import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { once } from "node:events";
import { resolveTauriConfig, validateTauriConfig } from "../src/config.js";
import { createHostStatus, createTauriHostServer } from "../src/server.js";

async function createFixtureRoots() {
  const root = await mkdtemp(path.join(tmpdir(), "service-lasso-app-tauri-"));
  const siblingRoot = path.join(root, "siblings");
  const adminDistRoot = path.join(siblingRoot, "lasso-@serviceadmin", "dist");
  const sourceServicesRoot = path.join(root, "service-lasso-app-tauri", "services");

  await mkdir(adminDistRoot, { recursive: true });
  await mkdir(path.join(sourceServicesRoot, "echo-service"), { recursive: true });
  await mkdir(path.join(sourceServicesRoot, "service-admin"), { recursive: true });
  await writeFile(path.join(adminDistRoot, "index.html"), "<!doctype html><title>admin</title>", "utf8");
  await writeFile(path.join(adminDistRoot, "asset.js"), "console.log('admin asset');", "utf8");
  await writeFile(
    path.join(sourceServicesRoot, "echo-service", "service.json"),
    "{\n  \"id\": \"echo-service\",\n  \"artifact\": {\n    \"kind\": \"archive\"\n  }\n}\n",
    "utf8",
  );
  await writeFile(path.join(sourceServicesRoot, "service-admin", "service.json"), "{\n  \"id\": \"service-admin\"\n}\n", "utf8");

  return {
    root,
    siblingRoot,
    adminDistRoot,
    sourceServicesRoot,
  };
}

test("tauri config resolves deterministic sibling repo paths", async () => {
  const fixture = await createFixtureRoots();

  try {
    const config = resolveTauriConfig({
      repoRoot: path.join(fixture.root, "service-lasso-app-tauri"),
      siblingRoot: fixture.siblingRoot,
      hostPort: 19160,
      runtimePort: 18196,
    });

    assert.equal(config.hostUrl, "http://127.0.0.1:19160");
    assert.equal(config.runtimeUrl, "http://127.0.0.1:18196");
    assert.equal(config.adminDistRoot, fixture.adminDistRoot);
    assert.equal(config.sourceServicesRoot, fixture.sourceServicesRoot);
    assert.match(config.tauriConfigPath, /src-tauri[\\/]tauri\.conf\.json$/);

    await assert.doesNotReject(() => validateTauriConfig(config));
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});

test("desktop-alt host serves shell, host status, and mounted admin assets", async () => {
  const fixture = await createFixtureRoots();

  try {
    const config = await validateTauriConfig(
      resolveTauriConfig({
        repoRoot: path.join(fixture.root, "service-lasso-app-tauri"),
        siblingRoot: fixture.siblingRoot,
        hostPort: 0,
        runtimePort: 18196,
      }),
    );
    const status = createHostStatus(config);
    assert.equal(status.app, "@service-lasso/service-lasso-app-tauri");
    assert.equal(status.sourceServicesRoot, fixture.sourceServicesRoot);

    const server = createTauriHostServer(config);
    server.listen(0, "127.0.0.1");
    await once(server, "listening");

    const address = server.address();
    assert.ok(address && typeof address !== "string");
    const baseUrl = `http://127.0.0.1:${address.port}`;

    try {
      const shellResponse = await fetch(`${baseUrl}/`);
      assert.equal(shellResponse.status, 200);
      const shellHtml = await shellResponse.text();
      assert.match(shellHtml, /Tauri-ready shell for Service Lasso/);
      assert.match(shellHtml, /<iframe title="Service Admin" src="\/admin\/"><\/iframe>/);

      const statusResponse = await fetch(`${baseUrl}/api/host-status`);
      assert.equal(statusResponse.status, 200);
      const statusBody = await statusResponse.json();
      assert.equal(statusBody.runtimeUrl, config.runtimeUrl);
      assert.equal(statusBody.adminDistRoot, fixture.adminDistRoot);
      assert.equal(statusBody.sourceServicesRoot, fixture.sourceServicesRoot);

      const assetResponse = await fetch(`${baseUrl}/admin/asset.js`);
      assert.equal(assetResponse.status, 200);
      assert.match(await assetResponse.text(), /admin asset/);

      const spaResponse = await fetch(`${baseUrl}/admin/missing/route`);
      assert.equal(spaResponse.status, 200);
      assert.match(await spaResponse.text(), /<title>admin<\/title>/);
    } finally {
      server.close();
      await once(server, "close");
    }
  } finally {
    await rm(fixture.root, { recursive: true, force: true });
  }
});
