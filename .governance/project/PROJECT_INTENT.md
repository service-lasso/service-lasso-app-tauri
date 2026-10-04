# Native desktop template intent

The app template hosts the published Service Lasso runtime behind a Tauri desktop window. It owns its tracked service inventory, packaged runtime resources and per-user mutable workspace. The browser surface does not receive privileged Rust commands. Existing Node host and source/bootstrap artifact contracts remain supported.

Issue #24 enables the next Core Todo tutorial (#1679): a reproducible Windows native app/installer build, real Admin payload, retained user data and graceful owned-runtime shutdown. No signing, updater, production or GA claim is implied.
