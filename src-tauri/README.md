# Native Windows desktop host

This directory owns the Tauri native wrapper. It launches a portable Node/Core payload, waits for owned readiness and opens the local host in the native window. Closing requests graceful shutdown through the owned child pipe; the window remains open on a timeout with a retained-log recovery message. No web content has native command permissions.

Windows x64 build prerequisites: Node.js22, Rust1.90+ using the MSVC toolchain, Visual Studio C++ Build Tools and WebView2. See the [official Tauri prerequisites](https://v2.tauri.app/start/prerequisites/).

From the template root:

```powershell
npm ci
npm run tutorial:todo
npm run desktop:build
```

`tutorial:todo` is optional; it creates fresh pinned Todo/API/PostgreSQL seed manifests and refuses to overwrite existing service folders. The build copies only manifests into its payload, bundles portable Node and locked production dependencies, and acquires checksum-verified real Admin assets. User workspaces/databases/keys are excluded.

The installer is `src-tauri/target/release/bundle/nsis/Service Lasso Desktop_0.1.0_x64-setup.exe`. Install and launch it. Keep the installer intact; the raw app binary requires its installed `host/` resources. User state lives under `%LOCALAPPDATA%/io.service-lasso.desktop/` and survives application restarts/upgrades. Customize productName, identifier and version before distributing your own app.

Use **Prepare first-run setup**, then **Initialize Secrets Broker** in Admin. Install/configure/start your chosen managed services through Admin. The host switches its frame to running Todo when you refresh its service list; **Manage services** returns to Admin. Native mode chooses available loopback host/API ports and keeps its registry files inside the workspace.

`--smoke-test` exercises native startup and the same window-close handler after20seconds for verification. It does not prove manual UI interaction, signing, offline service installation, other native platforms or SSO in an embedded WebView. The build is a bootstrap-download distribution: service archives are acquired on first install. Use the separate native Windows CI candidate and its payload receipt for exact build evidence.
