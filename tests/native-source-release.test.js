import test from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { cp, lstat, mkdir, mkdtemp, readFile, realpath, rm, stat, writeFile } from "node:fs/promises";
import os from "node:os";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { stageReleaseArtifacts } from "../scripts/release-artifact-lib.mjs";

test("NATIVE-3A all legacy artifact trees and archives exclude native compiler outputs", async () => {
  const root = await mkdtemp(path.join(os.tmpdir(), "native-source-release-"));
  const repoRoot = path.join(root, "repo");
  const original = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
  try {
    await mkdir(repoRoot);
    for (const name of ["package.json", "package-lock.json", "src", "src-tauri", "services", "docs", "scripts", "tests", "desktop"]) {
      await cp(path.join(original, name), path.join(repoRoot, name), { recursive: true });
    }
    for (const directory of ["target/release", "gen/schemas", "build"]) {
      await mkdir(path.join(repoRoot, "src-tauri", directory), { recursive: true });
      await writeFile(path.join(repoRoot, "src-tauri", directory, "compiler-sentinel.bin"), "must never ship");
    }
    const staged = await stageReleaseArtifacts({ repoRoot, outputRoot: path.join(root, "artifacts") });
    for (const artifact of Object.values(staged.artifacts)) {
      for (const directory of ["target", "gen", "build"]) {
        await assert.rejects(stat(path.join(artifact.artifactRoot, "src-tauri", directory)), { code: "ENOENT" });
      }
      const members = execFileSync("tar", ["-tzf", artifact.archivePath], { encoding: "utf8" }).replaceAll("\\", "/");
      assert.doesNotMatch(members, /src-tauri\/(?:target|gen|build)\//);
      for (const name of ["Cargo.toml", "Cargo.lock", "build.rs", "tauri.conf.json", "src/main.rs", "icons/icon.ico"]) {
        assert.deepEqual(await readFile(path.join(artifact.artifactRoot, "src-tauri", name)), await readFile(path.join(repoRoot, "src-tauri", name)));
        assert.ok(members.includes(`/src-tauri/${name}`));
      }
    }
  } finally {
    assert.ok(path.resolve(root).startsWith(path.resolve(os.tmpdir()) + path.sep));
    assert.equal((await lstat(root)).isSymbolicLink(), false);
    assert.equal(path.resolve(await realpath(root)), path.resolve(root));
    await rm(root, { recursive: true, force: true });
  }
});
