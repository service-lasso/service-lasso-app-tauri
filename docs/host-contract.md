# Tauri host contract

This file records the component-specific implementation boundary. The shared operator journey is maintained in the Core guides linked from README.

## Implemented local host

`src/index.js` consumes the published `@service-lasso/service-lasso` runtime. The local Node host owns its shell at `/`, exposes a bounded services widget through `/api/runtime-services`, and embeds a sibling built Service Admin at `/admin/`. It supplies explicit `servicesRoot` and `workspaceRoot`, preparing its local inventory from tracked `services/` definitions before startup.

The entrypoint is `npm start`. Source defaults are host shell `http://127.0.0.1:19160`, Admin `http://127.0.0.1:19160/admin/` and runtime API `http://127.0.0.1:18081`. Availability depends on instance configuration and the prerequisites in the shared guide.

## Native wrapper boundary

`src-tauri/tauri.conf.json` defines the next wrapper's product/window configuration and local host URL. [The wrapper boundary](../src-tauri/README.md) records the current status: the local Node host is implemented; native Rust/Tauri packaging/build is not compiled in this slice. The configuration does not prove an Tauri window, native executable, signed installer, auto-update, tray/process integration or distribution acceptance. Local host tests and staged package verification cannot substitute for native compilation and runtime evidence.

## Managed inventory

The tracked baseline contains `echo-service`, `@serviceadmin`, `@node`, `@localcert`, `@nginx` and `@traefik`; optional `@python` and `@java` examples are disabled. Echo and Traefik download/archive identities belong to their service manifests. Traefik declares `@localcert` and `@nginx` as dependencies. Core service identifiers retain their `@` prefix; the sample `echo-service` remains unprefixed.

## Packaging boundary

The starter's release contracts distinguish source, bootstrap-download and bundled/no-download artifacts. Packaging and release verification remain governed by the existing [release artifact contract](release-artifact.md), scripts and workflows. Those artifacts do not establish native Tauri compilation, single-file packaging or installer acceptance.

## Documentation migration receipt

For service-lasso/service-lasso#1418 / SPEC-002 AC-4AJ.3 and companion issue #22, the reviewed README and generic `docs/minimal-poc.md` came from develop `5662c70f2b1c8af80e01d9aede00c3ace075fba6`. README now links to the shared Core journey merged in PR #1424; the replaced generic guide is removed. Host, wrapper and release contracts remain component-owned. No runtime acceptance, publication or release is claimed.
