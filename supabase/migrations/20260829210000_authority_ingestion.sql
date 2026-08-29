-- Authority data management: documents, tenders, contract-sites, provenance,
-- staging workflow, and an append-only change log. User reports stay separate.

create type public.authority_workflow_status as enum (
  'DOCUMENT',
  'EXTRACTION',
  'PROPOSED',
  'REVIEW',
  'VERIFIED',
  'ACTIVE',
  'EXPIRED',
  'REJECTED'
);

create type public.authority_verification_status as enum (
  'UNVERIFIED',
  'PROPOSED',
  'UNDER_REVIEW',
  'VERIFIED',
  'REJECTED',
  'EXPIRED'
);

create type public.authority_entity_kind as enum (
  'SITE',
  'CONTRACT',
  'CONTRACTOR',
  'TENDER',
  'RATE'
);

create type public.authority_review_status as enum (
  'PROPOSED',
  'APPROVED',
  'REJECTED'
);

create type public.authority_match_kind as enum (
  'EXACT_MATCH',
  'NEARBY_MATCH',
  'NO_MATCH'
);

-- ---------------------------------------------------------------------------
-- Documents (trusted ingest, not user reports)
-- ---------------------------------------------------------------------------

create table public.authority_documents (
  id uuid primary key default gen_random_uuid(),
  source_type public.source_type not null,
  source_title text not null,
  source_url text,
  source_document_id uuid,
  publication_date date,
  effective_from date,
  effective_until date,
  extracted_at timestamptz,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  verification_status public.authority_verification_status not null default 'UNVERIFIED',
  confidence_score numeric(5, 2)
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  storage_path text,
  original_filename text,
  mime_type text,
  notes text,
  workflow_status public.authority_workflow_status not null default 'DOCUMENT',
  extracted_by uuid references public.profiles (id),
  reviewed_by uuid references public.profiles (id),
  reviewed_at timestamptz,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_documents_supported_source check (
    source_type in (
      'NOIDA_AUTHORITY',
      'UP_ETENDER',
      'RTI_RESPONSE',
      'GOVERNMENT_NOTICE',
      'OFFICIAL_DOCUMENT'
    )
  ),
  constraint authority_documents_have_provenance check (
    source_url is not null or storage_path is not null
  )
);

alter table public.authority_documents
  add constraint authority_documents_self_ref
  foreign key (source_document_id) references public.authority_documents (id);

create table public.authority_proposed_records (
  id uuid primary key default gen_random_uuid(),
  document_id uuid not null references public.authority_documents (id) on delete cascade,
  entity_kind public.authority_entity_kind not null,
  payload jsonb not null default '{}'::jsonb,
  review_status public.authority_review_status not null default 'PROPOSED',
  review_notes text,
  approved_entity_table text,
  approved_entity_id uuid,
  source_type public.source_type not null,
  source_title text not null,
  source_url text,
  source_document_id uuid not null references public.authority_documents (id),
  publication_date date,
  effective_from date,
  effective_until date,
  extracted_at timestamptz not null default now(),
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  verification_status public.authority_verification_status not null default 'PROPOSED',
  confidence_score numeric(5, 2)
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_proposed_not_auto_verified check (
    verification_status <> 'VERIFIED'
    or review_status = 'APPROVED'
  )
);

