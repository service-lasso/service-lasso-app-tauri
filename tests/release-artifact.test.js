import test from "node:test";
import assert from "node:assert/strict";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { rm } from "node:fs/promises";
import {
  createTemporaryOutputRoot,
  readRootPackageJson,
  stageReleaseArtifact,
  verifyStagedArtifact,
} from "../scripts/release-artifact-lib.mjs";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

test("starter release artifact can be staged and verified", async () => {
  const outputRoot = await createTemporaryOutputRoot();

  try {
    const packageJson = await readRootPackageJson(repoRoot);
    const packageSuffix = packageJson.name.split("/").at(-1);
    const staged = await stageReleaseArtifact({
      repoRoot,
      outputRoot,
    });

    assert.match(staged.artifactName, new RegExp(`^${packageSuffix}-\\d+\\.\\d+\\.\\d+$`));
    assert.equal(staged.manifest.artifactKind, "starter-template-source");

    const verified = await verifyStagedArtifact({
      repoRoot,
      artifactRoot: staged.artifactRoot,
      archivePath: staged.archivePath,
    });

    assert.equal(verified.artifactName, staged.artifactName);
  } finally {
    await rm(outputRoot, { recursive: true, force: true });
  }
});
