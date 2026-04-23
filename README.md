# service-lasso-app-tauri

Template repo for a Tauri-hosted Service Lasso desktop app.

Package identity:
- `@service-lasso/service-lasso-app-tauri`

Purpose:
- show how to host Service Lasso behind a Tauri-style desktop shell
- act as a quick-start template for downstream teams
- keep desktop-shell concerns outside the core runtime repo

Expected runtime model:
- `servicesRoot`
- `workspaceRoot`

Current implementation:
- desktop-alt host entrypoint under `src/index.js`
- published `@service-lasso/service-lasso` runtime package consumption
- host-owned shell at `/`
- embedded sibling `lasso-@serviceadmin` build at `/admin/`
- tracked repo-owned `services/` definitions for Echo Service and Service Admin
- manifest-owned Echo Service archive metadata under `services/echo-service/service.json`
- prepared local `servicesRoot` copied from the tracked service inventory before runtime startup
- explicit `src-tauri/` next-step config for a future native wrapper

Current local start command:
- `npm start`

Current local URLs:
- desktop-alt shell: `http://127.0.0.1:19160`
- embedded admin UI: `http://127.0.0.1:19160/admin/`
- runtime API: `http://127.0.0.1:18081`

## Current release artifact

This starter repo now has bounded source, bootstrap-download, and preloaded/no-download release artifacts.

Current local commands:
- `npm test`
- `npm run release:artifact`
- `npm run release:verify`

Current pipelines:
- `CI`
  - runs on pushes to `main` and on pull requests
  - installs dependencies and runs `npm test`
- `Release`
  - runs on pushes to `main` or by manual dispatch
  - runs tests, verifies the artifacts, uploads the packaged files, and creates a timestamped `yyyy.m.d-<shortsha>` release from `main`

Current shipped artifact contents are documented in:
- `docs/release-artifact.md`

Current honest label:
- this repo ships a runnable Tauri app-host starter plus explicit source, bootstrap-download, and preloaded runtime bundles

## Minimal POC

The first concrete target for this repo is documented in:
- `docs/minimal-poc.md`
