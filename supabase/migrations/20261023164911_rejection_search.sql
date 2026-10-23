begin;
create extension if not exists pg_trgm with schema extensions;
alter table public.rejection_catalog add column revision text not null default 'initial';
alter table public.rejection_catalog add column scope_note text not null default '';
alter table public.rejection_catalog add column related_codes text[] not null default '{}';
alter table public.rejection_catalog add column aliases text[] not null default '{}';
alter table public.rejection_catalog add column search_title text generated always as (lower(translate(title,'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'))) stored;
create index rejection_title_trigram on public.rejection_catalog using gin(search_title extensions.gin_trgm_ops);
create function public.search_rejections(p_query text default '',p_code text default null,p_model text default null,p_favorites boolean default false,p_page integer default 1)
returns jsonb language plpgsql stable security invoker set search_path='' as $$
declare q text:=lower(translate(trim(p_query),'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')); pattern text; result jsonb;
begin
 if not public.has_active_session() then raise exception 'Authentication required' using errcode='42501'; end if;
 if p_query is null or length(p_query)>500 or p_page is null or p_page<1 or p_page>10000 or (p_model is not null and p_model not in ('55','65')) or (p_code is not null and p_code !~ '^[0-9]{3,4}$') then raise exception 'Invalid search'; end if;
 pattern:='%'||replace(replace(replace(q,'\','\\'),'%','\%'),'_','\_')||'%';
 with matched as (
  select c.id,c.code,c.title,c.description,c.models,c.reviewed_at,c.revision,c.aliases,
   exists(select 1 from public.rejection_favorites f where f.user_id=(select auth.uid()) and f.rejection_id=c.id) as favorite,
   case when p_code=c.code then 10 when q=c.search_title or exists(select 1 from unnest(c.aliases) a where lower(translate(a,'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'))=q) then 9 when c.search_title like pattern then 5 when c.search_vector @@ plainto_tsquery('portuguese',p_query) then 3 else extensions.similarity(c.search_title,q) end as score,
   case when p_code=c.code then 'code' when q=c.search_title or exists(select 1 from unnest(c.aliases) a where lower(translate(a,'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc'))=q) then 'exact' when q='' then 'browse' when c.search_title like pattern or c.search_vector @@ plainto_tsquery('portuguese',p_query) then 'text' else 'approximate' end as match_kind
  from public.rejection_catalog c
  where (p_model is null or p_model=any(c.models))
   and (not p_favorites or exists(select 1 from public.rejection_favorites f where f.user_id=(select auth.uid()) and f.rejection_id=c.id))
   and (case when p_code is not null then c.code=p_code else q='' or exists(select 1 from unnest(c.aliases) a where lower(translate(a,'áàâãäéèêëíìîïóòôõöúùûüç','aaaaaeeeeiiiiooooouuuuc')) like pattern) or c.search_title like pattern or c.search_vector @@ plainto_tsquery('portuguese',p_query) or c.search_title operator(extensions.%) q end)
 ), page as(select * from matched order by score desc,code limit 12 offset (p_page-1)*12)
 select jsonb_build_object('items',coalesce((select jsonb_agg(to_jsonb(p)-'score' order by p.score desc,p.code) from page p),'[]'::jsonb),'total',(select count(*) from matched),'page',p_page,'catalogSize',(select count(*) from public.rejection_catalog),'reviewedAt',(select max(reviewed_at) from public.rejection_catalog)) into result;
 return result;
end $$;
revoke all on function public.search_rejections(text,text,text,boolean,integer) from public,anon;
grant execute on function public.search_rejections(text,text,text,boolean,integer) to authenticated;
create function private.rejection_search_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid())=new.user_id and new.kind='rejection' then insert into public.activity_events(user_id,action) values(new.user_id,'rejection_searched'); end if;
 return new;
end $$;
revoke all on function private.rejection_search_activity() from public,anon,authenticated;
create trigger rejection_search_activity after insert on public.search_history for each row execute function private.rejection_search_activity();
commit;
