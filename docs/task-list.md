# App Tauri task list

This document tracks the first real implementation slice for `service-lasso-app-tauri`.

## Goal

Turn the starter into the smallest real desktop-alt host that:
- uses published `@service-lasso/service-lasso`
- shows host-owned desktop shell output
- embeds `lasso-@serviceadmin`
- discovers real `lasso-echoservice`
- leaves explicit `src-tauri/` wiring ready for a later native shell step

## Bounded tasks

1. Add package-registry wiring for `@service-lasso/service-lasso`
   status: done

2. Define deterministic local runtime/host ports and sibling-repo path assumptions
   status: done

3. Replace the placeholder entrypoint with a real desktop-alt host bootstrap
   status: done

4. Serve a host-owned shell page with embedded admin UI and runtime links
   status: done

5. Prepare a local `servicesRoot` from the tracked service inventory
   status: done

6. Add direct tests for config resolution, host routes, and wrapper materialization
   status: done

7. Add explicit `src-tauri/` next-step wiring docs/config
   status: done

8. Prove local start behavior against the current workspace
   status: done

## Honest current scope

Rust/Tauri tooling is not installed in this environment, so this slice does not compile a native shell.

It only proves:

**a desktop-alt host can boot the published runtime, embed Service Admin, and surface Echo Service while leaving a concrete Tauri wrapper path for the next step**

## Current evidence

- `npm test`
- `npm run release:verify`
- local smoke:
  - desktop-alt shell on `http://127.0.0.1:19160`
  - runtime API on `http://127.0.0.1:18081`
  - embedded admin UI on `/admin/`
  - discovered service id: `echo-service`
  - install/config/start/stop exercised against the real sibling `lasso-echoservice`
  - explicit next-step Tauri config tracked at `src-tauri/tauri.conf.json`
