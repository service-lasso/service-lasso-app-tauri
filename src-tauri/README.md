# src-tauri

This directory now documents the next bounded native-wrapper step for `service-lasso-app-tauri`.

Current honest status:
- the repo is executable today through the local Node desktop-alt host in `src/`
- Rust/Tauri tooling is not installed in this environment, so the native shell is not compiled in this slice
- the next Tauri wrapper should open the local host URL exposed by the current starter

Expected local host URL:
- `http://127.0.0.1:19160`

Key current host behavior:
- boots published `@service-lasso/service-lasso`
- prepares a local wrapper `servicesRoot` for sibling `lasso-echoservice`
- mounts sibling built `lasso-@serviceadmin` at `/admin/`

Related config:
- `tauri.conf.json`
