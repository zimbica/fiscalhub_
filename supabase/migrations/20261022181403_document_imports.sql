begin;
alter table public.xml_imports drop constraint xml_imports_status_check;
alter table public.xml_imports add constraint xml_imports_status_check check(status in ('pending','processing','completed','interrupted','failed','deleting'));
alter table public.xml_imports add column error_count integer not null default 0;
alter table public.fiscal_documents drop constraint fiscal_documents_user_id_access_key_key;
alter table public.fiscal_documents add unique(user_id,access_key,environment);
alter table public.fiscal_documents drop constraint fiscal_documents_user_id_import_id_fkey;
alter table public.fiscal_documents add foreign key(user_id,import_id) references public.xml_imports(user_id,id) on delete set null(import_id);
alter table public.fiscal_documents add column content_hash text;
alter table public.fiscal_documents add column base_status text not null default 'unconfirmed' check(base_status in ('unconfirmed','authorized','denied'));
alter table public.fiscal_documents add column operation_type text;
alter table public.fiscal_documents add column issues jsonb not null default '[]';
alter table public.fiscal_documents add column data jsonb not null default '{}';
alter table public.fiscal_documents add column deleting boolean not null default false;
alter table public.fiscal_items add column data jsonb not null default '{}';
alter table public.fiscal_events add column environment text not null check(environment in ('1','2'));
alter table public.fiscal_events add column accepted boolean not null default false;
alter table public.fiscal_events drop constraint fiscal_events_user_id_access_key_event_type_sequence_key;
alter table public.fiscal_events add unique(user_id,access_key,environment,event_type,sequence);
alter table public.fiscal_events add unique(user_id,id);
create index fiscal_items_owner_cfop on public.fiscal_items(user_id,cfop,document_id);
create index fiscal_items_owner_ncm on public.fiscal_items(user_id,ncm,document_id);
create index fiscal_documents_owner_status on public.fiscal_documents(user_id,status);
create table public.import_files (
  id uuid primary key default gen_random_uuid(), user_id uuid not null references public.profiles(id) on delete cascade,
  import_id uuid not null, sha256 text not null check(sha256 ~ '^[a-f0-9]{64}$'),
  filename text not null check(char_length(filename) between 1 and 240),
  outcome text not null check(outcome in ('imported','updated','duplicate','conflict','invalid')),
  message text, original_path text, document_id uuid, event_id uuid, source_data jsonb not null default '{}',
  created_at timestamptz not null default now(),
  foreign key(user_id,import_id) references public.xml_imports(user_id,id) on delete cascade,
  foreign key(user_id,document_id) references public.fiscal_documents(user_id,id) on delete cascade,
  foreign key(user_id,event_id) references public.fiscal_events(user_id,id) on delete cascade,
  unique(user_id,import_id,sha256,filename)
);
create index import_files_document on public.import_files(user_id,document_id);
create index import_files_event on public.import_files(user_id,event_id);
alter table public.import_files enable row level security;
revoke all on public.import_files from anon,authenticated;
grant select,insert,update,delete on public.import_files to authenticated;
grant all on public.import_files to service_role;
create policy owner_access on public.import_files for all to authenticated
using((select auth.uid())=user_id and (select public.has_active_session()))
with check((select auth.uid())=user_id and (select public.has_active_session()));

