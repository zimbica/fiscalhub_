import { notFound } from "next/navigation";
import { z } from "zod";
import { requirePageUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api";
import { getDocument } from "@/services/documents";
import { DocumentDetailView } from "@/components/documents/document-detail";
export const metadata = { title: "Detalhes do documento" };
export default async function Document({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  if (!z.uuid().safeParse(id).success) notFound();
  const { supabase, user } = await requirePageUser();
  try {
    return (
      <DocumentDetailView data={await getDocument(supabase, user.id, id)} />
    );
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) notFound();
    throw error;
  }
}
