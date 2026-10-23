import { requirePageUser } from "@/lib/auth/session";
import { searchInput } from "@/lib/rejections/query";
import { searchRejections, rejectionHistory } from "@/services/rejections";
import { RejectionWorkspace } from "@/components/rejections/rejection-workspace";
export const metadata = { title: "Consulta de Rejeições" };
export default async function Page({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { supabase, user } = await requirePageUser();
  const params = await searchParams;
  const query = typeof params.q === "string" ? params.q.slice(0, 500) : "";
  const [results, history] = await Promise.all([
    searchRejections(supabase, user.id, searchInput.parse({ query })),
    rejectionHistory(supabase, user.id),
  ]);
  return (
    <RejectionWorkspace
      initialResults={results}
      initialHistory={history}
      initialQuery={query}
    />
  );
}
