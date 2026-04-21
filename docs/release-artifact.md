# Release artifact

This repo currently ships a bounded **starter-template source artifact**.

That means the release file is intended to give downstream teams a downloadable starting repo shape, not a built production application.

## What ships

The staged artifact includes the current starter-template source files:
- `.gitignore`
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
- the staged starter can still run `npm start`
- GitHub Actions can upload the artifact and attach the archive to tagged releases

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

It is not yet a built deployable web application artifact.
