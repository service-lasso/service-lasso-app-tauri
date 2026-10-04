import test from "node:test";
import assert from "node:assert/strict";
import { createHash } from "node:crypto";
import { lstat, mkdir, mkdtemp, open, readFile, readdir, realpath, rm, symlink, unlink, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { stageAdminPayload } from "../scripts/admin-payload-lib.mjs";
import { ADMIN_ZIP_LIMITS } from "../scripts/admin-zip-lib.mjs";
import { zipFixture } from "./admin-zip-fixtures.js";

async function fixture(run) {
  const temporaryParent = await realpath(os.tmpdir());
  const root = await realpath(await mkdtemp(path.join(temporaryParent, "admin-zip-")));
  try { await run(root); } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(temporaryParent) + path.sep));
    assert.equal((await lstat(root)).isSymbolicLink(), false);
    assert.equal(path.resolve(await realpath(root)), path.resolve(root));
    await rm(root, { recursive: true, force: true });
  }
}

async function stage(root, bytes) {
  const archive = path.join(root, "admin.zip");
  await writeFile(archive, bytes);
  return stageAdminPayload({ repoRoot: root, archive, digest: createHash("sha256").update(bytes).digest("hex") });
}

test("NATIVE-1B original checksum-bound release ZIP stages all 188 dist files", () => fixture(async root => {
  const bytes = await readFile(new URL("./fixtures/admin-release-2026.8.31-f015b44.zip", import.meta.url));
  assert.equal(createHash("sha256").update(bytes).digest("hex"), "fe5e5fe01d1202f3874097e6223652d634c94677c765c5f82d20e6d274c0161c");
  const destination = await stage(root, bytes);
  let count = 0;
  const pending = [destination];
  while (pending.length) {
    for (const entry of await readdir(pending.pop(), { withFileTypes: true })) {
      assert.equal(entry.isSymbolicLink(), false);
      if (entry.isDirectory()) pending.push(path.join(entry.parentPath, entry.name));
      else { assert.equal(entry.isFile(), true); count += 1; }
    }
  }
  assert.equal(count, 188);
  assert.equal((await readFile(path.join(destination, "index.html"))).length, 4151);
  await assert.rejects(lstat(path.join(destination, "runtime")), { code: "ENOENT" });
}));

test("NATIVE-1B genuine stored/deflated ZIP and descriptors publish exact dist membership", () => fixture(async root => {
  const destination = await stage(root, zipFixture([
    { name: "./", method: 0 },
    { name: "./dist/", method: 0 },
    { name: "./dist/index.html", data: "index", method: 0 },
    { name: "./dist/assets/" },
    { name: "./dist/assets/app.js", data: "asset", descriptor: true },
    { name: "./release.txt", data: "original non-dist member" },
  ]));
  assert.equal(destination, path.join(root, ".payload", "admin"));
  assert.deepEqual((await readdir(destination)).sort(), ["assets", "index.html"]);
  assert.equal(await readFile(path.join(destination, "assets", "app.js"), "utf8"), "asset");
  const [extraction] = await readdir(path.join(root, ".tmp"));
  assert.deepEqual(await readdir(path.join(root, ".tmp", extraction)), ["release.txt"]);
  assert.equal(await readFile(path.join(root, ".tmp", extraction, "release.txt"), "utf8"), "original non-dist member");
}));

