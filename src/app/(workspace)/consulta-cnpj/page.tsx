import { requirePageUser } from '@/lib/auth/session';
import { listCompanies } from '@/services/companies';
import { CompanyWorkspace } from '@/components/companies/company-workspace';
export const metadata={title:'Consulta de CNPJ'};
export default async function CompanyPage(){
  const {supabase,user}=await requirePageUser();
  const history=await listCompanies(supabase,user.id);
  return <CompanyWorkspace initialHistory={history} />;
}
