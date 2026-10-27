"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Save } from "lucide-react";
import { toast } from "sonner";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/http-client";
import { profileSchema } from "@/lib/auth/schemas";

export function ProfileForm({
  fullName,
  email,
}: {
  fullName: string;
  email: string;
}) {
  const [pending, setPending] = useState(false);
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    try {
      const values = profileSchema.parse(
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      await apiRequest("/api/profile", values, "PATCH");
      toast.success("Perfil atualizado.");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof z.ZodError
          ? error.issues[0].message
          : error instanceof Error
            ? error.message
            : "Não foi possível salvar.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <form onSubmit={submit} className="space-y-5">
      <div className="grid gap-5 sm:grid-cols-2">
        <div className="space-y-2">
          <Label htmlFor="fullName">Apelido</Label>
          <Input
            id="fullName"
            name="fullName"
            defaultValue={fullName}
            autoComplete="nickname"
            required
            minLength={3}
            maxLength={100}
            className="h-10"
          />
        </div>
        {email && (
          <div className="space-y-2">
            <Label htmlFor="accountEmail">E-mail da conta</Label>
            <Input
              id="accountEmail"
              value={email}
              readOnly
              className="h-10 bg-muted/40 text-muted-foreground"
            />
            <p className="text-[11px] text-muted-foreground">
              E-mail da conta.
            </p>
          </div>
        )}
      </div>
      <Button disabled={pending} type="submit" className="h-10">
        {pending ? <Loader2 className="animate-spin" /> : <Save />} Salvar
        perfil
      </Button>
    </form>
  );
}
