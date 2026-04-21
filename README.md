# service-lasso-app-tauri

Template repo for a Tauri-hosted Service Lasso desktop app.

Package identity:
- `@service-lasso/service-lasso-app-tauri`

Purpose:
- show how to host Service Lasso behind a Tauri shell
- act as a quick-start template for downstream teams
- keep desktop-shell concerns outside the core runtime repo

Expected runtime model:
- `servicesRoot`
- `workspaceRoot`

Current scaffold:
- minimal JavaScript package metadata
- placeholder frontend entry under `src/`
- placeholder Rust/Tauri area under `src-tauri/`

## Current release artifact

This starter repo now has a bounded template-source release artifact.

Current local commands:
- `npm test`
- `npm run release:artifact`
- `npm run release:verify`

Current pipelines:
- `CI`
  - runs on pushes to `main` and on pull requests
  - installs dependencies and runs `npm test`
- `Release`
  - runs on version tags like `v0.1.0` or by manual dispatch
  - runs tests, verifies the artifact, uploads the packaged files, and creates or updates the tagged GitHub release

Current shipped artifact contents are documented in:
- `docs/release-artifact.md`

Current honest label:
- this repo ships a starter-template source bundle, not a built Tauri desktop app

## Minimal POC

The first concrete target for this repo is documented in:
- `docs/minimal-poc.md`
