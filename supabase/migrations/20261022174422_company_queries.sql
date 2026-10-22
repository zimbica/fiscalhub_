begin;
alter table public.companies add column is_favorite boolean not null default false;
alter table public.companies add column ie_result jsonb not null default '{"outcome":"unavailable","registrations":[],"source":null,"message":"IE não verificada."}';
create index companies_owner_name on public.companies(user_id,legal_name);
create index companies_owner_favorites on public.companies(user_id,queried_at desc) where is_favorite;

create function public.save_company_query(p_cnpj text,p_company jsonb,p_ie jsonb,p_ttl_seconds integer default 86400)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid := (select auth.uid()); company public.companies; registration jsonb;
begin
  if owner_id is null or not public.has_active_session() then raise exception 'Authentication required' using errcode='42501'; end if;
  if p_ttl_seconds < 60 or p_ttl_seconds > 86400 or p_cnpj !~ '^[A-Z0-9]{12}[0-9]{2}$' or p_company->>'cnpj' is distinct from p_cnpj then
    raise exception 'Invalid consultation';
  end if;
  insert into public.companies(user_id,cnpj,legal_name,trade_name,registration_status,data,sources,queried_at,expires_at,ie_result)
  values(owner_id,p_cnpj,p_company->>'legalName',p_company->>'tradeName',p_company->>'status',p_company,p_company->'fieldSources',now(),now()+make_interval(secs=>p_ttl_seconds),p_ie)
  on conflict(user_id,cnpj) do update set legal_name=excluded.legal_name,trade_name=excluded.trade_name,
    registration_status=excluded.registration_status,data=excluded.data,sources=excluded.sources,
    queried_at=excluded.queried_at,expires_at=excluded.expires_at,ie_result=excluded.ie_result
  returning * into company;
  delete from public.state_registrations where user_id=owner_id and company_id=company.id;
  for registration in select value from jsonb_array_elements(p_ie->'registrations') loop
    insert into public.state_registrations(user_id,company_id,uf,registration,status,verified,source_url,queried_at,data)
    values(owner_id,company.id,registration->>'uf',registration->>'registration',registration->>'status',
      (registration->>'verified')::boolean,registration->'source'->>'url',
      (registration->'source'->>'retrievedAt')::timestamptz,registration);
  end loop;
  insert into public.cnpj_queries(user_id,company_id,cnpj,provider,from_cache,outcome)
  values(owner_id,company.id,p_cnpj,'brasilapi',false,'success');
  return jsonb_build_object('id',company.id,'queriedAt',company.queried_at,'expiresAt',company.expires_at);
end;
$$;
revoke all on function public.save_company_query(text,jsonb,jsonb,integer) from public,anon;
grant execute on function public.save_company_query(text,jsonb,jsonb,integer) to authenticated;

create function private.record_cnpj_activity() returns trigger
language plpgsql security definer set search_path='' as $$
begin
  if (select auth.uid())=new.user_id then
    insert into public.activity_events(user_id,action) values(new.user_id,'cnpj_queried');
  end if;
  return new;
end;
$$;
revoke all on function private.record_cnpj_activity() from public,anon,authenticated;
create trigger cnpj_activity after insert on public.cnpj_queries for each row execute function private.record_cnpj_activity();
commit;
