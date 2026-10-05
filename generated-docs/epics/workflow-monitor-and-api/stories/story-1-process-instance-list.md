# Story 1: Process instance list

**Slug:** story-1-process-instance-list
**Requirement IDs:** R1, R8, BR4, BR7, NFR-1, NFR-2, NFR-3, NFR-4, NFR-5, NFR-6
**Roles:** Demo presenter
**Route:** /workflow-monitor
**Target file:** web/src/app/(app)/workflow-monitor/page.tsx
**Page action:** modify_existing
**Infrastructure only:** false

## Plain summary

The presenter opens Workflow monitor and sees every workflow run, newest first. Runs can be filtered by status or process name, sorted by any column and paged through. Each run shows its instance ID, process, WOID, timestamps, last activity and a labelled status chip.

## Summary

Replaces the placeholder `/workflow-monitor` page with the title and subtitle, plus a "Process instances" table that reads `GET /v1/process-instances`. Status and ProcessName filters and Page/Size are sent to the service; page-size choices are 5/10/20/50, default 20. Each column sorts ascending then descending, with the active sort indicated. Status chip carries a text label; empty state names the entity; filtered-empty state shows active filters and Clear all; loading skeleton and persistent error with Retry via DataState (NFR-2). Process-name filter is a free-text input. Idle, Suspended and Cancelled are neutral (reconcile `processStatusTone` with BR4 deliberately, as ImportTrace also uses it).

## Acceptance criteria

- **AC-1** (coverage: vitest): The Process instances table shows the columns specified in the brief, newest first. The instance ID is shortened to 12 characters plus an ellipsis, the WOID is shown, a missing timestamp is shown as absent, and the status chip carries its text label.
- **AC-2** (coverage: playwright): Filtering by status or by process name lists only the matching process instances.
- **AC-3** (coverage: playwright): Choosing a page size (5, 10, 20 or 50, default 20) and moving between pages shows the matching page of process instances.
- **AC-4** (coverage: vitest): Clicking a column header sorts ascending, then descending on a second click, and the active sort is indicated.
- **AC-5** (coverage: vitest): A filter with no matches shows the active filters and a Clear all action. With no runs at all, the page shows "No process instances found."
- **AC-6** (coverage: vitest): When the list cannot be loaded, a persistent error message with Retry is shown, and Retry reloads the list.

## Manual test checklist

- Open Workflow monitor from the side menu → the Process instances table lists the runs, newest first
- Check a row → the instance ID is shortened with "…", the WOID is shown, and the status chip shows a word (Finished, Faulted, Running…) as well as a colour
- Filter by status "Faulted" → only faulted runs remain; choose Clear all → every run comes back
- Type a process name that does not exist → you see the active filter and a Clear all action, not a blank table
- Change the page size to 5 → only 5 runs are shown and you can move to the next page
- Click the "Created" column header twice → the order flips, and the header shows which way it is sorted

## Additional technical checks

2 technical checks verified automatically.

## Reuse notes

getProcessInstances in lib/api/endpoints.ts; DataState; StatusChip + processStatusTone; SortableTableHead, TablePagination, FilterSelect (paging is service-driven Page/Size, not useClientPagination); PageHeader.
