import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import os from "node:os";
import path from "node:path";

const CANDIDATE_RELEASE_PATHS = [
  ".gitignore",
  ".github",
  "README.md",
  "package.json",
  "package-lock.json",
  "src",
  "src-tauri",
  "docs",
  "scripts",
  "tests",
];

export async function readRootPackageJson(repoRoot) {
  return JSON.parse(await readFile(path.join(repoRoot, "package.json"), "utf8"));
}

export async function getReleaseVersion(repoRoot) {
  const packageJson = await readRootPackageJson(repoRoot);
  return packageJson.version;
}

export async function getArtifactName(repoRoot, version) {
  const packageJson = await readRootPackageJson(repoRoot);
  const packageSuffix = packageJson.name.split("/").at(-1);
  return `${packageSuffix}-${version}`;
}

async function pathExists(targetPath) {
  try {
    await stat(targetPath);
    return true;
  } catch {
    return false;
  }
}

export async function getReleaseFiles(repoRoot) {
  const releaseFiles = [];

  for (const relativePath of CANDIDATE_RELEASE_PATHS) {
    if (await pathExists(path.join(repoRoot, relativePath))) {
      releaseFiles.push(relativePath);
    }
  }

  return releaseFiles;
}

async function runCommand(command, args, options = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(command, args, {
      stdio: ["ignore", "pipe", "pipe"],
      ...options,
    });

    let stdout = "";
    let stderr = "";

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", reject);
    child.on("close", (code) => {
      if (code === 0) {
        resolve({ stdout, stderr });
        return;
      }

      reject(
        new Error(
          `${command} ${args.join(" ")} failed with exit code ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
        ),
      );
    });
  });
}

async function copyReleasePath(repoRoot, artifactRoot, relativePath) {
  const sourcePath = path.join(repoRoot, relativePath);
  const targetPath = path.join(artifactRoot, relativePath);

  await mkdir(path.dirname(targetPath), { recursive: true });
  await cp(sourcePath, targetPath, { recursive: true });
}

async function writeReleaseManifest({ repoRoot, artifactRoot, artifactName, version, releaseFiles }) {
  const packageJson = await readRootPackageJson(repoRoot);
  const manifest = {
    artifactName,
    version,
    packageName: packageJson.name,
    artifactKind: "starter-template-source",
    shippedFiles: releaseFiles,
    entrypoint: "src/index.js",
    notes: [
      "This artifact is a starter-template source bundle.",
      "It is not yet a built production application artifact.",
    ],
  };

  await writeFile(
    path.join(artifactRoot, "release-artifact.json"),
    `${JSON.stringify(manifest, null, 2)}\n`,
    "utf8",
  );

  return manifest;
}

async function createReleaseArchive(outputRoot, artifactName) {
  const archivePath = path.join(outputRoot, `${artifactName}.tar.gz`);
  await rm(archivePath, { force: true });
  await runCommand("tar", ["-czf", archivePath, "-C", outputRoot, artifactName]);
  return archivePath;
}

export async function stageReleaseArtifact({ repoRoot, outputRoot = path.join(repoRoot, "artifacts"), version } = {}) {
  const resolvedVersion = version ?? (await getReleaseVersion(repoRoot));
  const artifactName = await getArtifactName(repoRoot, resolvedVersion);
  const artifactRoot = path.join(outputRoot, artifactName);
  const releaseFiles = await getReleaseFiles(repoRoot);

  await rm(artifactRoot, { recursive: true, force: true });
  await mkdir(outputRoot, { recursive: true });

  for (const relativePath of releaseFiles) {
    await copyReleasePath(repoRoot, artifactRoot, relativePath);
  }

  const manifest = await writeReleaseManifest({
    repoRoot,
    artifactRoot,
    artifactName,
    version: resolvedVersion,
    releaseFiles,
  });
  const archivePath = await createReleaseArchive(outputRoot, artifactName);

  return {
    artifactName,
    artifactRoot,
    archivePath,
    manifest,
  };
}

export async function verifyStagedArtifact({ repoRoot, artifactRoot, archivePath, version } = {}) {
  const resolvedVersion = version ?? (await getReleaseVersion(repoRoot));
  const artifactName = await getArtifactName(repoRoot, resolvedVersion);
  const stagedRoot = artifactRoot ?? path.join(repoRoot, "artifacts", artifactName);
  const stagedArchivePath = archivePath ?? path.join(repoRoot, "artifacts", `${artifactName}.tar.gz`);
  const releaseFiles = await getReleaseFiles(repoRoot);

  await stat(stagedArchivePath);
  await stat(path.join(stagedRoot, "release-artifact.json"));

  for (const relativePath of releaseFiles) {
    await stat(path.join(stagedRoot, relativePath));
  }

  const packageJson = await readRootPackageJson(repoRoot);
  const expectedNeedle = packageJson.name.split("/").at(-1);
  const result = await runCommand(process.execPath, [path.join(stagedRoot, "src", "index.js")], {
    cwd: stagedRoot,
    env: process.env,
  });

  if (!result.stdout.includes(expectedNeedle)) {
    throw new Error(`staged starter output did not include expected repo marker: ${expectedNeedle}`);
  }

  return {
    artifactName,
    stagedRoot,
    stagedArchivePath,
    smoke: result.stdout,
  };
}

export async function createTemporaryOutputRoot(prefix = "service-lasso-template-release-") {
  return mkdtemp(path.join(os.tmpdir(), prefix));
}
