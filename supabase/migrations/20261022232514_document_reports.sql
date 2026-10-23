begin;
create function private.filtered_documents(f jsonb) returns setof public.fiscal_documents
language sql stable security invoker set search_path='' as $$
select d.* from public.fiscal_documents d where d.user_id=(select auth.uid()) and not d.deleting
and (f->>'dateBasis' is distinct from 'authorized' or d.authorized_at is not null)
and (coalesce(f->>'number','')='' or d.number=f->>'number')
and (coalesce(f->>'key','')='' or d.access_key like '%'||(f->>'key')||'%')
and (coalesce(f->>'issuer','')='' or d.issuer_tax_id like '%'||(f->>'issuer')||'%')
and (coalesce(f->>'recipient','')='' or d.recipient_tax_id like '%'||(f->>'recipient')||'%')
and (coalesce(f->>'customer','')='' or d.recipient_name ilike '%'||(f->>'customer')||'%')
and (coalesce(f->>'series','')='' or d.series=f->>'series')
and (coalesce(f->>'model','')='' or d.model=f->>'model')
and (coalesce(f->>'status','')='' or d.status=f->>'status')
and (coalesce(f->>'uf','')='' or d.uf=f->>'uf')
and (coalesce(f->>'environment','')='' or d.environment=f->>'environment')
and (coalesce(f->>'purpose','')='' or d.purpose=f->>'purpose')
and (coalesce(f->>'operationType','')='' or d.operation_type=f->>'operationType')
and (coalesce(f->>'needsReview','')='' or jsonb_array_length(d.issues)>0)
and (coalesce(f->>'min','')='' or d.total_value >= nullif(f->>'min','')::numeric)
and (coalesce(f->>'max','')='' or d.total_value <= nullif(f->>'max','')::numeric)
and (coalesce(f->>'start','')='' or (case when f->>'dateBasis'='authorized' then d.authorized_at else d.issued_at end) >= (nullif(f->>'start','')::date::timestamp at time zone 'America/Sao_Paulo'))
and (coalesce(f->>'end','')='' or (case when f->>'dateBasis'='authorized' then d.authorized_at else d.issued_at end) < ((nullif(f->>'end','')::date+1)::timestamp at time zone 'America/Sao_Paulo'))
and ((coalesce(f->>'cfop','')='' and coalesce(f->>'ncm','')='' and coalesce(f->>'taxSituation','')='' and coalesce(f->>'product','')='') or exists(
 select 1 from public.fiscal_items i where i.user_id=d.user_id and i.document_id=d.id
 and (coalesce(f->>'cfop','')='' or i.cfop=f->>'cfop') and (coalesce(f->>'ncm','')='' or i.ncm=f->>'ncm')
 and (coalesce(f->>'taxSituation','')='' or i.tax_situation=f->>'taxSituation')
 and (coalesce(f->>'product','')='' or i.description ilike '%'||(f->>'product')||'%' or i.code ilike '%'||(f->>'product')||'%')))
and (coalesce(f->>'payment','')='' or exists(select 1 from public.fiscal_payments p where p.user_id=d.user_id and p.document_id=d.id and p.method=f->>'payment'));
$$;
revoke all on function private.filtered_documents(jsonb) from public,anon;
grant execute on function private.filtered_documents(jsonb) to authenticated;

