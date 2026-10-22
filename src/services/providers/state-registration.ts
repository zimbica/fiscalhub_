import { ieResultSchema, type StateRegistrationResult } from '@/types/company';
import type { StateRegistrationProvider } from './types';
import { providerJson } from './fetch-json';

export function unavailableIe(message='Situação não disponível para consulta automática. Consulte o cadastro oficial.'):StateRegistrationResult {
  return {outcome:'unavailable',registrations:[],source:null,message};
}
export class ManualStateRegistrationProvider implements StateRegistrationProvider {
  name='official-manual';
  async lookup(){return unavailableIe('Não há um provedor automático de IE configurado. O CNPJ foi consultado, mas nenhuma Inscrição Estadual foi verificada.');}
}
// Optional adapter for an authorized gateway implementing our documented contract.
// No paid provider is enabled or contacted unless an administrator configures it.
export class AuthorizedIeProvider implements StateRegistrationProvider {
  name='authorized-gateway';
  constructor(private endpoint:string,private token:string){}
  async lookup(cnpj:string,uf:string|null){
    try {
      const url=new URL(this.endpoint);
      if(url.protocol!=='https:')return unavailableIe('O provedor de IE precisa usar HTTPS.');
      url.searchParams.set('cnpj',cnpj);if(uf)url.searchParams.set('uf',uf);
      const data=await providerJson(url.toString(),{headers:{Authorization:`Bearer ${this.token}`}});
      const result=ieResultSchema.safeParse(data);
      if(!result.success)return unavailableIe('A fonte de IE retornou dados sem evidência suficiente para confirmar a situação.');
      return result.data;
    }catch{return unavailableIe('A consulta automática de IE não pôde ser concluída. A situação continua não verificada.');}
  }
}
