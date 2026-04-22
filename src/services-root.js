import path from "node:path";
import { mkdir, readFile, writeFile } from "node:fs/promises";

export async function prepareStarterServicesRoot(config) {
  const templateManifestPath = path.join(config.echoServiceRoot, "service.json");
  const wrapperServiceRoot = path.join(config.servicesRoot, "echo-service");
  const wrapperManifestPath = path.join(wrapperServiceRoot, "service.json");
  const wrapperEntrypointPath = path.join(wrapperServiceRoot, "run-echo-service.mjs");
  const templateManifest = JSON.parse(await readFile(templateManifestPath, "utf8"));

  const wrapperScript = [
    'import { spawn } from "node:child_process";',
    "",
    `const echoServiceRoot = ${JSON.stringify(config.echoServiceRoot)};`,
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

  const wrapperManifest = {
    ...templateManifest,
    description: `${templateManifest.description} Wrapped by service-lasso-app-tauri for local host discovery.`,
    executable: "node",
    args: ["./run-echo-service.mjs"],
  };

  await mkdir(wrapperServiceRoot, { recursive: true });
  await writeFile(wrapperEntrypointPath, `${wrapperScript}\n`, "utf8");
  await writeFile(wrapperManifestPath, `${JSON.stringify(wrapperManifest, null, 2)}\n`, "utf8");

  return {
    wrapperServiceRoot,
    wrapperManifestPath,
    wrapperEntrypointPath,
  };
}
