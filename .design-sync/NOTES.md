# design-sync notes — @repo/ui → "KomaForge Design System"

Repo-specific gotchas for future re-syncs. Read this first.

## Build / entry

- **Shape: `package`.** `@repo/ui` is a JIT source package; a real `dist/` build was added for sync.
- **`buildCmd`: `pnpm --filter @repo/ui build`** → runs `tsup` (`dist/index.js` + `dist/index.d.ts`)
  **and** Tailwind CLI (`tailwindcss -i src/build.css -o dist/styles.css`).
- Converter invocation (from repo root):
  `node .ds-sync/package-build.mjs --config .design-sync/config.json --node-modules ./node_modules --entry ./packages/ui/dist/index.js --out ./ds-bundle`
- **`--node-modules ./node_modules`** (repo ROOT). `node-linker=hoisted` keeps React at the root, not
  in `packages/ui/node_modules` (which is sparse). Pointing at the package's own nm gives `[DTS_REACT]`.

## ⚠ Critical config that is easy to break

- **`packages/ui/package.json` MUST keep `"types": "./dist/index.d.ts"`.** Without it the converter's
  ts-morph `projectFor` resolves the entry to `packages/ui/index.d.ts` (which doesn't exist) → the
  source file isn't in the project → `getExportedDeclarations()` returns 0 → **`[ZERO_MATCH]`, 0
  components.** The app still uses `exports["."] = ./src/index.ts` (JIT), so this `types` field only
  affects the converter — do not remove it.
- **`src/styles.css` has NO `@import "tailwindcss"`** (the app's `app.css` adds it before importing
  `@repo/ui/styles.css`). Standalone CLI compile therefore goes through **`src/build.css`** which does
  `@import "tailwindcss"; @import "./styles.css";` — compiling `styles.css` directly yields tokens but
  ZERO utility classes.
- **Composition safelist lives in `src/build.css`** (`@source inline(...)`). Rendered designs receive
  only the static `styles.css` closure, so any Tailwind utility the design agent needs for layout glue
  (flex/grid/gap/padding/colors) must be pre-generated there. Extend it if the agent reports missing
  utilities. (Component-internal classes are scanned from `src/**/*.{ts,tsx}` automatically.)

## Tokens / theme

- Dark is the DEFAULT theme (`:root`), light is `.light`. `accent` = shadcn subtle-bg; brand = `primary`
  (Claude clay `#cc785c`). styles.css `@layer base` sets `body` background so previews don't render on
  white. See `.design-sync/conventions.md` (the readmeHeader) for the agent-facing vocabulary.

## Component set

- **65 components**, including compound sub-parts (`DialogContent`, `SelectTrigger`,
  `DropdownMenuItem`, …) — intentional for a composable shadcn DS; the agent needs them to build.
  To trim to top-level only, add `componentSrcMap: {"DialogContent": null, …}`.

## Re-sync risks (watch-list)

- **Renders were NEVER machine-checked** this run: synced with `--no-render-check` (no chromium
  installed) and **floor cards everywhere** (no authored previews). Standing offer: install playwright
  + chromium, author `.design-sync/previews/<Name>.tsx` for the core components, render-verify, re-sync.
- The composition **safelist is hand-curated** — new components using utilities outside it won't be
  styled in designs until the safelist is extended and rebuilt.
- `tw-animate-css` provides enter/exit utilities; they appear only as `data-[state=...]:animate-in`
  variants in the compiled CSS (bare `.animate-in` is absent — expected).
