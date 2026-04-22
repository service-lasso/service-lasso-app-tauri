import path from "node:path";
import { access } from "node:fs/promises";
import { fileURLToPath } from "node:url";

const repoRoot = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "..");

export function resolveTauriConfig(options = {}) {
  const rootDir = options.repoRoot ?? repoRoot;
  const siblingRoot = options.siblingRoot ?? path.resolve(rootDir, "..");
  const hostPort = options.hostPort ?? Number(process.env.SERVICE_LASSO_APP_TAURI_PORT ?? 19160);
  const runtimePort = options.runtimePort ?? Number(process.env.SERVICE_LASSO_API_PORT ?? 18081);
  const adminDistRoot =
    options.adminDistRoot ??
    process.env.SERVICE_LASSO_APP_TAURI_ADMIN_DIST_ROOT ??
    path.join(siblingRoot, "lasso-@serviceadmin", "dist");
  const workspaceBaseRoot =
    options.workspaceBaseRoot ??
    process.env.SERVICE_LASSO_APP_TAURI_WORKSPACE_BASE_ROOT ??
    path.join(rootDir, ".workspace");
  const workspaceRoot =
    options.workspaceRoot ??
    process.env.SERVICE_LASSO_WORKSPACE_ROOT ??
    path.join(workspaceBaseRoot, "runtime");
  const servicesRoot =
    options.servicesRoot ??
    process.env.SERVICE_LASSO_SERVICES_ROOT ??
    path.join(workspaceBaseRoot, "services");
  const echoServiceRoot =
    options.echoServiceRoot ??
    process.env.SERVICE_LASSO_APP_TAURI_ECHO_SERVICE_ROOT ??
    path.join(siblingRoot, "lasso-echoservice");

  return {
    repoRoot: rootDir,
    siblingRoot,
    workspaceBaseRoot,
    hostPort,
    runtimePort,
    hostUrl: `http://127.0.0.1:${hostPort}`,
    runtimeUrl: `http://127.0.0.1:${runtimePort}`,
    adminDistRoot,
    adminUrl: `http://127.0.0.1:${hostPort}/admin/`,
    workspaceRoot,
    servicesRoot,
    echoServiceRoot,
    tauriConfigPath: path.join(rootDir, "src-tauri", "tauri.conf.json"),
  };
}

export async function validateTauriConfig(config) {
  await access(path.join(config.echoServiceRoot, "service.json"));
  await access(path.join(config.adminDistRoot, "index.html"));
  return config;
}
