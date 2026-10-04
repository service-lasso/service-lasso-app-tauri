import test from "node:test";
import assert from "node:assert/strict";
import { createServer } from "node:http";
import { once } from "node:events";
import { mkdtemp,mkdir,writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import path from "node:path";
import { createAdminServer } from "../src/admin-server.js";

test("standalone Admin serves root SPA assets and forwards auth unchanged while refusing other origins", async () => {
  const root = await mkdtemp(path.join(tmpdir(),"tauri-admin-"));
  await mkdir(path.join(root,"assets"));
  await writeFile(path.join(root,"index.html"),'<script src="/assets/app.js"></script>');
  await writeFile(path.join(root,"assets","app.js"),'console.log("real asset route")');
  let calls = 0;
  const core = createServer((request,response)=> { calls++; response.setHeader("content-type","application/json"); response.end(JSON.stringify({authorization:request.headers.authorization ?? null})); });
  core.listen(0,"127.0.0.1"); await once(core,"listening");
  const admin = createAdminServer({adminDistRoot:root,runtimeUrl:`http://127.0.0.1:${core.address().port}`});
  admin.listen(0,"127.0.0.1"); await once(admin,"listening");
  const base = `http://127.0.0.1:${admin.address().port}`;
  try {
    assert.match(await (await fetch(base+"/")).text(),/assets\/app.js/);
    assert.match(await (await fetch(base+"/dashboard")).text(),/assets\/app.js/);
    assert.equal((await fetch(base+"/assets/app.js")).status,200);
    assert.equal((await fetch(base+"/assets/missing.js")).status,404);
    assert.equal((await (await fetch(base+"/api/dashboard",{headers:{origin:base,authorization:"Bearer fixture"}})).json()).authorization,"Bearer fixture");
    assert.equal((await (await fetch(base+"/api/dashboard")).json()).authorization,null);
    assert.equal((await fetch(base+"/api/dashboard",{headers:{origin:"https://other.example"}})).status,403);
    assert.equal(calls,2);
  } finally { admin.closeAllConnections(); admin.close(); core.closeAllConnections(); core.close(); }
});
