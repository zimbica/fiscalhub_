import { notFound } from "next/navigation";
import { requirePageUser } from "@/lib/auth/session";
import { ApiError } from "@/lib/api";
import { rejectionDetail } from "@/services/rejections";
import { RejectionArticle } from "@/components/rejections/rejection-article";
export const metadata = { title: "Explicação da rejeição" };
export default async function Page({
  params,
}: {
  params: Promise<{ code: string }>;
}) {
  const { supabase, user } = await requirePageUser();
  const { code } = await params;
  if (!/^\d{3,4}$/.test(code)) notFound();
  try {
    return (
      <RejectionArticle
        entry={await rejectionDetail(supabase, user.id, code)}
      />
    );
  } catch (e) {
    if (e instanceof ApiError && e.status === 404) notFound();
    throw e;
  }
}
