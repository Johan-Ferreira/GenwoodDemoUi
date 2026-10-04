# Template Feedback

## Shadcn CLI resolves the `utils` alias to an npm package called `cn`

- **Where:** `npx shadcn add <component> --yes` in `web/` (epic app-shell-and-sign-in, story 3; seen for `skeleton`, `badge`, `alert`).
- **Symptom:** Generated components import `cn` from `"cn"` (and `Slot` from `"radix-ui"`) instead of `@/lib/utils` / `@radix-ui/react-slot`, and the CLI adds unrelated `cn` and `radix-ui` packages to `web/package.json`.
- **Likely cause:** `web/src/lib/utils.ts` sits next to a `web/src/lib/utils/` directory, so the `@/lib/utils` alias in `components.json` is ambiguous to the CLI.
- **Workaround used:** fixed the imports by hand and reverted `package.json` / `package-lock.json`.
- **Suggested fix:** rename `lib/utils.ts` to e.g. `lib/cn.ts` (and point `components.json` `aliases.utils` at it), or move `lib/utils/constants.ts` out of a directory named `utils`.
