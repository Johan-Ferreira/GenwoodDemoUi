# Template Feedback

## Shadcn CLI resolves the `utils` alias to an npm package called `cn`

- **Where:** `npx shadcn add <component> --yes` in `web/` (epic app-shell-and-sign-in, story 3; seen for `skeleton`, `badge`, `alert`).
- **Symptom:** Generated components import `cn` from `"cn"` (and `Slot` from `"radix-ui"`) instead of `@/lib/utils` / `@radix-ui/react-slot`, and the CLI adds unrelated `cn` and `radix-ui` packages to `web/package.json`.
- **Likely cause:** `web/src/lib/utils.ts` sits next to a `web/src/lib/utils/` directory, so the `@/lib/utils` alias in `components.json` is ambiguous to the CLI.
- **Workaround used:** fixed the imports by hand and reverted `package.json` / `package-lock.json`.
- **Suggested fix:** rename `lib/utils.ts` to e.g. `lib/cn.ts` (and point `components.json` `aliases.utils` at it), or move `lib/utils/constants.ts` out of a directory named `utils`.

## `npx shadcn add <component> --yes` still stops on an overwrite prompt

- **Where:** `(cd web && npx shadcn add chart --yes)` (epic overview-and-yield-curves, story 2).
- **Symptom:** `chart` lists `card` as a registry dependency; because `card.tsx` already exists, the CLI asks "Would you like to overwrite?" despite `--yes`, and in a non-interactive agent shell the command ends without writing `chart.tsx` (only the npm dependencies are installed).
- **Workaround used:** piped `n` into the command so the existing `card.tsx` was kept and `chart.tsx` was created.
- **Suggested fix:** document (CLAUDE.md §1) the non-interactive form for components with already-installed dependencies, e.g. `echo n | npx shadcn add <component> --yes`, or pass an explicit no-overwrite option if the pinned CLI version offers one.