test("NATIVE-1B unsafe original names, links, collisions and size limits never replace prior payload", () => fixture(async root => {
  const original = { name: "dist/index.html", data: "prior" };
  await stage(root, zipFixture([original]));
  await writeFile(path.join(root, "outside.txt"), "retained outside");
  const cases = [
    [{ name: "../outside.txt", data: "overwrite" }],
    [{ name: "/absolute.txt" }],
    [{ name: "C:/escape.txt" }],
    [{ name: "dist\\escape.txt" }],
    [{ name: "dist/./escape.txt" }],
    [{ name: "dist/name:stream" }],
    [{ name: "dist/NUL.txt" }],
    [{ name: "dist/trailing. " }],
    [{ name: "dist/" + "a/".repeat(ADMIN_ZIP_LIMITS.depth) + "file" }],
    [{ name: "dist/link", data: "outside.txt", attributes: 0xa1ff0000 }],
    [{ name: "dist/device", attributes: 0x21a40000 }],
    [{ name: "dist/index.html", data: "other" }, { name: "dist/index.html" }],
    [{ name: "dist/asset" }, { name: "DIST/other" }],
    [{ name: "dist/file" }, { name: "dist/file/child" }],
    [{ name: "dist/index.html", localName: "dist/other.html" }],
    [{ name: "dist/index.html", size: ADMIN_ZIP_LIMITS.memberBytes + 1 }],
    Array.from({ length: 5 }, (_, index) => ({ name: `dist/limit-${index}`, size: ADMIN_ZIP_LIMITS.memberBytes })),
    Array.from({ length: ADMIN_ZIP_LIMITS.members + 1 }, (_, index) => ({ name: `dist/count-${index}`, method: 0 })),
  ];
  for (const entries of cases) {
    await assert.rejects(stage(root, zipFixture(entries)), /Invalid Admin ZIP/);
    assert.equal(await readFile(path.join(root, ".payload", "admin", "index.html"), "utf8"), "prior");
    assert.equal(await readFile(path.join(root, "outside.txt"), "utf8"), "retained outside");
  }
  assert.equal((await readdir(path.join(root, ".tmp"))).length, 1);
}));

test("NATIVE-1B corrupt contents, inflated-size lies and truncated ZIP retain failed stages and prior payload", () => fixture(async root => {
  await stage(root, zipFixture([{ name: "dist/index.html", data: "prior" }]));
  const before = await readdir(path.join(root, ".tmp"));
  for (const entry of [
    { name: "dist/index.html", data: "bad checksum", crc: 0 },
    { name: "dist/index.html", data: "x".repeat(1024), size: 1 },
    { name: "dist/index.html", data: "stored", size: 1, method: 0 },
  ]) {
    await assert.rejects(stage(root, zipFixture([entry])));
    assert.equal(await readFile(path.join(root, ".payload", "admin", "index.html"), "utf8"), "prior");
  }
  assert.equal((await readdir(path.join(root, ".tmp"))).length, before.length + 3);
  const valid = zipFixture([{ name: "dist/index.html", data: "new" }]);
  await assert.rejects(stage(root, valid.subarray(0, valid.length - 1)), /Invalid Admin ZIP/);
  assert.equal(await readFile(path.join(root, ".payload", "admin", "index.html"), "utf8"), "prior");
}));

test("NATIVE-1B bounded archive reads reject oversize before allocation", () => fixture(async root => {
  const archive = path.join(root, "oversize.zip");
  const handle = await open(archive, "wx");
  try { await handle.truncate(ADMIN_ZIP_LIMITS.archiveBytes + 1); } finally { await handle.close(); }
  await assert.rejects(stageAdminPayload({ repoRoot: root, archive, digest: "0".repeat(64) }), /bounded plain file/);
  await assert.rejects(lstat(path.join(root, ".tmp")), { code: "ENOENT" });
}));

test("NATIVE-1B linked cache is refused and retained target stays unchanged", () => fixture(async root => {
  const retained = path.join(root, "retained");
  await mkdir(retained);
  await writeFile(path.join(retained, "sentinel"), "retained");
  const link = path.join(root, ".tmp");
  await symlink(retained, link, process.platform === "win32" ? "junction" : "dir");
  try {
    await assert.rejects(stage(root, zipFixture([{ name: "dist/index.html", data: "new" }])), /must not traverse links/);
    assert.deepEqual(await readdir(retained), ["sentinel"]);
    assert.equal(await readFile(path.join(retained, "sentinel"), "utf8"), "retained");
  } finally { await unlink(link); }
}));
