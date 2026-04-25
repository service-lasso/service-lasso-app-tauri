import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm, stat } from "node:fs/promises";
import {
  createTemporaryOutputRoot,
  readRootPackageJson,
  stageReleaseArtifacts,
  verifyStagedArtifacts,
} from "../scripts/release-artifact-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("starter release artifacts can be staged and verified", async () => {
  const outputRoot = await createTemporaryOutputRoot();

  try {
    const packageJson = await readRootPackageJson(repoRoot);
    const packageSuffix = packageJson.name.split("/").at(-1);
    const staged = await stageReleaseArtifacts({
      repoRoot,
      outputRoot,
    });

    assert.match(staged.baseName, new RegExp(`^${packageSuffix}-\\d+\\.\\d+\\.\\d+$`));
    assert.equal(staged.artifacts.source.manifest.artifactKind, "starter-template-source");
    assert.equal(staged.artifacts.runtime.manifest.artifactKind, "runnable-bootstrap-download");
    assert.equal(staged.artifacts.bundled.manifest.artifactKind, "runnable-bundled");
    await stat(
      path.join(
        staged.artifacts.bundled.artifactRoot,
        "services",
        "echo-service",
        ".state",
        "artifacts",
        "2026.4.20-a417abd",
        process.platform === "win32"
          ? "echo-service-win32.zip"
          : process.platform === "darwin"
            ? "echo-service-darwin.tar.gz"
            : "echo-service-linux.tar.gz",
      ),
    );

    const verified = await verifyStagedArtifacts({
      repoRoot,
      staged,
    });

    assert.equal(verified.baseName, staged.baseName);
    assert.ok(verified.artifacts.runtime.verification.archiveDownloads >= 1);
    assert.equal(verified.artifacts.bundled.verification.archiveDownloads, 0);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});

test("starter release artifacts respect SERVICE_LASSO_RELEASE_VERSION when provided", async () => {
  const outputRoot = await createTemporaryOutputRoot();
  const previousVersion = process.env.SERVICE_LASSO_RELEASE_VERSION;
  process.env.SERVICE_LASSO_RELEASE_VERSION = "2026.4.23-abcdef1";

  try {
    const packageJson = await readRootPackageJson(repoRoot);
    const packageSuffix = packageJson.name.split("/").at(-1);
    const staged = await stageReleaseArtifacts({
      repoRoot,
      outputRoot,
    });

    assert.equal(staged.baseName, `${packageSuffix}-2026.4.23-abcdef1`);
  } finally {
    if (previousVersion === undefined) {
      delete process.env.SERVICE_LASSO_RELEASE_VERSION;
    } else {
      process.env.SERVICE_LASSO_RELEASE_VERSION = previousVersion;
    }

    await rm(outputRoot, { recursive: true, force: true });
  }
});
