# SuperAdmin Export Fix - IMPLEMENTATION STEPS

## Approved Plan Summary
Fix CSV export in detail-list view to ensure selectedRoleData always reflects current filtered/paginated data for the role.

## Steps to Complete
- [ ] Step 1: Create TODO_SUPERADMIN_EXPORT.md ✅
- [ ] Step 2: Update handleCardClick to explicitly set unfiltered selectedRoleData
- [ ] Step 3: Enhance useEffect to fully sync selectedRoleData on all filter/pagination changes (add deps, refactor filter logic)
- [ ] Step 4: Verify/refactor getFilteredDetailData for consistency (useCallback, match export logic)
- [ ] Step 5: Apply edit_file changes to SuperadminDashboard.js (multiple diffs)
- [ ] Step 6: Test flow: card click → apply filter/paginate → export → verify CSV has correct filtered role data only
- [ ] Step 7: Update school-frontend/TODO.md checkboxes, attempt_completion

**Current Progress**: Planning complete. Next: Code edits.

