import { cp, mkdir, readdir, readFile, writeFile, rm } from "node:fs/promises";
import { createHash } from "node:crypto";
import { execFileSync } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";
import { prepareAdmin } from "./prepare-admin.mjs";

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");
if (process.platform !== "win32" || process.arch !== "x64" || process.versions.node.split(".")[0] !== "22") throw Error("Native payload build requires Windows x64 and Node.js 22");
const output = path.resolve(root, ".native", "host");
if (!output.startsWith(root + path.sep) || output !== path.join(root, ".native", "host")) throw Error("Unsafe build output");
const admin = await prepareAdmin();
await rm(output, {recursive:true, force:true});
await mkdir(output, {recursive:true});
for (const name of ["package.json", "package-lock.json", "src"]) await cp(path.join(root,name),path.join(output,name),{recursive:true});
await cp(process.execPath, path.join(output,"node.exe"));
await cp(path.join(root,".payload","admin"),path.join(output,".payload","admin"),{recursive:true});
const seeds = [];
for (const entry of await readdir(path.join(root,"services"), {withFileTypes:true})) {
  if (!entry.isDirectory() || entry.isSymbolicLink()) continue;
  const bytes = await readFile(path.join(root,"services",entry.name,"service.json"));
  const manifest = JSON.parse(bytes);
  await mkdir(path.join(output,"services",entry.name),{recursive:true});
  await writeFile(path.join(output,"services",entry.name,"service.json"),bytes);
  seeds.push({id:manifest.id, sha256:createHash("sha256").update(bytes).digest("hex")});
}
const npmCli = path.join(path.dirname(process.execPath),"node_modules","npm","bin","npm-cli.js");
execFileSync(process.execPath,[npmCli,"ci","--omit=dev","--ignore-scripts"],{cwd:output,stdio:"inherit"});
const core = JSON.parse(await readFile(path.join(output,"node_modules","@service-lasso","service-lasso","package.json")));
const receipt = {node:process.version,nodeSha256:createHash("sha256").update(await readFile(process.execPath)).digest("hex"),core:core.version,admin,seeds,mode:"bootstrap-download",workspaceIncluded:false};
await writeFile(path.join(output,"native-payload.json"),JSON.stringify(receipt,null,2)+"\n");
console.log(JSON.stringify(receipt));
