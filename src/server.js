import { createReadStream } from "node:fs";
import { stat } from "node:fs/promises";
import path from "node:path";
import { createServer } from "node:http";

const MIME_TYPES = {
  ".css": "text/css; charset=utf-8",
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".png": "image/png",
  ".svg": "image/svg+xml",
};

function writeJson(response, statusCode, body) {
  response.statusCode = statusCode;
  response.setHeader("content-type", "application/json; charset=utf-8");
  response.end(JSON.stringify(body, null, 2));
}

function getMimeType(filePath) {
  return MIME_TYPES[path.extname(filePath).toLowerCase()] ?? "application/octet-stream";
}

function createShellHtml(config) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <title>Service Lasso App Tauri</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>
      :root {
        color-scheme: light;
        --bg: #f2eee8;
        --panel: rgba(255, 253, 249, 0.95);
        --ink: #18232a;
        --muted: #657177;
        --accent: #0d8c7a;
        --line: rgba(24, 35, 42, 0.12);
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: "IBM Plex Sans", "Segoe UI", sans-serif;
        color: var(--ink);
        background:
          radial-gradient(circle at top left, rgba(13,140,122,0.14), transparent 34%),
          radial-gradient(circle at bottom right, rgba(24,35,42,0.08), transparent 30%),
          linear-gradient(180deg, #fbfaf7 0%, var(--bg) 100%);
      }
      main {
        min-height: 100vh;
        padding: 24px;
        display: grid;
        grid-template-columns: minmax(320px, 390px) 1fr;
        gap: 20px;
      }
      .panel,
      .frame {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: var(--panel);
        box-shadow: 0 18px 50px rgba(24,35,42,0.08);
      }
      .panel {
        padding: 24px;
        display: flex;
        flex-direction: column;
        gap: 18px;
      }
      .eyebrow {
        display: inline-block;
        padding: 6px 10px;
        border-radius: 999px;
        background: rgba(13,140,122,0.12);
        color: var(--accent);
        font-size: 0.78rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
      }
      h1 {
        margin: 0;
        font-size: 2.1rem;
        line-height: 1.05;
      }
      p, li {
        color: var(--muted);
        line-height: 1.5;
      }
      .card {
        padding: 16px;
        border-radius: 18px;
        border: 1px solid var(--line);
        background: rgba(255,255,255,0.58);
      }
      .service-widget {
        display: grid;
        gap: 12px;
      }
      .service-widget__header {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 12px;
      }
      .service-widget__header p {
        margin: 4px 0 0;
      }
      .service-widget__refresh {
        border: 1px solid var(--line);
        border-radius: 999px;
        padding: 8px 12px;
        background: #f1fff9;
        color: var(--ink);
        cursor: pointer;
        font: inherit;
        font-weight: 700;
      }
      .service-widget__status {
        margin: 0;
        color: var(--muted);
      }
      .service-list {
        display: grid;
        gap: 10px;
        margin: 0;
        padding: 0;
        list-style: none;
      }
      .service-row {
        display: grid;
        gap: 8px;
        padding: 12px;
        border: 1px solid var(--line);
        border-radius: 14px;
        background: rgba(255, 255, 255, 0.7);
      }
      .service-row__top {
        display: flex;
        align-items: flex-start;
        justify-content: space-between;
        gap: 10px;
      }
      .service-row__name {
        font-weight: 800;
      }
      .service-row__id,
      .service-row__detail {
        color: var(--muted);
        font-size: 0.88rem;
      }
      .pill {
        border-radius: 999px;
        padding: 4px 8px;
        background: rgba(24,35,42,0.08);
        color: var(--ink);
        font-size: 0.78rem;
        font-weight: 800;
        white-space: nowrap;
      }
      .label {
        display: block;
        font-size: 0.76rem;
        font-weight: 700;
        letter-spacing: 0.08em;
        text-transform: uppercase;
        color: var(--muted);
        margin-bottom: 8px;
      }
      code {
        display: block;
        overflow-wrap: anywhere;
        padding: 8px 10px;
        border-radius: 10px;
        background: #e6efe8;
        font-family: "IBM Plex Mono", "Consolas", monospace;
        font-size: 0.9rem;
        color: #223238;
      }
      a { color: inherit; text-decoration: none; }
      .links { display: grid; gap: 12px; }
      .link {
        border: 1px solid var(--line);
        border-radius: 16px;
        padding: 14px 16px;
        background: rgba(255,255,255,0.58);
      }
      .link strong {
        display: block;
        margin-bottom: 4px;
      }
      .frame {
        overflow: hidden;
        min-height: calc(100vh - 48px);
      }
      iframe {
        width: 100%;
        height: calc(100vh - 48px);
        border: 0;
        background: white;
      }
      ul {
        margin: 0;
        padding-left: 18px;
      }
      @media (max-width: 1000px) {
        main { grid-template-columns: 1fr; }
        .frame, iframe { min-height: 70vh; height: 70vh; }
      }
    </style>
  </head>
  <body>
    <main>
      <section class="panel">
        <span class="eyebrow">Desktop Alt Shell</span>
        <h1>Tauri-ready shell for Service Lasso</h1>
        <p>
          This bounded host keeps the runtime and admin wiring executable today, while the future native Tauri wrapper simply needs to point its window at this local shell and the tracked service inventory.
        </p>
        <div class="card">
          <span class="label">Runtime API</span>
          <code>${config.runtimeUrl}</code>
        </div>
        <div class="card">
          <span class="label">Prepared servicesRoot</span>
          <code>${config.servicesRoot}</code>
        </div>
        <div class="card">
          <span class="label">Tauri config path</span>
          <code>${config.tauriConfigPath}</code>
        </div>
        <div class="card service-widget" data-service-widget>
          <div class="service-widget__header">
            <div>
              <span class="label">Host-owned service widget</span>
              <p>Reads the Service Lasso runtime API directly while keeping Service Admin separate.</p>
            </div>
            <button class="service-widget__refresh" type="button" data-service-refresh>Refresh</button>
          </div>
          <p class="service-widget__status" data-service-status>Loading runtime services...</p>
          <ul class="service-list" data-service-list aria-live="polite"></ul>
        </div>
        <div class="links">
          <a class="link" href="/api/host-status">
            <strong>Host status JSON</strong>
            <span>Inspect shell wiring, runtime roots, and next-step Tauri metadata.</span>
          </a>
          <a class="link" href="${config.runtimeUrl}/api/services">
            <strong>Runtime services API</strong>
            <span>See the discovered runtime services directly.</span>
          </a>
          <a class="link" href="/admin/" target="_blank" rel="noreferrer">
            <strong>Open Service Admin alone</strong>
            <span>Launch the embedded admin surface in its own tab.</span>
          </a>
        </div>
      </section>
      <section class="frame">
        <iframe title="Service Admin" src="/admin/"></iframe>
      </section>
    </main>
    <script>
      const statusElement = document.querySelector("[data-service-status]");
      const listElement = document.querySelector("[data-service-list]");
      const refreshButton = document.querySelector("[data-service-refresh]");

      function lifecycleLabel(service) {
        const lifecycle = service.lifecycle ?? {};
        if (lifecycle.running) return "running";
        if (lifecycle.configured) return "configured";
        if (lifecycle.installed) return "installed";
        return "discovered";
      }

      function renderServices(services) {
        listElement.replaceChildren();

        if (services.length === 0) {
          statusElement.textContent = "No services were discovered by the runtime.";
          return;
        }

        statusElement.textContent = services.length === 1
          ? "1 service discovered from the runtime API."
          : services.length + " services discovered from the runtime API.";

        for (const service of services) {
          const row = document.createElement("li");
          row.className = "service-row";
          row.innerHTML = [
            '<div class="service-row__top">',
            '<div>',
            '<div class="service-row__name"></div>',
            '<div class="service-row__id"></div>',
            '</div>',
            '<span class="pill"></span>',
            '</div>',
            '<div class="service-row__detail"></div>',
          ].join("");

          row.querySelector(".service-row__name").textContent = service.name ?? service.id;
          row.querySelector(".service-row__id").textContent = service.id;
          row.querySelector(".pill").textContent = lifecycleLabel(service);
          row.querySelector(".service-row__detail").textContent = (service.health?.healthy ? "healthy" : "health pending") + " - " + (service.health?.detail ?? "No healthcheck has reported yet.");
          listElement.append(row);
        }
      }

      async function loadServices() {
        statusElement.textContent = "Loading runtime services...";
        refreshButton.disabled = true;

        try {
          const response = await fetch("/api/runtime-services");
          if (!response.ok) {
            throw new Error("Runtime services request failed with HTTP " + response.status);
          }

          const payload = await response.json();
          renderServices(Array.isArray(payload.services) ? payload.services : []);
        } catch (error) {
          statusElement.textContent = "Unable to load runtime services: " + (error?.message ?? error);
          listElement.replaceChildren();
        } finally {
          refreshButton.disabled = false;
        }
      }

      refreshButton.addEventListener("click", loadServices);
      loadServices();
    </script>
  </body>
</html>`;
}

async function serveStaticFile(response, filePath) {
  response.statusCode = 200;
  response.setHeader("content-type", getMimeType(filePath));
  createReadStream(filePath).pipe(response);
}

async function resolveStaticFile(config, pathname) {
  const trimmed = pathname.replace(/^\/admin\/?/, "");
  const candidate = trimmed.length === 0 ? "index.html" : trimmed;
  const filePath = path.join(config.adminDistRoot, candidate);

  try {
    const fileStat = await stat(filePath);
    if (fileStat.isFile()) {
      return filePath;
    }
  } catch {}

  return path.join(config.adminDistRoot, "index.html");
}

export function createHostStatus(config) {
  return {
    app: "@service-lasso/service-lasso-app-tauri",
    hostUrl: config.hostUrl,
    runtimeUrl: config.runtimeUrl,
    adminUrl: config.adminUrl,
    servicesRoot: config.servicesRoot,
    sourceServicesRoot: config.sourceServicesRoot,
    workspaceRoot: config.workspaceRoot,
    adminDistRoot: config.adminDistRoot,
    tauriConfigPath: config.tauriConfigPath,
    notes: [
      "Desktop-alt shell is served at /.",
      "Service Admin is mounted from the sibling build under /admin/.",
      "Tracked services/ definitions are copied into the prepared servicesRoot before runtime startup.",
      "Echo Service archive metadata now lives in services/echo-service/service.json.",
      "The next native Tauri wrapper should open this local host URL inside the desktop shell.",
    ],
  };
}

async function fetchRuntimeServices(config) {
  const response = await fetch(`${config.runtimeUrl}/api/services`);
  const body = await response.text();
  let payload = null;

  try {
    payload = body ? JSON.parse(body) : null;
  } catch {
    payload = { raw: body };
  }

  if (!response.ok) {
    return {
      statusCode: response.status,
      body: {
        error: "runtime_services_unavailable",
        message: `Runtime services API returned HTTP ${response.status}.`,
        upstream: payload,
      },
    };
  }

  return {
    statusCode: 200,
    body: payload,
  };
}

export function createTauriHostServer(config) {
  const shellHtml = createShellHtml(config);
  const statusBody = createHostStatus(config);

  return createServer(async (request, response) => {
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (request.method === "GET" && url.pathname === "/") {
      response.statusCode = 200;
      response.setHeader("content-type", "text/html; charset=utf-8");
      response.end(shellHtml);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/host-status") {
      writeJson(response, 200, statusBody);
      return;
    }

    if (request.method === "GET" && url.pathname === "/api/runtime-services") {
      const result = await fetchRuntimeServices(config);
      writeJson(response, result.statusCode, result.body);
      return;
    }

    if (request.method === "GET" && url.pathname.startsWith("/admin")) {
      const filePath = await resolveStaticFile(config, url.pathname);
      await serveStaticFile(response, filePath);
      return;
    }

    response.statusCode = 404;
    response.setHeader("content-type", "text/plain; charset=utf-8");
    response.end("not found");
  });
}