create table public.parking_tenders (
  id uuid primary key default gen_random_uuid(),
  tender_number text not null,
  title text,
  sector text,
  cluster text,
  work_circle text,
  contractor_name text,
  notes text,
  is_demo boolean not null default false,
  source_type public.source_type not null,
  source_title text not null,
  source_url text,
  source_document_id uuid references public.authority_documents (id),
  publication_date date,
  effective_from date,
  effective_until date,
  extracted_at timestamptz,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  verification_status public.authority_verification_status not null default 'UNVERIFIED',
  confidence_score numeric(5, 2)
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parking_contract_sites (
  id uuid primary key default gen_random_uuid(),
  contract_id uuid not null references public.parking_contracts (id) on delete cascade,
  parking_site_id uuid not null references public.parking_sites (id) on delete cascade,
  source_type public.source_type not null,
  source_title text not null,
  source_url text,
  source_document_id uuid references public.authority_documents (id),
  publication_date date,
  effective_from date,
  effective_until date,
  extracted_at timestamptz,
  verified_by uuid references public.profiles (id),
  verified_at timestamptz,
  verification_status public.authority_verification_status not null default 'UNVERIFIED',
  confidence_score numeric(5, 2)
    check (confidence_score is null or (confidence_score >= 0 and confidence_score <= 100)),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique (contract_id, parking_site_id)
);

create table public.authority_data_change_log (
  id uuid primary key default gen_random_uuid(),
  table_name text not null,
  record_id uuid not null,
  action text not null,
  old_value jsonb,
  new_value jsonb,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Provenance on existing authority tables
-- ---------------------------------------------------------------------------

alter table public.authority_sources
  add column if not exists source_document_id uuid references public.authority_documents (id),
  add column if not exists publication_date date,
  add column if not exists effective_from date,
  add column if not exists effective_until date,
  add column if not exists extracted_at timestamptz,
  add column if not exists verified_by uuid references public.profiles (id),
  add column if not exists verified_at timestamptz,
  add column if not exists verification_status public.authority_verification_status not null default 'UNVERIFIED',
  add column if not exists confidence_score numeric(5, 2);

alter table public.parking_sites
  add column if not exists tender_number text,
  add column if not exists contract_number text,
  add column if not exists source_type public.source_type,
  add column if not exists source_title text,
  add column if not exists source_document_id uuid references public.authority_documents (id),
  add column if not exists publication_date date,
  add column if not exists effective_from date,
  add column if not exists effective_until date,
  add column if not exists extracted_at timestamptz,
  add column if not exists verified_by uuid references public.profiles (id),
  add column if not exists verified_at timestamptz,
  add column if not exists verification_status public.authority_verification_status not null default 'UNVERIFIED',
  add column if not exists confidence_score numeric(5, 2);

alter table public.parking_contractors
  add column if not exists source_type public.source_type,
  add column if not exists source_title text,
  add column if not exists source_url text,
  add column if not exists source_document_id uuid references public.authority_documents (id),
  add column if not exists publication_date date,
  add column if not exists effective_from date,
  add column if not exists effective_until date,
  add column if not exists extracted_at timestamptz,
  add column if not exists verified_by uuid references public.profiles (id),
  add column if not exists verified_at timestamptz,
  add column if not exists authority_verification_status public.authority_verification_status not null default 'UNVERIFIED',
  add column if not exists confidence_score numeric(5, 2);

alter table public.parking_contracts
  add column if not exists tender_id uuid references public.parking_tenders (id),
  add column if not exists tender_number text,
  add column if not exists source_type public.source_type,
  add column if not exists source_title text,
  add column if not exists publication_date date,
  add column if not exists effective_from date,
  add column if not exists effective_until date,
  add column if not exists extracted_at timestamptz,
  add column if not exists verified_by uuid references public.profiles (id),
  add column if not exists verified_at timestamptz,
  add column if not exists verification_status public.authority_verification_status not null default 'UNVERIFIED',
  add column if not exists confidence_score numeric(5, 2),
  add column if not exists source_document_id uuid references public.authority_documents (id);

alter table public.parking_rates
  add column if not exists source_type public.source_type,
  add column if not exists source_title text,
  add column if not exists source_url text,
  add column if not exists source_document_id uuid references public.authority_documents (id),
  add column if not exists publication_date date,
  add column if not exists extracted_at timestamptz,
  add column if not exists verified_by uuid references public.profiles (id),
  add column if not exists verified_at timestamptz,
  add column if not exists verification_status public.authority_verification_status not null default 'UNVERIFIED',
  add column if not exists confidence_score numeric(5, 2);

-- Named contractors interface (same trusted rows; invoker RLS).
create or replace view public.contractors
  with (security_invoker = true) as
  select * from public.parking_contractors;

-- ---------------------------------------------------------------------------
-- Backfill provenance from existing sources. Demo rows stay UNVERIFIED.
-- ---------------------------------------------------------------------------

update public.authority_sources s
set
  publication_date = coalesce(s.publication_date, s.source_date),
  effective_from = coalesce(s.effective_from, s.effective_date),
  effective_until = coalesce(s.effective_until, s.expiry_date),
  verification_status = case when s.is_demo then 'UNVERIFIED' else s.verification_status end;

update public.parking_sites site
set
  source_type = src.source_type,
  source_title = src.source_title,
  source_url = coalesce(site.source_url, src.source_url),
  publication_date = src.publication_date,
  effective_from = src.effective_from,
  effective_until = src.effective_until
from public.authority_sources src
where site.source_id = src.id
  and site.source_title is null;

update public.parking_contracts c
set
  source_type = src.source_type,
  source_title = src.source_title,
  source_url = coalesce(c.source_url, src.source_url),
  publication_date = src.publication_date,
  effective_from = coalesce(c.effective_from, c.start_date, src.effective_from),
  effective_until = coalesce(c.effective_until, c.end_date, src.effective_until)
from public.authority_sources src
where c.source_id = src.id
  and c.source_title is null;

update public.parking_contractors ctr
set
  source_type = src.source_type,
  source_title = src.source_title,
  source_url = src.source_url,
  publication_date = src.publication_date,
  effective_from = src.effective_from,
  effective_until = src.effective_until
from public.authority_sources src
where ctr.source_id = src.id
  and ctr.source_title is null;

update public.parking_rates r
set
  source_type = src.source_type,
  source_title = src.source_title,
  source_url = src.source_url,
  publication_date = src.publication_date,
  effective_from = coalesce(r.effective_from, src.effective_from),
  effective_to = coalesce(r.effective_to, src.effective_until)
from public.authority_sources src
where r.source_id = src.id
  and r.source_title is null;

insert into public.parking_contract_sites (
  contract_id, parking_site_id, source_type, source_title, source_url,
  publication_date, effective_from, effective_until, verification_status
)
select
  c.id,
  c.parking_site_id,
  coalesce(c.source_type, 'NOIDA_AUTHORITY'),
  coalesce(c.source_title, 'Legacy contract-site link'),
  c.source_url,
  c.publication_date,
  coalesce(c.effective_from, c.start_date),
  coalesce(c.effective_until, c.end_date),
  'UNVERIFIED'
from public.parking_contracts c
where c.parking_site_id is not null
on conflict (contract_id, parking_site_id) do nothing;

-- ---------------------------------------------------------------------------
-- Temporal helper: a missing bound is not an active authorisation.
-- ---------------------------------------------------------------------------

create or replace function public.authority_interval_contains(
  p_from date,
  p_until date,
  p_on date
)
returns boolean
language sql
immutable
as $$
  select p_from is not null
    and p_until is not null
    and p_on is not null
    and p_on between p_from and p_until;
$$;

-- ---------------------------------------------------------------------------
-- Change log (append-only)
-- ---------------------------------------------------------------------------

create or replace function private.log_authority_data_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'INSERT' then
    insert into public.authority_data_change_log (table_name, record_id, action, new_value, actor_id)
    values (tg_table_name, new.id, 'INSERT', to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'UPDATE' then
    insert into public.authority_data_change_log (table_name, record_id, action, old_value, new_value, actor_id)
    values (tg_table_name, new.id, 'UPDATE', to_jsonb(old), to_jsonb(new), auth.uid());
    return new;
  elsif tg_op = 'DELETE' then
    insert into public.authority_data_change_log (table_name, record_id, action, old_value, actor_id)
    values (tg_table_name, old.id, 'DELETE', to_jsonb(old), auth.uid());
    return old;
  end if;
  return null;
end;
$$;

create or replace function private.prevent_authority_log_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Authority data change log is append-only';
end;
$$;

create trigger authority_documents_updated_at before update on public.authority_documents
  for each row execute function private.set_updated_at();
create trigger authority_proposed_updated_at before update on public.authority_proposed_records
  for each row execute function private.set_updated_at();
create trigger parking_tenders_updated_at before update on public.parking_tenders
  for each row execute function private.set_updated_at();
create trigger parking_contract_sites_updated_at before update on public.parking_contract_sites
  for each row execute function private.set_updated_at();

create trigger authority_documents_changelog after insert or update or delete on public.authority_documents
  for each row execute function private.log_authority_data_change();
create trigger authority_proposed_changelog after insert or update or delete on public.authority_proposed_records
  for each row execute function private.log_authority_data_change();
create trigger parking_tenders_changelog after insert or update or delete on public.parking_tenders
  for each row execute function private.log_authority_data_change();
create trigger parking_contract_sites_changelog after insert or update or delete on public.parking_contract_sites
  for each row execute function private.log_authority_data_change();
create trigger authority_sources_changelog after insert or update or delete on public.authority_sources
  for each row execute function private.log_authority_data_change();
create trigger parking_sites_changelog after insert or update or delete on public.parking_sites
  for each row execute function private.log_authority_data_change();
create trigger parking_contractors_changelog after insert or update or delete on public.parking_contractors
  for each row execute function private.log_authority_data_change();
create trigger parking_contracts_changelog after insert or update or delete on public.parking_contracts
  for each row execute function private.log_authority_data_change();
create trigger parking_rates_changelog after insert or update or delete on public.parking_rates
  for each row execute function private.log_authority_data_change();

create trigger authority_log_no_update before update on public.authority_data_change_log
  for each row execute function private.prevent_authority_log_mutation();
create trigger authority_log_no_delete before delete on public.authority_data_change_log
  for each row execute function private.prevent_authority_log_mutation();

-- ---------------------------------------------------------------------------
-- RLS: proposed/documents are staff-only. Verified tables stay publicly readable.
-- ---------------------------------------------------------------------------

alter table public.authority_documents enable row level security;
alter table public.authority_proposed_records enable row level security;
alter table public.parking_tenders enable row level security;
alter table public.parking_contract_sites enable row level security;
alter table public.authority_data_change_log enable row level security;

create policy authority_documents_staff on public.authority_documents
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy authority_proposed_staff on public.authority_proposed_records
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy parking_tenders_read on public.parking_tenders
  for select to anon, authenticated using (true);
create policy parking_tenders_write on public.parking_tenders
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy parking_contract_sites_read on public.parking_contract_sites
  for select to anon, authenticated using (true);
create policy parking_contract_sites_write on public.parking_contract_sites
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy authority_change_log_select on public.authority_data_change_log
  for select to authenticated
  using (private.is_staff());

grant execute on function public.authority_interval_contains(date, date, date)
  to anon, authenticated;

update storage.buckets
set
  file_size_limit = 31457280,
  allowed_mime_types = array[
    'application/pdf',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'text/csv',
    'image/jpeg',
    'image/png',
    'image/webp'
  ]
where id = 'authority-documents';