create function private.refresh_document_evidence(p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare d public.fiscal_documents; f public.import_files; identified_status text;
begin
 select * into d from public.fiscal_documents where id=p_id and user_id=(select auth.uid()) for update;
 if not found then return; end if;
 select * into f from public.import_files where user_id=d.user_id and document_id=d.id
 order by case source_data->>'base_status' when 'authorized' then 0 when 'denied' then 1 else 2 end,created_at desc,id limit 1;
 if not found then if not d.deleting then delete from public.fiscal_documents where id=d.id and user_id=d.user_id; end if; return; end if;
 identified_status:=coalesce(f.source_data->>'base_status','unconfirmed');
 if exists(select 1 from public.fiscal_events where user_id=d.user_id and access_key=d.access_key and environment=d.environment and (event_type='110111' or (event_type='110112' and d.model='65')) and accepted) then identified_status:='cancelled'; end if;
 update public.fiscal_documents set import_id=f.import_id,original_path=f.original_path,sha256=f.sha256,
 base_status=coalesce(f.source_data->>'base_status','unconfirmed'),status=identified_status,
 authorized_at=(f.source_data->>'authorized_at')::timestamptz,evidence=coalesce(f.source_data->'evidence','[]')
 where id=d.id and user_id=d.user_id;
end $$;
revoke all on function private.refresh_document_evidence(uuid) from public,anon;
grant execute on function private.refresh_document_evidence(uuid) to authenticated;

create function private.refresh_event_evidence(p_id uuid) returns void
language plpgsql security invoker set search_path='' as $$
declare e public.fiscal_events; f public.import_files; doc_id uuid;
begin
 select * into e from public.fiscal_events where id=p_id and user_id=(select auth.uid()) for update;
 if not found then return; end if;
 select * into f from public.import_files where user_id=e.user_id and event_id=e.id
 order by (source_data->>'accepted')::boolean desc,created_at desc,id limit 1;
 if not found then delete from public.fiscal_events where id=e.id and user_id=e.user_id;
 else update public.fiscal_events set accepted=(f.source_data->>'accepted')::boolean,
 occurred_at=(f.source_data->>'occurred_at')::timestamptz,registered_at=(f.source_data->>'registered_at')::timestamptz,
 protocol=f.source_data->>'protocol',status_code=f.source_data->>'status_code',original_path=f.original_path,evidence=f.source_data->'evidence'
 where id=e.id and user_id=e.user_id; end if;
 for doc_id in select id from public.fiscal_documents where user_id=e.user_id and access_key=e.access_key and environment=e.environment loop perform private.refresh_document_evidence(doc_id); end loop;
end $$;
revoke all on function private.refresh_event_evidence(uuid) from public,anon;
grant execute on function private.refresh_event_evidence(uuid) to authenticated;

create function private.import_file_deleted() returns trigger language plpgsql security invoker set search_path='' as $$
begin
 -- Auth account deletion cascades without a user JWT. All owned evidence is
 -- being removed; do not invoke owner-only refresh functions as auth_admin.
 if (select auth.uid()) is null then return old; end if;
 if old.document_id is not null then perform private.refresh_document_evidence(old.document_id); end if;
 if old.event_id is not null then perform private.refresh_event_evidence(old.event_id); end if;
 return old;
end $$;
revoke all on function private.import_file_deleted() from public,anon,authenticated;
create trigger refresh_deleted_file after delete on public.import_files for each row execute function private.import_file_deleted();

create function public.save_import_file(p_import_id uuid,p_sha256 text,p_filename text,p_payload jsonb,p_path text default null,p_error text default null)
returns jsonb language plpgsql security invoker set search_path='' as $$
declare owner_id uuid:=(select auth.uid()); job public.xml_imports; receipt public.import_files;
 d public.fiscal_documents; e public.fiscal_events; doc_id uuid; event_id uuid; j jsonb; source jsonb:='{}'::jsonb; result text:='imported'; reason text;
begin
 if owner_id is null or not public.has_active_session() then raise exception 'Authentication required' using errcode='42501'; end if;
 select * into job from public.xml_imports where id=p_import_id and user_id=owner_id for update;
 if not found or job.status='deleting' then raise exception 'Import unavailable' using errcode='42501'; end if;
 select * into receipt from public.import_files where user_id=owner_id and import_id=p_import_id and sha256=p_sha256 and filename=p_filename;
 if found then return jsonb_build_object('id',receipt.id,'outcome',receipt.outcome,'message',receipt.message,'documentId',receipt.document_id,'path',receipt.original_path,'replayed',true); end if;
 if p_path is not null and p_path not like owner_id::text||'/'||p_import_id::text||'/%' then raise exception 'Invalid storage path'; end if;
 if p_error is not null then result:='invalid';reason:=left(p_error,1000);p_path:=null;
 elsif p_payload->>'kind'='document' then
  j:=p_payload->'document';perform pg_advisory_xact_lock(hashtextextended(owner_id::text||(j->>'access_key')||(j->>'environment'),0));
  select * into d from public.fiscal_documents where user_id=owner_id and access_key=j->>'access_key' and environment=j->>'environment' for update;
  if found then
   if d.deleting then raise exception 'Document deletion in progress'; end if;
   if d.content_hash is distinct from j->>'content_hash' then result:='conflict';reason:='Mesma chave e ambiente com conteúdo diferente em infNFe. Original preservado; exige análise.';
   else doc_id:=d.id;result:=case when d.base_status<>'authorized' and j->>'base_status'='authorized' then 'updated' else 'duplicate' end; end if;
  else
   d:=jsonb_populate_record(null::public.fiscal_documents,j);
   insert into public.fiscal_documents(user_id,import_id,access_key,environment,model,layout_version,number,series,issued_at,authorized_at,operation_nature,purpose,emission_type,operation_type,issuer_tax_id,recipient_tax_id,recipient_name,uf,issuer,recipient,total_value,product_value,discount_value,freight_value,tax_totals,other_totals,base_status,status,evidence,content_hash,issues,data)
   values(owner_id,p_import_id,d.access_key,d.environment,d.model,d.layout_version,d.number,d.series,d.issued_at,d.authorized_at,d.operation_nature,d.purpose,d.emission_type,d.operation_type,d.issuer_tax_id,d.recipient_tax_id,d.recipient_name,d.uf,d.issuer,d.recipient,d.total_value,d.product_value,d.discount_value,d.freight_value,d.tax_totals,d.other_totals,d.base_status,d.base_status,d.evidence,d.content_hash,d.issues,d.data) returning id into doc_id;
   insert into public.fiscal_items(user_id,document_id,item_number,code,description,gtin,ncm,cest,cfop,tax_situation,quantity,unit,unit_value,total_value,discount_value,taxes,data)
   select owner_id,doc_id,i.item_number,i.code,i.description,i.gtin,i.ncm,i.cest,i.cfop,i.tax_situation,i.quantity,i.unit,i.unit_value,i.total_value,i.discount_value,i.taxes,i.data from jsonb_populate_recordset(null::public.fiscal_items,j->'items') i;
   insert into public.fiscal_payments(user_id,document_id,method,value,change_value,data)
   select owner_id,doc_id,p.method,p.value,p.change_value,p.data from jsonb_populate_recordset(null::public.fiscal_payments,j->'payments') p;
  end if;
  source:=jsonb_build_object('base_status',j->'base_status','authorized_at',j->'authorized_at','evidence',j->'evidence');
 elsif p_payload->>'kind'='event' then
  j:=p_payload->'event';
  if exists(select 1 from public.fiscal_documents where user_id=owner_id and access_key=j->>'access_key' and environment=j->>'environment' and deleting) then raise exception 'Document deletion in progress'; end if;
  perform pg_advisory_xact_lock(hashtextextended(owner_id::text||(j->>'access_key')||(j->>'environment'),0));
  select * into e from public.fiscal_events where user_id=owner_id and access_key=j->>'access_key' and environment=j->>'environment' and event_type=j->>'event_type' and sequence=(j->>'sequence')::integer for update;
  if found then event_id:=e.id;result:=case when not e.accepted and (j->>'accepted')::boolean then 'updated' else 'duplicate' end;
  else
   e:=jsonb_populate_record(null::public.fiscal_events,j);
   insert into public.fiscal_events(user_id,access_key,environment,event_type,sequence,occurred_at,registered_at,protocol,status_code,accepted,evidence)
   values(owner_id,e.access_key,e.environment,e.event_type,e.sequence,e.occurred_at,e.registered_at,e.protocol,e.status_code,e.accepted,e.evidence) returning id into event_id;
  end if;source:=j;
 else raise exception 'Unsupported payload'; end if;
 insert into public.import_files(user_id,import_id,sha256,filename,outcome,message,original_path,document_id,event_id,source_data)
 values(owner_id,p_import_id,p_sha256,p_filename,result,reason,p_path,doc_id,event_id,source) returning * into receipt;
 if doc_id is not null then perform private.refresh_document_evidence(doc_id); end if;
 if event_id is not null then perform private.refresh_event_evidence(event_id); end if;
 update public.xml_imports set processed_files=processed_files+1,duplicate_files=duplicate_files+case when result='duplicate' then 1 else 0 end,
 error_count=error_count+case when result in ('invalid','conflict') then 1 else 0 end,status='processing' where id=p_import_id and user_id=owner_id;
 return jsonb_build_object('id',receipt.id,'outcome',result,'message',reason,'documentId',doc_id,'path',p_path,'replayed',false);
end $$;
revoke all on function public.save_import_file(uuid,text,text,jsonb,text,text) from public,anon;
grant execute on function public.save_import_file(uuid,text,text,jsonb,text,text) to authenticated;

create function private.import_activity() returns trigger language plpgsql security definer set search_path='' as $$
begin
 if (select auth.uid())=new.user_id and new.status='completed' and old.status is distinct from 'completed' then
 insert into public.activity_events(user_id,action) values(new.user_id,'xml_imported');end if;return new;
end $$;
revoke all on function private.import_activity() from public,anon,authenticated;
create trigger import_activity after update on public.xml_imports for each row execute function private.import_activity();
commit;
