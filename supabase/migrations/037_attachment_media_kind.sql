-- Nutri-supplied materials can now be a PDF, a photo, or a typed text note —
-- not just PDF. media_kind records which; existing rows are all PDFs.
-- Text notes carry their content in extracted_text with an empty storage_path.

alter table nutri_patient_attachments
  add column if not exists media_kind text
    check (media_kind in ('pdf','image','text')) default 'pdf';

-- storage_path was NOT NULL because every attachment used to be a stored file.
-- Text notes have no file; allow an empty/absent path for them.
alter table nutri_patient_attachments
  alter column storage_path drop not null;
