-- Add Mid-Sem and End-Sem exam types.
-- Safe & idempotent: drop the existing auto-named check constraint and re-add
-- it with the extended value set. All previous values are retained.
alter table public.papers
  drop constraint if exists papers_exam_type_check;

alter table public.papers
  add constraint papers_exam_type_check
  check (exam_type in (
    'regular', 'supply', 'improvement', 'preparatory', 'mid_sem', 'end_sem', 'other'
  ));

-- Mid-Sem / End-Sem are the most common browsing targets after upload;
-- keep the existing exam_type index (already created in 0001_schema.sql).
