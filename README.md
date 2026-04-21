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
