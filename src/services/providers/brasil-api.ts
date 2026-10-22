import { z } from 'zod';
import { companyDataSchema, type CompanyData } from '@/types/company';
import { normalizeCnpj } from '@/lib/cnpj';
import { providerJson } from './fetch-json';
import { ProviderError, type CompanyProvider } from './types';

const nullableText=z.string().nullish().transform(value=>value?.trim() || null);
const payloadSchema=z.object({
  cnpj:z.string(),razao_social:z.string().min(1),nome_fantasia:nullableText,
  descricao_situacao_cadastral:nullableText,data_situacao_cadastral:nullableText,data_inicio_atividade:nullableText,
  cnae_fiscal:z.union([z.number(),z.string()]).nullish(),cnae_fiscal_descricao:nullableText,
  cnaes_secundarios:z.array(z.object({codigo:z.union([z.number(),z.string()]),descricao:nullableText})).nullish(),
  natureza_juridica:nullableText,opcao_pelo_simples:z.boolean().nullish(),opcao_pelo_mei:z.boolean().nullish(),
  regime_tributario:z.array(z.object({ano:z.number().int(),forma_de_tributacao:z.string()})).nullish(),
  logradouro:nullableText,numero:nullableText,complemento:nullableText,bairro:nullableText,municipio:nullableText,uf:nullableText,cep:nullableText,
  ddd_telefone_1:nullableText,ddd_telefone_2:nullableText,email:nullableText,
});
export function normalizeBrasilApi(payload:unknown,expectedCnpj:string,now=new Date()):CompanyData {
  const parsed=payloadSchema.safeParse(payload);
  if(!parsed.success || normalizeCnpj(parsed.data.cnpj)!==expectedCnpj)throw new ProviderError('invalid_response','A fonte retornou dados incompatíveis com o CNPJ solicitado.');
  const p=parsed.data;
  const source={name:'BrasilAPI · Minha Receita · dados abertos da Receita Federal',url:`https://brasilapi.com.br/api/cnpj/v1/${expectedCnpj}`,retrievedAt:now.toISOString()};
  return companyDataSchema.parse({
    cnpj:expectedCnpj,legalName:p.razao_social,tradeName:p.nome_fantasia,status:p.descricao_situacao_cadastral,statusDate:p.data_situacao_cadastral,openedAt:p.data_inicio_atividade,
    primaryCnae:{code:p.cnae_fiscal==null ? '' : String(p.cnae_fiscal),description:p.cnae_fiscal_descricao},
    secondaryCnaes:(p.cnaes_secundarios || []).filter(item=>String(item.codigo)!=='0').map(item=>({code:String(item.codigo),description:item.descricao})),legalNature:p.natureza_juridica,
    simpleOption:p.opcao_pelo_simples ?? null,meiOption:p.opcao_pelo_mei ?? null,
    taxRegimes:(p.regime_tributario || []).map(item=>({year:item.ano,regime:item.forma_de_tributacao})).sort((a,b)=>b.year-a.year),
    address:{street:p.logradouro,number:p.numero,complement:p.complemento,district:p.bairro,city:p.municipio,uf:p.uf,postalCode:p.cep},
    phones:[p.ddd_telefone_1,p.ddd_telefone_2].filter((value):value is string=>Boolean(value)),email:p.email,
    source,fieldSources:Object.fromEntries(['cnpj','legalName','tradeName','status','statusDate','openedAt','primaryCnae','secondaryCnaes','legalNature','simpleOption','meiOption','taxRegimes','address','phones','email'].map(key=>[key,source])),datasetUpdatedAt:null,
  });
}
export class BrasilApiProvider implements CompanyProvider {
  name='brasilapi';
  async lookup(cnpj:string){
    const payload=await providerJson(`https://brasilapi.com.br/api/cnpj/v1/${encodeURIComponent(cnpj)}`,{
      headers:{Accept:'application/json','User-Agent':'FiscalHub/0.1 (+https://github.com/zimbica/fiscalhub_)'},
    });
    return normalizeBrasilApi(payload,cnpj);
  }
}
