import { startApiServer } from "@service-lasso/service-lasso";
import { once } from "node:events";
import { resolveTauriConfig, validateTauriConfig } from "./config.js";
import { createTauriHostServer } from "./server.js";
import { prepareStarterServicesRoot } from "./services-root.js";

async function closeServer(server) {
  server.close();
  await once(server, "close");
}

async function main() {
  const config = await validateTauriConfig(resolveTauriConfig());

  console.log(`[app-tauri] booting Service Lasso runtime on ${config.runtimeUrl}`);
  console.log(`[app-tauri] servicesRoot=${config.servicesRoot}`);
  console.log(`[app-tauri] workspaceRoot=${config.workspaceRoot}`);

  const preparedServices = await prepareStarterServicesRoot(config);
  console.log(`[app-tauri] prepared Echo Service wrapper at ${preparedServices.wrapperManifestPath}`);
  console.log(`[app-tauri] tauri config target path ${config.tauriConfigPath}`);

  const runtime = await startApiServer({
    port: config.runtimePort,
    servicesRoot: config.servicesRoot,
    workspaceRoot: config.workspaceRoot,
  });

  const hostServer = createTauriHostServer(config);
  hostServer.listen(config.hostPort, "127.0.0.1");
  await once(hostServer, "listening");

  console.log(`[app-tauri] desktop-alt shell ready at ${config.hostUrl}`);
  console.log(`[app-tauri] admin UI embedded from ${config.adminUrl}`);
  console.log(`[app-tauri] runtime API ready at ${runtime.url}`);

  let stopping = false;

  async function shutdown(signal) {
    if (stopping) {
      return;
    }

    stopping = true;
    console.log(`[app-tauri] shutting down after ${signal}`);

    await closeServer(hostServer);
    await runtime.stop();
  }

  process.on("SIGINT", () => {
    void shutdown("SIGINT").finally(() => {
      process.exit(0);
    });
  });

  process.on("SIGTERM", () => {
    void shutdown("SIGTERM").finally(() => {
      process.exit(0);
    });
  });
}

await main();
