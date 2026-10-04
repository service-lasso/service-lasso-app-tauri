import { createHash, randomUUID } from "node:crypto";
import { lstat, mkdir, mkdtemp, readFile, readdir, realpath, rename } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";

async function assertPlainTree(root) {
  const entry = await lstat(root);
  if (entry.isSymbolicLink() || path.resolve(await realpath(root)) !== path.resolve(root)) {
    throw Error(`Admin staging must not traverse links: ${root}`);
  }
  if (entry.isDirectory()) {
    for (const name of await readdir(root)) await assertPlainTree(path.join(root, name));
  } else if (!entry.isFile()) throw Error(`Unsupported Admin entry: ${root}`);
}

export async function assertExistingPlainTree(target) {
  try { await assertPlainTree(target); } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
}

// Fresh extraction and rename publication prevent either cached or destination-only
// files from becoming part of the checksum-bound Admin payload. No recursive delete:
// old payloads and failed extraction attempts remain separate diagnostic evidence.
export async function stageAdminPayload({ repoRoot, archive, digest }) {
  const root = path.resolve(repoRoot);
  const rootEntry = await lstat(root);
  if (!rootEntry.isDirectory() || rootEntry.isSymbolicLink() || path.resolve(await realpath(root)) !== root) {
    throw Error("Admin repository root must not traverse links");
  }
  if (createHash("sha256").update(await readFile(archive)).digest("hex") !== digest) {
    throw Error("Admin archive checksum mismatch");
  }
  const cache = path.join(root, ".tmp");
  const payload = path.join(root, ".payload");
  await assertExistingPlainTree(cache);
  await assertExistingPlainTree(payload);
  await mkdir(cache, { recursive: true });
  await mkdir(payload, { recursive: true });
  const extraction = await mkdtemp(path.join(cache, "admin-extraction-"));
  const members = execFileSync("tar", ["-tf", archive], { encoding: "utf8" }).split(/\r?\n/).filter(Boolean);
  for (const member of members) {
    const normalized = member.replaceAll("\\", "/");
    if (normalized.startsWith("/") || /^[A-Za-z]:/.test(normalized) || normalized.split("/").includes("..")) {
      throw Error(`Unsafe Admin archive member: ${member}`);
    }
  }
  execFileSync("tar", ["-xf", archive, "-C", extraction], { stdio: "inherit" });
  await assertPlainTree(extraction);
  const dist = path.join(extraction, "dist");
  await readFile(path.join(dist, "index.html"));
  const destination = path.join(payload, "admin");
  await assertExistingPlainTree(destination);
  const retired = path.join(cache, `admin-retired-${randomUUID()}`);
  let hadDestination = false;
  try { await rename(destination, retired); hadDestination = true; } catch (error) {
    if (error.code !== "ENOENT") throw error;
  }
  try { await rename(dist, destination); } catch (error) {
    if (hadDestination) await rename(retired, destination);
    throw error;
  }
  return destination;
}
