import { startApiServer } from "@service-lasso/service-lasso";
import { once } from "node:events";
import { createInterface } from "node:readline";
import { resolveTauriConfig, validateTauriConfig } from "./config.js";
import { createTauriHostServer } from "./server.js";
import { createAdminServer } from "./admin-server.js";
import { prepareStarterServicesRoot } from "./services-root.js";

async function closeServer(server) {
  if (!server?.listening) return;
  const closed = once(server,"close"); server.close(); server.closeAllConnections(); await closed;
}

async function main() {
  let runtime, hostServer, adminServer, shutdownPromise, shutdownRequested = false;
  async function shutdown(reason) {
    shutdownRequested = true;
    if (!runtime) return;
    if (!shutdownPromise) shutdownPromise = (async () => {
      console.log(`[app-tauri] shutting down after ${reason}`);
      await closeServer(hostServer); await closeServer(adminServer); await runtime.stop();
    })();
    await shutdownPromise;
  }
  async function requestShutdown(reason) {
    try { await shutdown(reason); if (runtime) process.exit(0); }
    catch { console.error("[app-tauri] graceful shutdown failed; inspect retained workspace"); process.exitCode = 1; }
  }
  process.on("SIGINT",()=>void requestShutdown("SIGINT"));
  process.on("SIGTERM",()=>void requestShutdown("SIGTERM"));
  if (process.env.SERVICE_LASSO_NATIVE_CHILD === "1") {
    const input = createInterface({input:process.stdin});
    input.on("line",line=> { if (line === "shutdown") void requestShutdown("native close"); });
    input.on("close",()=>void requestShutdown("parent pipe closed"));
  }
  const config = await validateTauriConfig(resolveTauriConfig());
  console.log(`[app-tauri] servicesRoot=${config.servicesRoot}`);
  console.log(`[app-tauri] workspaceRoot=${config.workspaceRoot}`);
  await prepareStarterServicesRoot(config);
  if (shutdownRequested) return;
  runtime = await startApiServer({port:config.runtimePort, host:"127.0.0.1",servicesRoot:config.servicesRoot,workspaceRoot:config.workspaceRoot});
  try {
  if (shutdownRequested) { await requestShutdown("startup cancelled"); return; }
  config.runtimeUrl = runtime.url;
  adminServer = createAdminServer(config); adminServer.listen(0,"127.0.0.1"); await once(adminServer,"listening");
  config.adminUrl = `http://127.0.0.1:${adminServer.address().port}/`;
  config.adminStandalone = true;
  hostServer = createTauriHostServer(config); hostServer.listen(config.hostPort,"127.0.0.1"); await once(hostServer,"listening");
  console.log(`[app-tauri] desktop shell ready at ${config.hostUrl}`);
  if (process.env.SERVICE_LASSO_NATIVE_CHILD === "1") console.log(`SL_NATIVE_READY:${JSON.stringify({pid:process.pid,hostUrl:config.hostUrl})}`);
  } catch (error) {
    await shutdown("host startup failed");
    throw error;
  }
}
await main();
