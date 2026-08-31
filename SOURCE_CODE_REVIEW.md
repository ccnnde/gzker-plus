# Firefox source code review

The Firefox source archive contains the files required to rebuild the extension from source.

## Toolchain

- Node.js 24.18.1
- pnpm 11.20.0

## Rebuild

From the archive root, run:

```text
pnpm install --frozen-lockfile
pnpm zip:ff
```

The Firefox extension archive and its source archive are written to `.output/`.
