-- Noida Parking Verify — core schema, RLS, storage, and geo helpers.
-- Authority records must retain provenance. Seed/demo rows are flagged is_demo.

create extension if not exists postgis with schema extensions;
create extension if not exists pg_trgm with schema extensions;

create schema if not exists private;
revoke all on schema private from public;
grant usage on schema private to postgres, service_role;

-- ---------------------------------------------------------------------------
-- Enums
-- ---------------------------------------------------------------------------

create type public.user_role as enum ('USER', 'MODERATOR', 'ADMIN');

create type public.parking_type as enum (
  'ON_STREET',
  'OFF_STREET',
  'COMMERCIAL_COMPLEX',
  'MARKET',
  'METRO',
  'VACANT_PLOT',
  'OTHER'
);

create type public.contractor_status as enum ('VERIFIED', 'UNVERIFIED', 'EXPIRED', 'DISPUTED');

create type public.contract_status as enum ('ACTIVE', 'EXPIRED', 'PENDING', 'DISPUTED');

create type public.official_status as enum ('AUTHORISED', 'UNVERIFIED', 'EXPIRED', 'DISPUTED');

create type public.source_type as enum (
  'NOIDA_AUTHORITY',
  'UP_ETENDER',
  'GOVERNMENT_DOCUMENT',
  'OFFICIAL_NOTICE',
  'OTHER'
);

create type public.report_status as enum ('DRAFT', 'SUBMITTED');

create type public.report_visibility as enum ('PRIVATE', 'ANONYMISED_PUBLIC');

create type public.payment_mode as enum ('CASH', 'UPI', 'CARD', 'OTHER');

create type public.evidence_category as enum (
  'PARKING_SIGN',
  'PARKING_BOOTH',
  'OPERATOR_ID',
  'QR_CODE',
  'RECEIPT',
  'PARKING_AREA',
  'OTHER'
);

create type public.classification as enum (
  'VERIFIED_LEGAL',
  'LIKELY_LEGAL',
  'NEEDS_VERIFICATION',
  'POTENTIALLY_UNAUTHORISED',
  'OVERCHARGING',
  'UNKNOWN'
);

create type public.evidence_section_status as enum (
  'VERIFIED',
  'UNCERTAIN',
  'CONFLICTING',
  'UNAVAILABLE'
);

create type public.upi_recipient_kind as enum (
  'UNKNOWN',
  'INDIVIDUAL',
  'CONTRACTOR',
  'AUTHORITY'
);

