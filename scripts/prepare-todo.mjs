import { createHash } from "node:crypto";
import { mkdir, readFile, writeFile, access } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";
const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)),"..");
const releases = [
  ["lasso-todo","2026.10.4-9c6567f","todo","02ff28027ca88285f1d6cf482272b03a3638c0f9ec8b41bea624e48b1e49c956"],
  ["lasso-todo-api","2026.10.4-3e560cc","todo-api","f8beb39042f18c31d8ee3baba054e92071419610236ddc597220d9a140293998"],
  ["lasso-postgres","2026.10.4-1af7982","postgres","8c7554f638668c5df252249a36a9d58b6df83effb7a4f7de94e12767e388bb95"]
];
for (const [,,id] of releases) {
  let exists = false; try { await access(path.join(root,"services",id)); exists = true; } catch {}
  if (exists) throw Error(`Seed ${id} already exists; preserve it and configure it explicitly. Nothing changed.`);
}
const seeds = [];
for (const [repo,tag,id,digest] of releases) {
  const response = await fetch(`https://github.com/service-lasso/${repo}/releases/download/${tag}/service.json`);
  if (!response.ok) throw Error(`Manifest acquisition HTTP ${response.status}`);
  const bytes = Buffer.from(await response.arrayBuffer());
  if (createHash("sha256").update(bytes).digest("hex") !== digest) throw Error(`Manifest checksum mismatch: ${id}`);
  const manifest = JSON.parse(bytes);
  if (manifest.id !== id || manifest.artifact?.source?.repo !== `service-lasso/${repo}` || manifest.artifact.source.tag !== tag) throw Error(`Producer identity mismatch: ${id}`);
  delete manifest.artifact.source.channel;
  manifest.enabled = true;
  if (id === "todo") { manifest.depend_on = ["@node","todo-api"]; manifest.env.TODO_API_STATE = "${SERVICE_ROOT}/../todo-api/.state/runtime.json"; }
  if (id === "postgres") manifest.env.POSTGRES_DATABASES = "todo";
  if (manifest.healthchecks) { manifest.healthcheck = manifest.healthchecks[0]; delete manifest.healthchecks; }
  seeds.push(manifest);
}
for (const manifest of seeds) {
  await mkdir(path.join(root,"services",manifest.id),{recursive:true});
  await writeFile(path.join(root,"services",manifest.id,"service.json"),JSON.stringify(manifest,null,2)+"\n");
}
for (const id of ["@localcert","@nginx","@traefik","echo-service"]) {
  const target = path.join(root,"services",id,"service.json");
  const manifest = JSON.parse(await readFile(target)); manifest.enabled = false;
  await writeFile(target,JSON.stringify(manifest,null,2)+"\n");
}
console.log("Todo/API/PostgreSQL seeds added. Build the desktop app; install/configure/start them in its private workspace through Admin. No existing database or credentials were copied.");
