-- Cover the owner/company foreign key used when deleting cached companies.
create index cnpj_queries_owner_company on public.cnpj_queries(user_id,company_id);
