import { ProviderError } from './types';

export async function providerJson(url:string,options:RequestInit={}) {
  try {
    const response=await fetch(url,{...options,cache:'no-store',redirect:'error',signal:AbortSignal.timeout(10000)});
    if(response.status===404)throw new ProviderError('not_found','CNPJ não encontrado na fonte consultada. Isso não comprova inexistência na Receita Federal.');
    if(response.status===400)throw new ProviderError('unsupported','A fonte não conseguiu consultar este identificador. Verifique no portal oficial.');
    if(!response.ok)throw new ProviderError('unavailable','A fonte de consulta está temporariamente indisponível.');
    if(!response.headers.get('content-type')?.includes('json'))throw new ProviderError('invalid_response','A fonte retornou um formato inesperado.');
    const reader=response.body?.getReader();if(!reader)throw new ProviderError('invalid_response','Resposta vazia.');
    let size=0;const chunks:Uint8Array[]=[];
    for(;;){const {value,done}=await reader.read();if(done)break;size+=value.byteLength;if(size>1_048_576){await reader.cancel();throw new ProviderError('invalid_response','Resposta da fonte excedeu o limite.');}chunks.push(value);}
    return JSON.parse(Buffer.concat(chunks).toString('utf8')) as unknown;
  }catch(error){if(error instanceof ProviderError)throw error;throw new ProviderError('unavailable','Não foi possível concluir a consulta na fonte externa. Tente novamente mais tarde.');}
}
