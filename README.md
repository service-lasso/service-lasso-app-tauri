# service-lasso-app-tauri

Desktop host starter for `@service-lasso/service-lasso`, packaged as `@service-lasso/service-lasso-app-tauri`. It keeps desktop-shell concerns outside Core. The implemented local Node host and planned native Tauri wrapper have distinct acceptance boundaries.

## Reader guides

The shared operator journey is maintained in Core:

- [Start a reference host, open Service Admin and manage Echo](https://github.com/service-lasso/service-lasso/blob/5bab717e5a476c78989b906cde6d9ffbdc769be1/docs/service-authoring/start-reference-host.md): prerequisites, startup, logs, owned cleanup and failure recovery.
- [Choose a reference app and understand its maturity](https://github.com/service-lasso/service-lasso/blob/5bab717e5a476c78989b906cde6d9ffbdc769be1/docs/reference-apps.md).
- [Wire application consumers](https://github.com/service-lasso/service-lasso/blob/5bab717e5a476c78989b906cde6d9ffbdc769be1/docs/service-authoring/04-wire-consumers.md).

These links identify reviewed source documents, not a documentation publication or a fresh runtime acceptance result.

## Component contracts

- [Tauri host contract](docs/host-contract.md): local host, planned native wrapper, services widget, embedded Admin, routes, roots and inventory.
- [Release artifact contract](docs/release-artifact.md): source, bootstrap-download and bundled/no-download artifacts.

Local verification remains `npm test`, `npm run release:artifact` and `npm run release:verify`. Release authority and triggers remain defined by the tracked workflows; this documentation change does not alter them.
