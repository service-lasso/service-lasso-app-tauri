import path from "node:path";
import { cp, mkdir, writeFile } from "node:fs/promises";

export async function prepareStarterServicesRoot(config) {
  const wrapperServiceRoot = path.join(config.servicesRoot, "echo-service");
  const wrapperEntrypointPath = path.join(wrapperServiceRoot, "run-echo-service.mjs");

  const wrapperScript = [
    'import { spawn } from "node:child_process";',
    "",
    `const echoServiceRoot = ${JSON.stringify(config.echoServiceRepoRoot)};`,
    'const child = spawn("go", ["run", "."], {',
    "  cwd: echoServiceRoot,",
    "  env: process.env,",
    '  stdio: "inherit",',
    "});",
    "",
    'for (const signal of ["SIGINT", "SIGTERM"]) {',
    "  process.on(signal, () => {",
    "    child.kill(signal);",
    "  });",
    "}",
    "",
    'child.on("exit", (code, signal) => {',
    "  if (signal) {",
    "    process.exit(1);",
    "    return;",
    "  }",
    "  process.exit(code ?? 0);",
    "});",
    "",
  ].join("\n");
  await cp(config.sourceServicesRoot, config.servicesRoot, { recursive: true, force: true });
  await mkdir(wrapperServiceRoot, { recursive: true });
  await writeFile(wrapperEntrypointPath, `${wrapperScript}\n`, "utf8");

  return {
    servicesRoot: config.servicesRoot,
    echoServiceRoot: wrapperServiceRoot,
    serviceAdminRoot: path.join(config.servicesRoot, "service-admin"),
    wrapperEntrypointPath,
  };
}