-- ---------------------------------------------------------------------------
-- Tables
-- ---------------------------------------------------------------------------

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  role public.user_role not null default 'USER',
  display_name text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.authority_sources (
  id uuid primary key default gen_random_uuid(),
  source_type public.source_type not null,
  authority text,
  source_title text not null,
  source_url text,
  source_date date,
  effective_date date,
  expiry_date date,
  source_document_path text,
  extracted_parking_information text,
  extracted_contractor text,
  extracted_rate text,
  notes text,
  is_demo boolean not null default false,
  created_by uuid references public.profiles (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint authority_sources_have_provenance check (
    source_url is not null or source_document_path is not null or source_title is not null
  )
);

create table public.parking_sites (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  sector text,
  address text,
  landmark text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(point, 4326),
  parking_type public.parking_type,
  authority text,
  work_circle text,
  cluster text,
  official_status public.official_status not null default 'UNVERIFIED',
  source_id uuid references public.authority_sources (id),
  source_url text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parking_contractors (
  id uuid primary key default gen_random_uuid(),
  legal_name text not null,
  display_name text,
  contact_phone text,
  contact_email text,
  registration_details jsonb not null default '{}'::jsonb,
  source_id uuid references public.authority_sources (id),
  verification_status public.contractor_status not null default 'UNVERIFIED',
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parking_contracts (
  id uuid primary key default gen_random_uuid(),
  contractor_id uuid not null references public.parking_contractors (id) on delete cascade,
  parking_site_id uuid references public.parking_sites (id) on delete set null,
  contract_number text,
  cluster text,
  work_circle text,
  start_date date,
  end_date date,
  approved_rate numeric(12, 2),
  rate_unit text default 'per visit',
  status public.contract_status not null default 'PENDING',
  source_id uuid references public.authority_sources (id),
  source_url text,
  source_document_path text,
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parking_rates (
  id uuid primary key default gen_random_uuid(),
  parking_site_id uuid references public.parking_sites (id) on delete cascade,
  contract_id uuid references public.parking_contracts (id) on delete set null,
  rate_amount numeric(12, 2) not null,
  currency text not null default 'INR',
  unit text not null default 'per visit',
  vehicle_type text,
  effective_from date,
  effective_to date,
  source_id uuid references public.authority_sources (id),
  notes text,
  is_demo boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.parking_reports (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles (id) on delete cascade,
  status public.report_status not null default 'DRAFT',
  classification public.classification,
  visibility public.report_visibility not null default 'PRIVATE',
  matched_site_id uuid references public.parking_sites (id),
  location_name text,
  sector text,
  duplicate_of uuid references public.parking_reports (id),
  is_demo boolean not null default false,
  submitted_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_locations (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.parking_reports (id) on delete cascade,
  sector text,
  address text,
  landmark text,
  latitude double precision,
  longitude double precision,
  location extensions.geography(point, 4326),
  google_maps_url text,
  description text,
  parking_type public.parking_type,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_operators (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.parking_reports (id) on delete cascade,
  operator_name text,
  attendant_name text,
  attendant_id text,
  phone text,
  uniform_id_visible boolean,
  contractor_on_sign boolean,
  contract_number text,
  parking_licence_number text,
  notes text,
  matched_contractor_id uuid references public.parking_contractors (id),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_payments (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.parking_reports (id) on delete cascade,
  amount numeric(12, 2),
  payment_mode public.payment_mode,
  upi_recipient_name text,
  upi_id text,
  utr text,
  payment_timestamp timestamptz,
  qr_storage_path text,
  receipt_available boolean,
  upi_recipient_kind public.upi_recipient_kind not null default 'UNKNOWN',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_receipts (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.parking_reports (id) on delete cascade,
  receipt_number text,
  parking_number text,
  spot_number text,
  device_number text,
  entry_time timestamptz,
  exit_time timestamptz,
  duration_minutes integer,
  amount numeric(12, 2),
  issuer_name text,
  receipt_text text,
  storage_path text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.report_evidence (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.parking_reports (id) on delete cascade,
  storage_path text not null,
  category public.evidence_category not null default 'OTHER',
  captured_at timestamptz not null default now(),
  uploader_id uuid not null references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.verification_config (
  key text primary key,
  value_numeric numeric,
  value_json jsonb,
  description text,
  updated_at timestamptz not null default now()
);

create table public.verification_results (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null unique references public.parking_reports (id) on delete cascade,
  classification public.classification not null,
  evidence_score integer not null,
  location_score integer not null default 0,
  contract_score integer not null default 0,
  operator_score integer not null default 0,
  rate_score integer not null default 0,
  receipt_score integer not null default 0,
  payment_score integer not null default 0,
  matched_site_id uuid references public.parking_sites (id),
  matched_contract_id uuid references public.parking_contracts (id),
  matched_contractor_id uuid references public.parking_contractors (id),
  distance_meters numeric(12, 2),
  is_overcharging boolean not null default false,
  personal_upi boolean not null default false,
  section_statuses jsonb not null default '{}'::jsonb,
  explanation jsonb not null default '[]'::jsonb,
  admin_override boolean not null default false,
  admin_reason text,
  calculated_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.verification_events (
  id uuid primary key default gen_random_uuid(),
  report_id uuid not null references public.parking_reports (id) on delete cascade,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  actor_id uuid references public.profiles (id),
  created_at timestamptz not null default now()
);

create table public.audit_logs (
  id uuid primary key default gen_random_uuid(),
  actor_id uuid references public.profiles (id),
  action text not null,
  entity text not null,
  entity_id uuid,
  old_value jsonb,
  new_value jsonb,
  created_at timestamptz not null default now()
);

-- ---------------------------------------------------------------------------
-- Indexes
-- ---------------------------------------------------------------------------

create index parking_sites_sector_idx on public.parking_sites (sector);
create index parking_sites_geo_idx on public.parking_sites using gist (location);
create index parking_sites_status_idx on public.parking_sites (official_status);
create index parking_contractors_name_trgm on public.parking_contractors using gin (legal_name extensions.gin_trgm_ops);
create index parking_contracts_contractor_idx on public.parking_contracts (contractor_id);
create index parking_contracts_site_idx on public.parking_contracts (parking_site_id);
create index parking_contracts_number_idx on public.parking_contracts (contract_number);
create index parking_rates_site_idx on public.parking_rates (parking_site_id);
create index parking_reports_user_idx on public.parking_reports (user_id);
create index parking_reports_status_idx on public.parking_reports (status);
create index parking_reports_classification_idx on public.parking_reports (classification);
create index parking_reports_sector_idx on public.parking_reports (sector);
create index parking_reports_created_idx on public.parking_reports (created_at desc);
create index parking_reports_site_idx on public.parking_reports (matched_site_id);
create index report_locations_geo_idx on public.report_locations using gist (location);
create index report_payments_upi_idx on public.report_payments (upi_id);
create index report_receipts_number_idx on public.report_receipts (receipt_number);
create index report_evidence_report_idx on public.report_evidence (report_id);
create index verification_events_report_idx on public.verification_events (report_id, created_at);
create index audit_logs_entity_idx on public.audit_logs (entity, entity_id, created_at desc);
create index audit_logs_actor_idx on public.audit_logs (actor_id, created_at desc);
create index parking_sites_name_trgm on public.parking_sites using gin (name extensions.gin_trgm_ops);

-- ---------------------------------------------------------------------------
-- Private helpers
-- ---------------------------------------------------------------------------

create or replace function private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create or replace function private.sync_geo_point()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.latitude is not null and new.longitude is not null then
    new.location = extensions.st_setsrid(
      extensions.st_makepoint(new.longitude, new.latitude),
      4326
    )::extensions.geography;
  else
    new.location = null;
  end if;
  return new;
end;
$$;

create or replace function private.current_role()
returns public.user_role
language sql
stable
security definer
set search_path = ''
as $$
  select p.role
  from public.profiles p
  where p.id = auth.uid();
$$;

create or replace function private.is_staff()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role in ('ADMIN', 'MODERATOR') from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function private.is_admin()
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select coalesce(
    (select p.role = 'ADMIN' from public.profiles p where p.id = auth.uid()),
    false
  );
$$;

create or replace function private.owns_report(p_report_id uuid)
returns boolean
language sql
stable
security definer
set search_path = ''
as $$
  select exists (
    select 1
    from public.parking_reports r
    where r.id = p_report_id
      and r.user_id = auth.uid()
  );
$$;

create or replace function private.write_audit(
  p_action text,
  p_entity text,
  p_entity_id uuid,
  p_old jsonb default null,
  p_new jsonb default null
)
returns void
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.audit_logs (actor_id, action, entity, entity_id, old_value, new_value)
  values (auth.uid(), p_action, p_entity, p_entity_id, p_old, p_new);
end;
$$;

create or replace function private.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.profiles (id, display_name)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'display_name', split_part(new.email, '@', 1))
  );
  perform private.write_audit('PROFILE_CREATED', 'profiles', new.id, null, jsonb_build_object('id', new.id));
  return new;
end;
$$;

create or replace function private.prevent_role_escalation()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if tg_op = 'UPDATE' and new.role is distinct from old.role then
    if not private.is_admin() then
      raise exception 'Only admins can change roles';
    end if;
    perform private.write_audit(
      'ROLE_CHANGED',
      'profiles',
      new.id,
      jsonb_build_object('role', old.role),
      jsonb_build_object('role', new.role)
    );
  end if;
  return new;
end;
$$;

create or replace function private.audit_authority_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  action_name text;
begin
  if tg_op = 'INSERT' then
    action_name := 'AUTHORITY_RECORD_CREATED';
    perform private.write_audit(action_name, tg_table_name, new.id, null, to_jsonb(new));
    return new;
  elsif tg_op = 'UPDATE' then
    action_name := case
      when tg_table_name = 'parking_contracts' then 'CONTRACT_UPDATED'
      else 'AUTHORITY_RECORD_UPDATED'
    end;
    perform private.write_audit(action_name, tg_table_name, new.id, to_jsonb(old), to_jsonb(new));
    return new;
  elsif tg_op = 'DELETE' then
    perform private.write_audit('AUTHORITY_RECORD_DELETED', tg_table_name, old.id, to_jsonb(old), null);
    return old;
  end if;
  return null;
end;
$$;

create or replace function private.prevent_audit_mutation()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  raise exception 'Audit logs are append-only';
end;
$$;

create or replace function private.report_timeline_on_insert()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.verification_events (report_id, event_type, payload, actor_id)
  values (
    new.id,
    'REPORT_CREATED',
    jsonb_build_object('status', new.status),
    new.user_id
  );
  perform private.write_audit('REPORT_CREATED', 'parking_reports', new.id, null, jsonb_build_object('id', new.id));
  return new;
end;
$$;

-- ---------------------------------------------------------------------------
-- Triggers
-- ---------------------------------------------------------------------------

create trigger profiles_updated_at before update on public.profiles
  for each row execute function private.set_updated_at();
create trigger authority_sources_updated_at before update on public.authority_sources
  for each row execute function private.set_updated_at();
create trigger parking_sites_updated_at before update on public.parking_sites
  for each row execute function private.set_updated_at();
create trigger parking_contractors_updated_at before update on public.parking_contractors
  for each row execute function private.set_updated_at();
create trigger parking_contracts_updated_at before update on public.parking_contracts
  for each row execute function private.set_updated_at();
create trigger parking_rates_updated_at before update on public.parking_rates
  for each row execute function private.set_updated_at();
create trigger parking_reports_updated_at before update on public.parking_reports
  for each row execute function private.set_updated_at();
create trigger report_locations_updated_at before update on public.report_locations
  for each row execute function private.set_updated_at();
create trigger report_operators_updated_at before update on public.report_operators
  for each row execute function private.set_updated_at();
create trigger report_payments_updated_at before update on public.report_payments
  for each row execute function private.set_updated_at();
create trigger report_receipts_updated_at before update on public.report_receipts
  for each row execute function private.set_updated_at();
create trigger verification_results_updated_at before update on public.verification_results
  for each row execute function private.set_updated_at();

create trigger parking_sites_sync_geo before insert or update on public.parking_sites
  for each row execute function private.sync_geo_point();
create trigger report_locations_sync_geo before insert or update on public.report_locations
  for each row execute function private.sync_geo_point();

create trigger on_auth_user_created after insert on auth.users
  for each row execute function private.handle_new_user();

create trigger profiles_prevent_role_escalation before update on public.profiles
  for each row execute function private.prevent_role_escalation();

create trigger authority_sources_audit after insert or update or delete on public.authority_sources
  for each row execute function private.audit_authority_change();
create trigger parking_sites_audit after insert or update or delete on public.parking_sites
  for each row execute function private.audit_authority_change();
create trigger parking_contractors_audit after insert or update or delete on public.parking_contractors
  for each row execute function private.audit_authority_change();
create trigger parking_contracts_audit after insert or update or delete on public.parking_contracts
  for each row execute function private.audit_authority_change();
create trigger parking_rates_audit after insert or update or delete on public.parking_rates
  for each row execute function private.audit_authority_change();

create trigger audit_logs_no_update before update on public.audit_logs
  for each row execute function private.prevent_audit_mutation();
create trigger audit_logs_no_delete before delete on public.audit_logs
  for each row execute function private.prevent_audit_mutation();

create trigger parking_reports_created after insert on public.parking_reports
  for each row execute function private.report_timeline_on_insert();

-- ---------------------------------------------------------------------------
-- Public RPCs (security invoker — RLS still applies)
-- ---------------------------------------------------------------------------

create or replace function public.find_nearby_parking_sites(
  lat double precision,
  long double precision,
  radius_m double precision default 2000
)
returns table (
  id uuid,
  name text,
  sector text,
  address text,
  landmark text,
  latitude double precision,
  longitude double precision,
  parking_type public.parking_type,
  official_status public.official_status,
  is_demo boolean,
  dist_meters double precision
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    s.id,
    s.name,
    s.sector,
    s.address,
    s.landmark,
    s.latitude,
    s.longitude,
    s.parking_type,
    s.official_status,
    s.is_demo,
    extensions.st_distance(
      s.location,
      extensions.st_point(long, lat)::extensions.geography
    ) as dist_meters
  from public.parking_sites s
  where s.location is not null
    and extensions.st_dwithin(
      s.location,
      extensions.st_point(long, lat)::extensions.geography,
      radius_m
    )
  order by s.location operator(extensions.<->) extensions.st_point(long, lat)::extensions.geography
  limit 25;
$$;

create or replace function public.find_nearby_public_reports(
  lat double precision,
  long double precision,
  radius_m double precision default 2000
)
returns table (
  id uuid,
  sector text,
  classification public.classification,
  parking_type public.parking_type,
  approx_latitude double precision,
  approx_longitude double precision,
  dist_meters double precision,
  created_at timestamptz
)
language sql
stable
security invoker
set search_path = ''
as $$
  select
    r.id,
    r.sector,
    r.classification,
    loc.parking_type,
    round(loc.latitude::numeric, 3)::double precision as approx_latitude,
    round(loc.longitude::numeric, 3)::double precision as approx_longitude,
    extensions.st_distance(
      loc.location,
      extensions.st_point(long, lat)::extensions.geography
    ) as dist_meters,
    r.created_at
  from public.parking_reports r
  join public.report_locations loc on loc.report_id = r.id
  where r.visibility = 'ANONYMISED_PUBLIC'
    and r.status = 'SUBMITTED'
    and loc.location is not null
    and extensions.st_dwithin(
      loc.location,
      extensions.st_point(long, lat)::extensions.geography,
      radius_m
    )
  order by loc.location operator(extensions.<->) extensions.st_point(long, lat)::extensions.geography
  limit 25;
$$;

grant execute on function public.find_nearby_parking_sites(double precision, double precision, double precision)
  to anon, authenticated;
grant execute on function public.find_nearby_public_reports(double precision, double precision, double precision)
  to anon, authenticated;

grant execute on function private.current_role() to authenticated;
grant execute on function private.is_staff() to authenticated, anon;
grant execute on function private.is_admin() to authenticated;
grant execute on function private.owns_report(uuid) to authenticated;
grant usage on schema private to authenticated, anon;

-- ---------------------------------------------------------------------------
-- RLS
-- ---------------------------------------------------------------------------

alter table public.profiles enable row level security;
alter table public.authority_sources enable row level security;
alter table public.parking_sites enable row level security;
alter table public.parking_contractors enable row level security;
alter table public.parking_contracts enable row level security;
alter table public.parking_rates enable row level security;
alter table public.parking_reports enable row level security;
alter table public.report_locations enable row level security;
alter table public.report_operators enable row level security;
alter table public.report_payments enable row level security;
alter table public.report_receipts enable row level security;
alter table public.report_evidence enable row level security;
alter table public.verification_config enable row level security;
alter table public.verification_results enable row level security;
alter table public.verification_events enable row level security;
alter table public.audit_logs enable row level security;

-- Profiles
create policy profiles_select_own_or_staff on public.profiles
  for select to authenticated
  using (id = auth.uid() or private.is_staff());

create policy profiles_update_own on public.profiles
  for update to authenticated
  using (id = auth.uid())
  with check (id = auth.uid());

create policy profiles_admin_update on public.profiles
  for update to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Authority data: readable by everyone (civic records), writable by staff
create policy authority_sources_read on public.authority_sources
  for select to anon, authenticated using (true);
create policy authority_sources_write on public.authority_sources
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy parking_sites_read on public.parking_sites
  for select to anon, authenticated using (true);
create policy parking_sites_write on public.parking_sites
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy parking_contractors_read on public.parking_contractors
  for select to anon, authenticated using (true);
create policy parking_contractors_write on public.parking_contractors
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy parking_contracts_read on public.parking_contracts
  for select to anon, authenticated using (true);
create policy parking_contracts_write on public.parking_contracts
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy parking_rates_read on public.parking_rates
  for select to anon, authenticated using (true);
create policy parking_rates_write on public.parking_rates
  for all to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy verification_config_read on public.verification_config
  for select to anon, authenticated using (true);
create policy verification_config_write on public.verification_config
  for all to authenticated
  using (private.is_admin())
  with check (private.is_admin());

-- Reports
create policy reports_insert_own on public.parking_reports
  for insert to authenticated
  with check (user_id = auth.uid());

create policy reports_select_own_staff_or_public on public.parking_reports
  for select to authenticated
  using (
    user_id = auth.uid()
    or private.is_staff()
    or (visibility = 'ANONYMISED_PUBLIC' and status = 'SUBMITTED')
  );

create policy reports_select_public_anon on public.parking_reports
  for select to anon
  using (visibility = 'ANONYMISED_PUBLIC' and status = 'SUBMITTED');

create policy reports_update_own_draft on public.parking_reports
  for update to authenticated
  using (user_id = auth.uid() and status = 'DRAFT')
  with check (user_id = auth.uid());

create policy reports_update_staff on public.parking_reports
  for update to authenticated
  using (private.is_staff())
  with check (private.is_staff());

create policy reports_delete_own_draft on public.parking_reports
  for delete to authenticated
  using (user_id = auth.uid() and status = 'DRAFT');

-- Child report tables
create policy report_locations_select on public.report_locations
  for select to authenticated
  using (private.owns_report(report_id) or private.is_staff());
create policy report_locations_select_public on public.report_locations
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.parking_reports r
      where r.id = report_id
        and r.visibility = 'ANONYMISED_PUBLIC'
        and r.status = 'SUBMITTED'
    )
  );
create policy report_locations_insert on public.report_locations
  for insert to authenticated
  with check (private.owns_report(report_id));
create policy report_locations_update on public.report_locations
  for update to authenticated
  using (
    (private.owns_report(report_id) and exists (
      select 1 from public.parking_reports r where r.id = report_id and r.status = 'DRAFT'
    ))
    or private.is_staff()
  )
  with check (
    private.owns_report(report_id) or private.is_staff()
  );

create policy report_operators_select on public.report_operators
  for select to authenticated
  using (private.owns_report(report_id) or private.is_staff());
create policy report_operators_insert on public.report_operators
  for insert to authenticated
  with check (private.owns_report(report_id));
create policy report_operators_update on public.report_operators
  for update to authenticated
  using (
    (private.owns_report(report_id) and exists (
      select 1 from public.parking_reports r where r.id = report_id and r.status = 'DRAFT'
    ))
    or private.is_staff()
  )
  with check (private.owns_report(report_id) or private.is_staff());

create policy report_payments_select on public.report_payments
  for select to authenticated
  using (private.owns_report(report_id) or private.is_staff());
create policy report_payments_insert on public.report_payments
  for insert to authenticated
  with check (private.owns_report(report_id));
create policy report_payments_update on public.report_payments
  for update to authenticated
  using (
    (private.owns_report(report_id) and exists (
      select 1 from public.parking_reports r where r.id = report_id and r.status = 'DRAFT'
    ))
    or private.is_staff()
  )
  with check (private.owns_report(report_id) or private.is_staff());

create policy report_receipts_select on public.report_receipts
  for select to authenticated
  using (private.owns_report(report_id) or private.is_staff());
create policy report_receipts_insert on public.report_receipts
  for insert to authenticated
  with check (private.owns_report(report_id));
create policy report_receipts_update on public.report_receipts
  for update to authenticated
  using (
    (private.owns_report(report_id) and exists (
      select 1 from public.parking_reports r where r.id = report_id and r.status = 'DRAFT'
    ))
    or private.is_staff()
  )
  with check (private.owns_report(report_id) or private.is_staff());

create policy report_evidence_select on public.report_evidence
  for select to authenticated
  using (private.owns_report(report_id) or private.is_staff());
create policy report_evidence_insert on public.report_evidence
  for insert to authenticated
  with check (private.owns_report(report_id) and uploader_id = auth.uid());

create policy verification_results_select on public.verification_results
  for select to authenticated
  using (private.owns_report(report_id) or private.is_staff());
create policy verification_results_select_public on public.verification_results
  for select to anon, authenticated
  using (
    exists (
      select 1 from public.parking_reports r
      where r.id = report_id
        and r.visibility = 'ANONYMISED_PUBLIC'
        and r.status = 'SUBMITTED'
    )
  );
create policy verification_results_insert_own on public.verification_results
  for insert to authenticated
  with check (private.owns_report(report_id) or private.is_staff());
create policy verification_results_update_own_or_staff on public.verification_results
  for update to authenticated
  using (private.owns_report(report_id) or private.is_staff())
  with check (private.owns_report(report_id) or private.is_staff());

create policy verification_events_select on public.verification_events
  for select to authenticated
  using (private.owns_report(report_id) or private.is_staff());
create policy verification_events_insert on public.verification_events
  for insert to authenticated
  with check (private.owns_report(report_id) or private.is_staff());

create policy audit_logs_select_staff on public.audit_logs
  for select to authenticated
  using (private.is_staff() or actor_id = auth.uid());

-- No insert policy on audit_logs for authenticated — only security definer writes.

-- ---------------------------------------------------------------------------
-- Storage
-- ---------------------------------------------------------------------------

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  (
    'evidence',
    'evidence',
    false,
    10485760,
    array['image/jpeg', 'image/png', 'image/webp', 'image/heic', 'application/pdf']
  ),
  (
    'authority-documents',
    'authority-documents',
    false,
    20971520,
    array['application/pdf', 'image/jpeg', 'image/png', 'image/webp']
  )
on conflict (id) do nothing;

create policy evidence_insert_own
  on storage.objects for insert to authenticated
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy evidence_select_own
  on storage.objects for select to authenticated
  using (
    bucket_id = 'evidence'
    and (
      (storage.foldername(name))[1] = auth.uid()::text
      or private.is_staff()
    )
  );

create policy evidence_update_own
  on storage.objects for update to authenticated
  using (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  )
  with check (
    bucket_id = 'evidence'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy authority_docs_select
  on storage.objects for select to authenticated
  using (bucket_id = 'authority-documents');

create policy authority_docs_write
  on storage.objects for insert to authenticated
  with check (bucket_id = 'authority-documents' and private.is_staff());

create policy authority_docs_update
  on storage.objects for update to authenticated
  using (bucket_id = 'authority-documents' and private.is_staff())
  with check (bucket_id = 'authority-documents' and private.is_staff());
