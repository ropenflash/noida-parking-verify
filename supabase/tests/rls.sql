-- RLS / audit checks (run in SQL editor as needed).
-- 12. User cannot access another user's private report
-- 13. Admin/staff can update authority records
-- 14. Audit log created on important changes

-- Example (replace UUIDs after creating two users):
-- set role authenticated;
-- select set_config('request.jwt.claim.sub', '<user-a>', true);
-- select count(*) from parking_reports where user_id = '<user-b>'; -- expect 0 for PRIVATE drafts

-- Staff write path is covered by policies parking_sites_write / authority_sources_write.
-- Audit rows are written by private.write_audit from authority triggers.
