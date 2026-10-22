-- FiscalHub / Etapa 1. No fiscal records or rejection articles are seeded.
-- References: docs/architecture.md and docs/sources.md.
begin;
create schema if not exists private;
revoke all on schema private from public, anon;
grant usage on schema private to authenticated, service_role;

create function private.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin new.updated_at = now(); return new; end;
$$;
revoke all on function private.touch_updated_at() from public, anon, authenticated;

-- Auth owns this table; we only check the current caller's session.
create function private.has_active_session() returns boolean
language sql stable security definer set search_path = '' as $$
  select (select auth.uid()) is not null and exists (
    select 1 from auth.sessions s
    where s.user_id = (select auth.uid())
      and s.id::text = (select auth.jwt()->>'session_id')
      and (s.not_after is null or s.not_after > now())
  );
$$;
revoke all on function private.has_active_session() from public, anon;
grant execute on function private.has_active_session() to authenticated;
create function public.has_active_session() returns boolean
language sql stable security invoker set search_path = '' as $$ select private.has_active_session(); $$;
revoke all on function public.has_active_session() from public, anon;
grant execute on function public.has_active_session() to authenticated;

create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text not null check (char_length(full_name) between 3 and 100),
  role text not null default 'user' check (role in ('user', 'admin')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.user_settings (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  theme text not null default 'system' check (theme in ('light','dark','system')),
  accent text not null default 'blue' check (accent in ('blue','purple')),
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create table public.activity_events (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null, created_at timestamptz not null default now()
);
create index activity_events_owner_date on public.activity_events(user_id, created_at desc, id desc);

-- Data model for the following stages. User-facing import/search features are not enabled yet.
create table public.companies (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  cnpj text not null check (cnpj ~ '^[A-Z0-9]{12}[0-9]{2}$'),
  legal_name text not null, trade_name text, registration_status text,
  data jsonb not null default '{}', sources jsonb not null default '{}',
  queried_at timestamptz not null default now(), expires_at timestamptz not null,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique (user_id, cnpj), unique (user_id, id)
);
create table public.cnpj_queries (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid, cnpj text not null, provider text not null,
  from_cache boolean not null default false, outcome text not null,
  created_at timestamptz not null default now(),
  foreign key (user_id, company_id) references public.companies(user_id,id) on delete cascade
);
create table public.state_registrations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  company_id uuid not null, uf text not null check (char_length(uf) = 2), registration text,
  status text not null default 'unverified', verified boolean not null default false,
  source_url text not null, queried_at timestamptz, data jsonb not null default '{}',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  foreign key (user_id, company_id) references public.companies(user_id,id) on delete cascade,
  check (not verified or (registration is not null and queried_at is not null)),
  unique (user_id, company_id, uf, registration)
);
create table public.xml_imports (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  name text not null, status text not null default 'pending' check (status in ('pending','processing','completed','interrupted','failed')),
  total_files integer not null default 0 check (total_files >= 0),
  processed_files integer not null default 0 check (processed_files >= 0),
  duplicate_files integer not null default 0 check (duplicate_files >= 0), errors jsonb not null default '[]',
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(), unique(user_id,id)
);
create table public.fiscal_documents (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  import_id uuid, access_key text not null check (access_key ~ '^[0-9]{44}$'),
  model text not null check (model in ('55','65')), layout_version text not null,
  number text not null, series text not null, issued_at timestamptz not null, authorized_at timestamptz,
  operation_nature text, purpose text, emission_type text, environment text not null check(environment in ('1','2')),
  issuer_tax_id text not null, recipient_tax_id text, recipient_name text, uf text,
  issuer jsonb not null default '{}', recipient jsonb not null default '{}',
  total_value numeric(18,2) not null check(total_value >= 0), product_value numeric(18,2) not null default 0,
  discount_value numeric(18,2) not null default 0, freight_value numeric(18,2) not null default 0,
  tax_totals jsonb not null default '{}', other_totals jsonb not null default '{}',
  status text not null default 'unconfirmed' check(status in ('unconfirmed','authorized','cancelled','denied')),
  evidence jsonb not null default '[]', original_path text, sha256 text,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now(),
  unique(user_id, access_key), unique(user_id,id),
  foreign key (user_id,import_id) references public.xml_imports(user_id,id) on delete cascade
);
create index fiscal_documents_owner_issue on public.fiscal_documents(user_id,issued_at desc,id);
create index fiscal_documents_owner_authorized on public.fiscal_documents(user_id,authorized_at desc);
create index fiscal_documents_import on public.fiscal_documents(user_id,import_id);
create index fiscal_documents_owner_issuer on public.fiscal_documents(user_id,issuer_tax_id);
create table public.fiscal_items (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null, item_number integer not null, code text, description text not null,
  gtin text, ncm text, cest text, cfop text, tax_situation text,
  quantity numeric(21,10) not null, unit text, unit_value numeric(21,10) not null,
  total_value numeric(18,2) not null, discount_value numeric(18,2) not null default 0,
  taxes jsonb not null default '{}', created_at timestamptz not null default now(),
  foreign key (user_id,document_id) references public.fiscal_documents(user_id,id) on delete cascade,
  unique(user_id,document_id,item_number)
);
create table public.fiscal_payments (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid not null, method text not null, value numeric(18,2) not null, change_value numeric(18,2),
  data jsonb not null default '{}', created_at timestamptz not null default now(),
  foreign key (user_id,document_id) references public.fiscal_documents(user_id,id) on delete cascade
);
create index fiscal_payments_document on public.fiscal_payments(user_id,document_id);
create table public.fiscal_events (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  access_key text not null check(access_key ~ '^[0-9]{44}$'), event_type text not null,
  sequence integer not null, occurred_at timestamptz, registered_at timestamptz,
  protocol text, status_code text, original_path text, evidence jsonb not null,
  created_at timestamptz not null default now(), unique(user_id,access_key,event_type,sequence)
);
create table public.schema_versions (
  id uuid primary key default gen_random_uuid(), name text not null, version text not null,
  document_type text not null, source_url text not null, sha256 text not null,
  valid_from date, valid_until date, installed_at timestamptz not null default now(),
  unique(name,version,sha256)
);
create table public.xml_validations (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  document_id uuid, schema_id uuid references public.schema_versions(id),
  document_type text, layout_version text, access_key text,
  structural_result text not null, xsd_result text not null, rules_result text not null,
  error_count integer not null default 0, warning_count integer not null default 0,
  checks_run integer not null default 0, not_verified jsonb not null default '[]',
  created_at timestamptz not null default now(), unique(user_id,id),
  foreign key (user_id,document_id) references public.fiscal_documents(user_id,id) on delete cascade
);
create index xml_validations_document on public.xml_validations(user_id,document_id);
create index xml_validations_schema on public.xml_validations(schema_id);
create table public.validation_issues (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  validation_id uuid not null, severity text not null check(severity in ('error','warning','info')),
  level text not null, rule_id text, rejection_code text, message text not null,
  tag text, xpath text, line integer, column_number integer, found_value text,
  expected_value text, reason text, suggestion text, source jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key (user_id,validation_id) references public.xml_validations(user_id,id) on delete cascade
);
create index validation_issues_validation on public.validation_issues(user_id,validation_id);
create table public.rejection_catalog (
  id uuid primary key default gen_random_uuid(), code text not null unique, title text not null,
  description text not null, explanation text not null, models text[] not null,
  causes jsonb not null default '[]', corrections jsonb not null default '[]', xml_fields text[] not null default '{}',
  example text, valid_from date, valid_until date, reviewed_at timestamptz not null,
  search_vector tsvector generated always as (to_tsvector('portuguese',code || ' ' || title || ' ' || description || ' ' || explanation)) stored,
  created_at timestamptz not null default now(), updated_at timestamptz not null default now()
);
create index rejection_search on public.rejection_catalog using gin(search_vector);
create table public.rejection_sources (
  id uuid primary key default gen_random_uuid(), rejection_id uuid not null references public.rejection_catalog(id) on delete cascade,
  title text not null, url text not null, publisher text not null, is_official boolean not null default false,
  reviewed_at timestamptz not null, unique(rejection_id,url)
);
create table public.rejection_favorites (
  user_id uuid not null references public.profiles(id) on delete cascade,
  rejection_id uuid not null references public.rejection_catalog(id) on delete cascade,
  created_at timestamptz not null default now(), primary key(user_id,rejection_id)
);
create index rejection_favorites_catalog on public.rejection_favorites(rejection_id);
create table public.search_history (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  query text not null check(char_length(query) <= 500), kind text not null,
  result_id uuid references public.rejection_catalog(id) on delete set null,
  created_at timestamptz not null default now()
);
create index search_history_catalog on public.search_history(result_id);

-- Grants are explicit: no public or anonymous access to any user data.
do $$
declare t text;
begin
  foreach t in array array['profiles','user_settings','activity_events','companies','cnpj_queries','state_registrations','xml_imports','fiscal_documents','fiscal_items','fiscal_payments','fiscal_events','xml_validations','validation_issues','rejection_favorites','search_history'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    if t = 'profiles' then
      execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = id and (select public.has_active_session())) with check ((select auth.uid()) = id and (select public.has_active_session()))', t);
    else
      execute format('create policy owner_access on public.%I for all to authenticated using ((select auth.uid()) = user_id and (select public.has_active_session())) with check ((select auth.uid()) = user_id and (select public.has_active_session()))', t);
    end if;
    if t not in ('profiles','user_settings','activity_events') then
      execute format('grant select,insert,update,delete on public.%I to authenticated',t);
      execute format('create index %I on public.%I(user_id,created_at desc)',t || '_owner_date', t);
    end if;
  end loop;
  foreach t in array array['schema_versions','rejection_catalog','rejection_sources'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('revoke all on public.%I from anon, authenticated', t);
    execute format('grant all on public.%I to service_role', t);
    execute format('grant select on public.%I to authenticated', t);
    execute format('create policy authenticated_read on public.%I for select to authenticated using ((select public.has_active_session()))', t);
  end loop;
  foreach t in array array['profiles','user_settings','companies','state_registrations','xml_imports','fiscal_documents','rejection_catalog'] loop
    execute format('create trigger touch_updated_at before update on public.%I for each row execute function private.touch_updated_at()', t);
  end loop;
end;
$$;
grant select on public.profiles, public.user_settings, public.activity_events to authenticated;
grant update(full_name) on public.profiles to authenticated;
grant update(theme,accent) on public.user_settings to authenticated;

-- Trigger-only function: auth.uid() may be null during registration; never callable via API.
create function private.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles(id,full_name) values(new.id,
    case when char_length(trim(coalesce(new.raw_user_meta_data->>'full_name',''))) between 3 and 100
    then trim(new.raw_user_meta_data->>'full_name') else 'Meu perfil' end);
  insert into public.user_settings(user_id) values(new.id);
  insert into public.activity_events(user_id,action) values(new.id,'account_created');
  return new;
end;
$$;
revoke all on function private.handle_new_user() from public,anon,authenticated;
create trigger fiscalhub_new_user after insert on auth.users for each row execute function private.handle_new_user();

create function private.record_profile_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is null then return new; end if;
  if tg_table_name = 'profiles' and new.full_name is distinct from old.full_name then
    insert into public.activity_events(user_id,action) values((select auth.uid()),'profile_updated');
  end if;
  return new;
end;
$$;
revoke all on function private.record_profile_activity() from public,anon,authenticated;
create trigger profile_activity after update on public.profiles for each row execute function private.record_profile_activity();
create function private.record_settings_activity() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  if (select auth.uid()) is not null and (new.theme,new.accent) is distinct from (old.theme,old.accent) then
    insert into public.activity_events(user_id,action) values((select auth.uid()),'preferences_updated');
  end if;
  return new;
end;
$$;
revoke all on function private.record_settings_activity() from public,anon,authenticated;
create trigger settings_activity after update on public.user_settings for each row execute function private.record_settings_activity();

create table private.rate_limits (
  key text primary key check(char_length(key) = 64), attempts integer not null,
  resets_at timestamptz not null
);
alter table private.rate_limits enable row level security;
create index rate_limits_expiry on private.rate_limits(resets_at);
revoke all on private.rate_limits from public,anon,authenticated;
grant all on private.rate_limits to service_role;
create function public.consume_rate_limit(p_key text, p_limit integer, p_window_seconds integer)
returns jsonb language plpgsql security invoker set search_path = '' as $$
declare r private.rate_limits;
begin
  if p_limit < 1 or p_window_seconds < 1 or p_window_seconds > 86400 then raise exception 'Invalid limit'; end if;
  delete from private.rate_limits where resets_at < now() - interval '1 day';
  insert into private.rate_limits(key,attempts,resets_at)
  values(p_key,1,now() + make_interval(secs => p_window_seconds))
  on conflict(key) do update set
    attempts = case when rate_limits.resets_at <= now() then 1 else rate_limits.attempts + 1 end,
    resets_at = case when rate_limits.resets_at <= now() then now() + make_interval(secs => p_window_seconds) else rate_limits.resets_at end
  returning * into r;
  return jsonb_build_object('allowed',r.attempts <= p_limit,'retryAfter',greatest(1,ceil(extract(epoch from r.resets_at-now()))));
end;
$$;
revoke all on function public.consume_rate_limit(text,integer,integer) from public,anon,authenticated;
grant execute on function public.consume_rate_limit(text,integer,integer) to service_role;

create function public.dashboard_summary() returns jsonb
language sql stable security invoker set search_path = '' as $$
  select jsonb_build_object(
    'documents',(select count(*) from public.fiscal_documents where user_id=(select auth.uid())),
    'totalValue',(select coalesce(sum(total_value),0)::text from public.fiscal_documents where user_id=(select auth.uid())),
    'validations',(select count(*) from public.xml_validations where user_id=(select auth.uid())),
    'companies',(select count(*) from public.companies where user_id=(select auth.uid()))
  );
$$;
revoke all on function public.dashboard_summary() from public,anon;
grant execute on function public.dashboard_summary() to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('fiscal-xml','fiscal-xml',false,5242880,array['application/xml','text/xml']);
create policy fiscal_xml_select on storage.objects for select to authenticated
using(bucket_id='fiscal-xml' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.has_active_session()));
create policy fiscal_xml_insert on storage.objects for insert to authenticated
with check(bucket_id='fiscal-xml' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.has_active_session()));
-- Originals are immutable: no UPDATE/upsert policy.
create policy fiscal_xml_delete on storage.objects for delete to authenticated
using(bucket_id='fiscal-xml' and (storage.foldername(name))[1]=(select auth.uid())::text and (select public.has_active_session()));
commit;
