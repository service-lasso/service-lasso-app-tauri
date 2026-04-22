import { cp, mkdir, mkdtemp, readFile, rm, stat, writeFile } from "node:fs/promises";
import { spawn } from "node:child_process";
import net from "node:net";
import os from "node:os";
import path from "node:path";

const CANDIDATE_RELEASE_PATHS = [
  ".gitignore",
  ".npmrc",
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

const NPM_COMMAND = process.platform === "win32" ? "npm.cmd" : "npm";

function escapeWindowsCmdArg(value) {
  if (/^[A-Za-z0-9_./:=@\\-]+$/.test(value)) {
    return value;
  }

  return `"${value.replace(/"/g, '""')}"`;
}

async function runNpmCommand(args, options = {}) {
  if (process.platform !== "win32") {
    return runCommand(NPM_COMMAND, args, options);
  }

  const comspec = process.env.ComSpec ?? "cmd.exe";
  const commandLine = [NPM_COMMAND, ...args].map(escapeWindowsCmdArg).join(" ");

  return runCommand(comspec, ["/d", "/s", "/c", commandLine], options);
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

async function getLocalCorePackageArchive(repoRoot) {
  const coreRepoRoot = path.resolve(repoRoot, "..", "service-lasso");

  if (!(await pathExists(path.join(coreRepoRoot, "package.json")))) {
    return null;
  }

  const corePackageJson = JSON.parse(await readFile(path.join(coreRepoRoot, "package.json"), "utf8"));
  const version = corePackageJson.version;
  const artifactRoot = path.join(coreRepoRoot, "artifacts", "npm", `service-lasso-package-${version}`);
  const archivePath = path.join(artifactRoot, `service-lasso-service-lasso-${version}.tgz`);

  if (!(await pathExists(archivePath))) {
    await runNpmCommand(["run", "package:stage"], {
      cwd: coreRepoRoot,
      env: process.env,
    });
  }

  await stat(archivePath);
  return archivePath;
}

async function installStarterDependencies(stagedRoot, repoRoot) {
  const localCorePackageArchive = await getLocalCorePackageArchive(repoRoot);

  if (localCorePackageArchive) {
    await runNpmCommand(["install", localCorePackageArchive], {
      cwd: stagedRoot,
      env: process.env,
    });
    return;
  }

  await runNpmCommand(["install"], {
    cwd: stagedRoot,
    env: process.env,
  });
}

async function createVerificationSiblingFixtures(stagedRoot) {
  const siblingRoot = path.resolve(stagedRoot, "..");
  const adminDistRoot = path.join(siblingRoot, "lasso-@serviceadmin", "dist");
  const echoServiceRoot = path.join(siblingRoot, "lasso-echoservice");

  await mkdir(adminDistRoot, { recursive: true });
  await mkdir(echoServiceRoot, { recursive: true });
  await writeFile(path.join(adminDistRoot, "index.html"), "<!doctype html><title>serviceadmin</title>", "utf8");
  await writeFile(
    path.join(echoServiceRoot, "service.json"),
    `${JSON.stringify(
      {
        id: "echo-service",
        name: "Echo Service",
        description: "Verification harness service for the tauri starter artifact.",
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

  return {
    siblingRoot,
    adminDistRoot,
    echoServiceRoot,
  };
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function reserveLoopbackPort() {
  return new Promise((resolve, reject) => {
    const server = net.createServer();

    server.once("error", reject);
    server.listen(0, "127.0.0.1", () => {
      const address = server.address();
      if (!address || typeof address === "string") {
        server.close(() => reject(new Error("failed to reserve loopback port")));
        return;
      }

      const { port } = address;
      server.close((closeError) => {
        if (closeError) {
          reject(closeError);
          return;
        }

        resolve(String(port));
      });
    });
  });
}

async function waitForJson(url, timeoutMs = 15000) {
  const startedAt = Date.now();
  let lastError = null;

  while (Date.now() - startedAt < timeoutMs) {
    try {
      const response = await fetch(url);
      if (response.ok) {
        return await response.json();
      }
      lastError = new Error(`unexpected status ${response.status} from ${url}`);
    } catch (error) {
      lastError = error;
    }

    await sleep(250);
  }

  throw lastError ?? new Error(`timed out waiting for ${url}`);
}

async function smokeStarterHost(stagedRoot, env) {
  return new Promise((resolve, reject) => {
    const entrypoint = path.join(stagedRoot, "src", "index.js");
    const child = spawn(process.execPath, [entrypoint], {
      cwd: stagedRoot,
      env,
      stdio: ["ignore", "pipe", "pipe"],
    });

    let stdout = "";
    let stderr = "";
    let settled = false;
    let shutdownExpected = false;
    const closePromise = new Promise((innerResolve) => {
      child.once("close", (code, signal) => {
        innerResolve({ code, signal });
      });
    });

    const finish = (callback) => {
      if (settled) {
        return;
      }
      settled = true;
      callback();
    };

    child.stdout?.on("data", (chunk) => {
      stdout += chunk.toString();
    });

    child.stderr?.on("data", (chunk) => {
      stderr += chunk.toString();
    });

    child.on("error", (error) => {
      finish(() => reject(error));
    });

    child.on("close", (code) => {
      if (settled || shutdownExpected) {
        return;
      }

      finish(() =>
        reject(
          new Error(`${process.execPath} ${entrypoint} exited early with code ${code}\nstdout:\n${stdout}\nstderr:\n${stderr}`),
        ),
      );
    });

    void (async () => {
      try {
        const hostStatus = await waitForJson(`http://127.0.0.1:${env.SERVICE_LASSO_APP_TAURI_PORT}/api/host-status`);
        const runtimeHealth = await waitForJson(`http://127.0.0.1:${env.SERVICE_LASSO_API_PORT}/api/health`);

        shutdownExpected = true;
        child.kill("SIGINT");
        const { code, signal } = await closePromise;

        finish(() => {
          if (code !== 0 && signal !== "SIGINT" && signal !== "SIGTERM") {
            reject(
              new Error(
                `${process.execPath} ${entrypoint} exited with code ${code} and signal ${signal}\nstdout:\n${stdout}\nstderr:\n${stderr}`,
              ),
            );
            return;
          }

          resolve({
            stdout,
            stderr,
            hostStatus,
            runtimeHealth,
          });
        });
      } catch (error) {
        shutdownExpected = true;
        child.kill("SIGTERM");
        finish(() => reject(error));
      }
    })();
  });
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
  const fixtures = await createVerificationSiblingFixtures(stagedRoot);
  const hostPort = await reserveLoopbackPort();
  const runtimePort = await reserveLoopbackPort();
  await installStarterDependencies(stagedRoot, repoRoot);
  const result = await smokeStarterHost(stagedRoot, {
    ...process.env,
    SERVICE_LASSO_APP_TAURI_PORT: hostPort,
    SERVICE_LASSO_API_PORT: runtimePort,
    SERVICE_LASSO_APP_TAURI_ADMIN_DIST_ROOT: fixtures.adminDistRoot,
    SERVICE_LASSO_APP_TAURI_ECHO_SERVICE_ROOT: fixtures.echoServiceRoot,
    SERVICE_LASSO_SERVICES_ROOT: path.join(stagedRoot, ".workspace", "services"),
    SERVICE_LASSO_WORKSPACE_ROOT: path.join(stagedRoot, ".workspace", "runtime"),
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
