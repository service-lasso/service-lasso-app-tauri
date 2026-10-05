# Native desktop template intent

The app template hosts the published Service Lasso runtime behind a Tauri desktop window. It owns its tracked service inventory, packaged runtime resources and per-user mutable workspace. The browser surface does not receive privileged Rust commands. Existing Node host and source/bootstrap artifact contracts remain supported.

Issue #24 enables the next Core Todo tutorial (#1679): a reproducible Windows native app/installer build, real Admin payload, retained user data and graceful owned-runtime shutdown. No signing, updater, production or GA claim is implied.

Issue #26 repairs release membership: fresh checksum-bound Admin staging replaces generated payloads; legacy archives include native sources only, after desktop compilation. Source review and new input admission precede execution.

Issue #28 repairs actual post-merge Windows canonical TEMP identity and Linux genuine ZIP staging, bound to NATIVE-1B/6B. All source and execution gates remain distinct; Darwin deferred. Native resources, retained workspace and legacy source/runtime/bundled contracts remain required.

Issue #30 updates Todo/API seed pins to Core #1692's corrected authentication consumers. Fresh desktop mode is explicitly anonymous; optional SSO secures both services and uses private runtime credential paths, never packaged secrets. Native sources and existing workspaces remain unchanged.
