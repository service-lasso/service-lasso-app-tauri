import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, cp } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
export async function prepareAdmin() {
  const cache = path.join(root, ".tmp", "admin-2026.8.31-f015b44");
  const archive = path.join(cache, "admin.zip");
  const digest = "fe5e5fe01d1202f3874097e6223652d634c94677c765c5f82d20e6d274c0161c";
  await mkdir(cache, {recursive:true});
  let bytes;
  try { bytes = await readFile(archive); } catch {
    const response = await fetch("https://github.com/service-lasso/lasso-serviceadmin/releases/download/2026.8.31-f015b44/%40serviceadmin-win32.zip");
    if (!response.ok) throw Error(`Admin acquisition HTTP ${response.status}`);
    bytes = Buffer.from(await response.arrayBuffer());
  }
  if (createHash("sha256").update(bytes).digest("hex") !== digest) throw Error("Admin archive checksum mismatch");
  await writeFile(archive, bytes);
  const extracted = path.join(cache, "extracted");
  await mkdir(extracted, {recursive:true});
  execFileSync("tar", ["-xf", archive, "-C", extracted], {stdio:"inherit"});
  await readFile(path.join(extracted, "dist", "index.html"));
  await cp(path.join(extracted, "dist"), path.join(root, ".payload", "admin"), {recursive:true});
  return {tag:"2026.8.31-f015b44", sha256:digest};
}
if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) console.log(JSON.stringify(await prepareAdmin()));
