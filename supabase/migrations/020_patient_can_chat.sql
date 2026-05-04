-- Originally only the nutricionista could insert into nutri_chats (policy
-- "Nutri can insert chat messages" in 001_initial_schema.sql). For the
-- in-app /mensagens page the paciente needs to write too — but only their
-- own messages, paired with their linked nutri.

create policy "Patient can insert own chat messages"
  on nutri_chats for insert
  with check (
    auth.uid() = patient_id
    and role = 'user'
    and exists (
      select 1 from nutri_patient_links
      where nutri_id = nutri_chats.nutri_id
        and patient_id = auth.uid()
        and status = 'active'
    )
  );
