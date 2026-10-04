import test from "node:test";
import assert from "node:assert/strict";
import { mkdtemp, mkdir, readFile, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { prepareStarterServicesRoot } from "../src/services-root.js";

test("desktop restart preserves changed manifest and retained data while adding new seeds", async () => {
  const root = await mkdtemp(path.join(tmpdir(), "tauri-retained-"));
  const sourceServicesRoot = path.join(root,"seed"), servicesRoot = path.join(root,"workspace");
  await mkdir(path.join(sourceServicesRoot,"todo"),{recursive:true});
  await mkdir(path.join(servicesRoot,"todo","data"),{recursive:true});
  await writeFile(path.join(sourceServicesRoot,"todo","service.json"),'{"id":"todo","enabled":true}');
  await writeFile(path.join(servicesRoot,"todo","service.json"),'{"id":"todo","enabled":false}');
  await writeFile(path.join(servicesRoot,"todo","data","todos.json"),'[{"id":"original"}]');
  await mkdir(path.join(sourceServicesRoot,"api"),{recursive:true});
  await writeFile(path.join(sourceServicesRoot,"api","service.json"),'{"id":"api"}');
  await prepareStarterServicesRoot({sourceServicesRoot,servicesRoot});
  await prepareStarterServicesRoot({sourceServicesRoot,servicesRoot});
  assert.equal(JSON.parse(await readFile(path.join(servicesRoot,"todo","service.json"))).enabled,false);
  assert.equal(JSON.parse(await readFile(path.join(servicesRoot,"todo","data","todos.json")))[0].id,"original");
  assert.equal(JSON.parse(await readFile(path.join(servicesRoot,"api","service.json"))).id,"api");
});
