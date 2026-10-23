import { z } from "zod";
import { requirePageUser } from "@/lib/auth/session";
import { listValidations } from "@/services/validations";
import { ValidationWorkspace } from "@/components/validation/validation-workspace";
export const metadata = { title: "Validador de XML" };
export default async function Validator({
  searchParams,
}: {
  searchParams: Promise<{ source?: string }>;
}) {
  const { supabase, user } = await requirePageUser();
  const params = await searchParams;
  const source = z.uuid().safeParse(params.source);
  return (
    <ValidationWorkspace
      initialHistory={await listValidations(supabase, user.id)}
      initialSource={source.success ? source.data : undefined}
    />
  );
}