create function public.document_report(p_filters jsonb default '{}',p_page integer default 1,p_export boolean default false)
returns jsonb language sql stable security invoker set search_path='' as $$
with docs as materialized(select * from private.filtered_documents(p_filters)),
items as materialized(select i.* from public.fiscal_items i join docs d on d.id=i.document_id and d.user_id=i.user_id),
payments as materialized(select p.* from public.fiscal_payments p join docs d on d.id=p.document_id and d.user_id=p.user_id),
taxes as materialized(select t.key,t.value::numeric as amount from docs d cross join lateral jsonb_each_text(d.tax_totals) t),
page_rows as (select * from docs order by issued_at desc,id limit case when p_export then 5001 else 25 end offset case when p_export then 0 else (greatest(1,least(10000,p_page))-1)*25 end)
select jsonb_build_object(
 'total',(select count(*) from docs),'page',greatest(1,p_page),'pageSize',25,
 'rows',coalesce((select jsonb_agg(jsonb_build_object('id',d.id,'access_key',d.access_key,'number',d.number,'series',d.series,'model',d.model,'environment',d.environment,'issued_at',d.issued_at,'authorized_at',d.authorized_at,'issuer_tax_id',d.issuer_tax_id,'recipient_tax_id',d.recipient_tax_id,'recipient_name',d.recipient_name,'status',d.status,'total_value',d.total_value::text,'product_value',d.product_value::text,'discount_value',d.discount_value::text,'freight_value',d.freight_value::text,'uf',d.uf,'purpose',d.purpose,'issue_count',jsonb_array_length(d.issues)) order by d.issued_at desc,d.id) from page_rows d),'[]'),
 'metrics',(select jsonb_build_object('count',count(*),'total',coalesce(sum(total_value),0)::text,'nfe',coalesce(sum(total_value) filter(where model='55'),0)::text,'nfce',coalesce(sum(total_value) filter(where model='65'),0)::text,'products',coalesce(sum(product_value),0)::text,'discount',coalesce(sum(discount_value),0)::text,'freight',coalesce(sum(freight_value),0)::text,'average',coalesce(round(avg(total_value),2),0)::text,'authorized',count(*) filter(where status='authorized'),'cancelled',count(*) filter(where status='cancelled'),'unconfirmed',count(*) filter(where status='unconfirmed'),'review',count(*) filter(where jsonb_array_length(issues)>0),'taxes',(select coalesce(sum(amount),0)::text from taxes),'quantity',(select coalesce(sum(quantity),0)::text from items),'quantitiesByUnit',coalesce((select jsonb_agg(to_jsonb(q)) from (select coalesce(unit,'Não informada') as unit,sum(quantity)::text as quantity from items group by unit order by unit) q),'[]'),'items',(select count(*) from items)) from docs),
 'charts',case when p_export then '{}'::jsonb else jsonb_build_object(
  'daily',coalesce((select jsonb_agg(to_jsonb(x) order by label) from (select to_char((case when p_filters->>'dateBasis'='authorized' then authorized_at else issued_at end) at time zone 'America/Sao_Paulo','YYYY-MM-DD') as label,sum(total_value)::text as value,count(*) as count from docs where p_filters->>'dateBasis' is distinct from 'authorized' or authorized_at is not null group by 1 order by 1 desc limit 180) x),'[]'),
  'monthly',coalesce((select jsonb_agg(to_jsonb(x) order by label) from (select to_char((case when p_filters->>'dateBasis'='authorized' then authorized_at else issued_at end) at time zone 'America/Sao_Paulo','YYYY-MM') as label,sum(total_value)::text as value,count(*) as count from docs where p_filters->>'dateBasis' is distinct from 'authorized' or authorized_at is not null group by 1 order by 1 desc limit 36) x),'[]'),
  'models',coalesce((select jsonb_agg(to_jsonb(x)) from (select model as label,sum(total_value)::text as value,count(*) as count from docs group by model order by model) x),'[]'),
  'payments',coalesce((select jsonb_agg(to_jsonb(x)) from (select method as label,sum(value)::text as value from payments group by method order by sum(value) desc limit 20) x),'[]'),
  'products',coalesce((select jsonb_agg(to_jsonb(x)) from (select left(coalesce(code,'')||' · '||description,90) as label,sum(total_value-discount_value)::text as value from items group by code,description order by sum(total_value-discount_value) desc limit 10) x),'[]'),
  'quantities',coalesce((select jsonb_agg(to_jsonb(x)) from (select left(coalesce(code,'')||' · '||description,70)||' ('||coalesce(unit,'s/unid.')||')' as label,sum(quantity)::text as value from items group by code,description,unit order by sum(quantity) desc limit 10) x),'[]'),
  'cfops',coalesce((select jsonb_agg(to_jsonb(x)) from (select coalesce(cfop,'Não informado') as label,sum(total_value)::text as value,count(*) as count from items group by cfop order by count(*) desc limit 10) x),'[]'),
  'states',coalesce((select jsonb_agg(to_jsonb(x)) from (select coalesce(uf,'Não informada') as label,sum(total_value)::text as value,count(*) as count from docs group by uf order by sum(total_value) desc limit 30) x),'[]'),
  'taxes',coalesce((select jsonb_agg(to_jsonb(x)) from (select key as label,sum(amount)::text as value from taxes group by key order by sum(amount) desc) x),'[]')
 ) end
);
$$;
revoke all on function public.document_report(jsonb,integer,boolean) from public,anon;
grant execute on function public.document_report(jsonb,integer,boolean) to authenticated;
create function public.document_details(p_id uuid) returns jsonb
language sql stable security invoker set search_path='' as $$
select jsonb_build_object(
 'document',to_jsonb(d)||jsonb_build_object('total_value',d.total_value::text,'product_value',d.product_value::text,'discount_value',d.discount_value::text,'freight_value',d.freight_value::text),
 'items',coalesce((select jsonb_agg(to_jsonb(i)||jsonb_build_object('quantity',i.quantity::text,'unit_value',i.unit_value::text,'total_value',i.total_value::text,'discount_value',i.discount_value::text) order by i.item_number) from public.fiscal_items i where i.user_id=d.user_id and i.document_id=d.id),'[]'),
 'payments',coalesce((select jsonb_agg(to_jsonb(p)||jsonb_build_object('value',p.value::text,'change_value',p.change_value::text)) from public.fiscal_payments p where p.user_id=d.user_id and p.document_id=d.id),'[]'),
 'events',coalesce((select jsonb_agg(to_jsonb(e) order by e.registered_at desc) from public.fiscal_events e where e.user_id=d.user_id and e.access_key=d.access_key and e.environment=d.environment),'[]'),
 'files',coalesce((select jsonb_agg(jsonb_build_object('id',f.id,'filename',f.filename,'outcome',f.outcome,'created_at',f.created_at,'original_path',f.original_path)) from public.import_files f where f.user_id=d.user_id and f.document_id=d.id),'[]')
) from public.fiscal_documents d where d.user_id=(select auth.uid()) and d.id=p_id;
$$;
revoke all on function public.document_details(uuid) from public,anon;
grant execute on function public.document_details(uuid) to authenticated;
commit;
