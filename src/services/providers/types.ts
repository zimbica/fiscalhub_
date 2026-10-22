import type { CompanyData, StateRegistrationResult } from '@/types/company';
export interface CompanyProvider { name:string;lookup(cnpj:string):Promise<CompanyData> }
export interface StateRegistrationProvider { name:string;lookup(cnpj:string,uf:string|null):Promise<StateRegistrationResult> }
export class ProviderError extends Error {
  constructor(public code:'not_found'|'unavailable'|'invalid_response'|'unsupported',message:string) {super(message);}
}
