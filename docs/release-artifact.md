# Release artifact

This repo currently ships a bounded **starter-template source artifact**.

That means the release file is intended to give downstream teams a downloadable starting repo shape, not a built production application.

## What ships

The staged artifact includes the current starter-template source files:
- `.gitignore`
- `.npmrc`
- `.github/`
- `README.md`
- `package.json`
- `package-lock.json`
- `src/`
- `docs/`
- `scripts/`
- `tests/`
- generated `release-artifact.json`

## What the artifact proves

The artifact proves:
- the template repo can be packaged repeatably
- the packaged template contains the documented starter files
- the staged starter can install the core runtime package and still run `npm start`
- GitHub Actions can upload the artifact and attach the archive to tagged releases

## Private package note

This starter depends on the published private core package:
- `@service-lasso/service-lasso`

For local or CI installs from GitHub Packages, provide a token with package read access through:
- `NODE_AUTH_TOKEN`

The repo `.npmrc` is included in the staged artifact so the starter knows which registry and scope to use.

## Commands

Stage the artifact:

```bash
npm run release:artifact
```

Stage and verify the artifact:

```bash
npm run release:verify
```

## Honest current label

This is a:

**starter-template source artifact**

It is not yet a built native Tauri desktop artifact.
