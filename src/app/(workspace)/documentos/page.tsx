import { requirePageUser } from "@/lib/auth/session";
import { listImports, reportDocuments } from "@/services/documents";
import { emptyFilters } from "@/lib/documents/filters";
import { DocumentWorkspace } from "@/components/documents/document-workspace";
export const metadata = { title: "Análise de documentos fiscais" };
export default async function Documents() {
  const { supabase, user } = await requirePageUser();
  const [report, imports] = await Promise.all([
    reportDocuments(supabase, emptyFilters),
    listImports(supabase, user.id),
  ]);
  return <DocumentWorkspace initialReport={report} initialImports={imports} />;
}
