# Story 1: Plain-language identifiers on Overview, File log and Import trace

**Slug:** story-1-plain-language-identifiers
**Requirement IDs:** R1, R2, R3, R4, R10, BR1, BR2, NFR-1, NFR-3, NFR-4, NFR-5
**Roles:** Demo presenter
**Route:** /file-log
**Target file:** web/src/app/(app)/file-log/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

The "Recent loads" table on the Overview and the main File log table no longer show the WOID column, and the remaining columns spread out to use the space. In the file detail panel, "WOID" now reads "Staging instance ID" and "Workflow instance" now reads "Rate load instance ID". The Import trace's "File log entry" panel drops its WOID row.

## Summary

The Overview "Recent loads" and the File log both use the same table component (`web/src/components/files/FileTable.tsx`). Removing the `woid` column there covers R1 and R3. The cells after File get more horizontal padding (existing spacing tokens only) so they fill the freed width, numbers stay right-aligned with tabular figures, and the table still fits with no horizontal scroll. `FileDetailCard.tsx` `detailFields` renames the two labels and leaves the values alone (BR2). `ImportTrace.tsx` `fileFields` drops the WOID row and keeps the Instance ID rows in the Staging and Rate load run panels (R10). "Open staging run", "Open import run" and "Trace import" keep the same targets (BR1). The WOID sort key can stay in `lib/files/file-sort.ts` but is no longer offered as a column. Existing tests that assert the WOID column, the old labels or the WOID row get updated: epic-file-log-story-1, -3, -4; epic-overview-and-yield-curves-story-2; epic-workflow-monitor-and-api-story-3, -6, -9 (Vitest and e2e where they exist).

## Acceptance criteria

- **AC-1** (coverage: vitest): The Overview "Recent loads" table and the File log table show the columns #, File, Curve family, Received, Records inserted, Status, with no WOID column.
- **AC-2** (coverage: vitest): The file detail panel lists "Staging instance ID" and "Rate load instance ID" with the same values as before, and no longer shows the labels "WOID" or "Workflow instance".
- **AC-3** (coverage: vitest): The Import trace "File log entry" panel has no WOID row, while the Staging run and Rate load run panels still show their Instance ID rows.
- **AC-4** (coverage: playwright): From a selected file, "Open staging run" and "Trace import" still open the same Workflow monitor run and import trace as before.
- **AC-5** (coverage: none): After the WOID column is removed, the columns after File spread across the freed width, numbers stay right-aligned, and nothing scrolls sideways.

## Manual test checklist

- Open the Overview → the Recent loads table has no WOID column and the columns after File are evenly spread, not bunched to the right
- Open the File log → the file table has no WOID column and Status is visible with no sideways scrolling
- Click a file in the File log → the detail panel shows "Staging instance ID" and "Rate load instance ID" instead of "WOID" and "Workflow instance"
- In that detail panel, click Trace import → the File log entry panel has no WOID row, and the staging and rate load panels still show their Instance IDs
- Back on the file detail, click Open staging run → the Workflow monitor opens on that file's run as before
- Open any import trace → the line under the heading reads "...published data for WOID <file name>" with the file name, not the long ID

## Additional technical checks

1 technical check verified automatically.
