# service-lasso-app-tauri

Desktop host starter for the pinned published `@service-lasso/service-lasso` runtime. It keeps native-shell concerns outside Core and owns its service inventory and user workspace.

## Build a Windows desktop app

From `develop`, with Node22, Rust/MSVC, C++ Build Tools and WebView2 installed:

```powershell
npm ci
npm run tutorial:todo
npm run desktop:build
```

Follow the [native wrapper guide](src-tauri/README.md) for the installer output, first-run setup, private data paths and verification boundaries. `tutorial:todo` is optional for custom app inventories. For local Node-host development use `npm run prepare:admin` then `npm start`; Windows real Admin assets are acquired without a sibling checkout.

## Reader guides

The shared operator journey is maintained in Core:

- [Start a reference host, open Service Admin and manage Echo](https://github.com/service-lasso/service-lasso/blob/5bab717e5a476c78989b906cde6d9ffbdc769be1/docs/service-authoring/start-reference-host.md): prerequisites, startup, logs, owned cleanup and failure recovery.
- [Choose a reference app and understand its maturity](https://github.com/service-lasso/service-lasso/blob/5bab717e5a476c78989b906cde6d9ffbdc769be1/docs/reference-apps.md).
- [Wire application consumers](https://github.com/service-lasso/service-lasso/blob/5bab717e5a476c78989b906cde6d9ffbdc769be1/docs/service-authoring/04-wire-consumers.md).

These links identify reviewed source documents, not a documentation publication or a fresh runtime acceptance result.

## Component contracts

- [Tauri host contract](docs/host-contract.md): Node host, native wrapper, services widget, Admin, routes, roots and inventory.
- [Release artifact contract](docs/release-artifact.md): source, bootstrap-download and bundled/no-download artifacts.

Local verification remains `npm test`, `npm run release:artifact` and `npm run release:verify`. Release authority and triggers remain defined by the tracked workflows; this documentation change does not alter them.
