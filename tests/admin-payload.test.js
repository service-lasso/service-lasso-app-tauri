import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { cp, lstat, mkdir, mkdtemp, readFile, readdir, realpath, rm, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stageAdminPayload } from "../scripts/admin-payload-lib.mjs";

test("NATIVE-1A repeated Admin preparation excludes stale extraction and destination files", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "admin-membership-"));
  try {
    const archive = path.join(root, "admin.zip");
    await cp(fileURLToPath(new URL("./fixtures/admin-membership.zip", import.meta.url)), archive);
    const digest = createHash("sha256").update(await readFile(archive)).digest("hex");
    const stale = path.join(root, ".tmp", "admin-2026.8.31-f015b44", "extracted", "dist");
    await mkdir(stale, { recursive: true });
    await writeFile(path.join(stale, "stale.js"), "stale extraction");
    for (let attempt = 0; attempt < 2; attempt += 1) {
      const destination = path.join(root, ".payload", "admin");
      await mkdir(destination, { recursive: true });
      await writeFile(path.join(destination, "obsolete.js"), "destination only");
      await stageAdminPayload({ repoRoot: root, archive, digest });
      assert.deepEqual((await readdir(destination)).sort(), ["assets", "index.html"]);
      assert.deepEqual(await readdir(path.join(destination, "assets")), ["current.js"]);
      assert.equal(await readFile(path.join(destination, "assets", "current.js"), "utf8"), "admitted asset");
      assert.equal(await readFile(path.join(stale, "stale.js"), "utf8"), "stale extraction");
      const packaged = path.join(root, `native-host-${attempt}`, ".payload", "admin");
      await cp(destination, packaged, { recursive: true });
      assert.deepEqual((await readdir(packaged)).sort(), ["assets", "index.html"]);
      assert.deepEqual(await readdir(path.join(packaged, "assets")), ["current.js"]);
    }
    await assert.rejects(stageAdminPayload({ repoRoot: root, archive, digest: "0".repeat(64) }), /checksum mismatch/);
    assert.equal(await readFile(path.join(root, ".payload", "admin", "index.html"), "utf8"), "admitted index");
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.equal((await lstat(root)).isSymbolicLink(), false);
    assert.equal(path.resolve(await realpath(root)), path.resolve(root));
    await rm(root, { recursive: true, force: true });
  }
});
