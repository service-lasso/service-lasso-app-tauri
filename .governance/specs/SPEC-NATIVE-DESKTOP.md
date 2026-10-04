# Native Windows desktop wrapper — issue #24

- NATIVE-1: A complete locked Tauri/Rust project and npm command build the Windows application and NSIS installer executable from the template. The build bundles a portable Node executable, published locked Core dependency, real release-backed Service Admin assets and app-owned service metadata; no sibling checkout is required.
- NATIVE-2: Native launch starts the packaged Node host, waits for its readiness and opens its loopback shell. The native window grants no Rust/shell capabilities to loopback web content. Startup failure does not silently navigate to an unrelated listener.
- NATIVE-3: Packaged resources are immutable seeds. A per-user application-data workspace holds manifests, runtime state and service data. Existing files are preserved on restart/update; builds exclude user databases, logs, secrets and existing workspace artifacts.
- NATIVE-4: Closing the native window requests graceful shutdown over the owned child stdin and waits for that runtime. No shared process/listener or retained data is terminated/deleted. Failure to stop is reported; owned-child fallback is bounded.
- NATIVE-5: The host can present Todo and Service Admin in the same desktop experience using declared service URLs. Todo/API/PostgreSQL remain managed services, not Rust reimplementations. First-run acquisition/setup and optional identity bootstrap stay explicit.
- NATIVE-6: Verification distinguishes compilation, native launch/close, packaged-host integration, downstream service lifecycle, signing and offline acceptance. Existing protected tests remain intact.

## Issue #30 corrected Todo authentication consumers

- NATIVE-5C: Pin the Todo/API seed manifests to the checksum-bound corrective development releases for Core #1692. Fresh desktop seeds deliberately retain explicit anonymous local mode; optional SSO must configure the App and API together using their paired helper and a private API credential file. Existing runtime workspaces and secrets are never seeded or overwritten.
- NATIVE-6C: Verify literal acquired manifest identities, explicit API mode, the API's Zitadel introspection capability and native package compilation. Preserve protected tests and prior native evidence, and distinguish fresh anonymous desktop packaging from actual paired SSO runtime acceptance.

## Issue #26 packaging membership

- NATIVE-1A: Repeated Admin preparation uses a fresh extraction and publishes exactly the admitted ZIP dist file set; stale cache and destination-only files never enter payloads. Retired generated payloads remain separate diagnostics. ZIP SHA-256 remains enforced.
- NATIVE-3A: Source, runtime and bundled legacy archives retain native Cargo/config/source/icons but exclude native compiler/generated outputs, including target and gen, after desktop builds.
- NATIVE-6A: Add repeated preparation and all-three archive sentinel regressions; retain protected tests/native compilation. Source-only authoring requires fresh entire review and complete-input ROOT before execution.

## Issue #28 actual hosted Windows/Linux repair

- NATIVE-1B: Admin preparation reads the checksum-bound original ZIP bytes with platform-independent Node ZIP/deflate capabilities. Admit original central/local names and regular-file/directory metadata before writing; reject traversal, links/special types, duplicate or Windows-ambiguous names and inconsistent headers. Bound archive bytes, member count, individual/total inflated bytes and path depth. Extract exactly admitted membership into a fresh plain tree and preserve replacement/rollback semantics and retained attempts. No universal ZIP support is attributed to tar.
- NATIVE-6B: Both new fixtures canonicalize the actual system temporary parent and created root before deriving paths, keep no-link/identity/containment checks immediately before deletion, and never alter global TEMP. Repeated real ZIP staging, failure retention and unsafe member/metadata/size regressions support the original all-three legacy archive gate. Windows/Linux full hosted and native gates need fresh entire source review and complete ROOT before execution; Darwin deferred.

Original evidence: develop 4c664cfc76ade57df2dd735470079913da8e2c53, Windows run 37223819614/job 111499276447 (8/10, two cleanup alias failures), Linux run 37223819672/job 111499276692 (9/10, GNU tar genuine ZIP failure; all three legacy archives passed). No Windows installer build reached. These failures remain unchanged historical evidence, never replaced by local results.

NATIVE-1B format and bounds: the actual pinned release @serviceadmin-win32.zip SHA-256 fe5e5fe01d1202f3874097e6223652d634c94677c765c5f82d20e6d274c0161c is 1,424,402 bytes, 205 members, 3,899,784 total inflated bytes and 411,748 maximum member bytes. Original names use one producer './' prefix (including './'); flags 0/8, methods stored/deflate and signed 32-bit descriptors. The decoder explicitly supports this contract and UTF-8 names, validates local/central identity, and strips only that single admitted prefix. ZIP64, encryption, split disks and other compression formats fail closed. Limits: 64 MiB archive/member, 256 MiB total inflated, 8,192 members, 32 path components, 30-second acquisition deadline. These finite ceilings cover the exact pinned artifact with margin; they do not redefine protected native/runtime deadlines. The original release ZIP is retained as a checksum-bound regression fixture; its runtime assets are source evidence, not a release/publication claim.
