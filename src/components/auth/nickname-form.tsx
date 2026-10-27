"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Loader2 } from "lucide-react";
import { z } from "zod";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { nicknameSchema } from "@/lib/auth/schemas";
import { apiRequest } from "@/lib/http-client";

export function NicknameForm({
  configured,
  notice,
}: {
  configured: boolean;
  notice?: string;
}) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setPending(true);
    setError("");
    try {
      const values = nicknameSchema.parse(
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      await apiRequest("/api/auth/anonymous", values);
      router.replace("/painel");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof z.ZodError
          ? error.issues[0].message
          : error instanceof Error
            ? error.message
            : "Não foi possível abrir seu espaço.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <>
      <h1 className="text-xl font-semibold tracking-tight">
        Acessar FiscalHub
      </h1>

      {notice && (
        <p role="status" className="mt-5 rounded-md bg-muted p-4 text-sm">
          {notice}
        </p>
      )}
      <form onSubmit={submit} className="mt-5 space-y-4" aria-busy={pending}>
        <div className="space-y-2">
          <Label htmlFor="nickname">Apelido</Label>
          <Input
            id="nickname"
            name="nickname"
            autoComplete="nickname"
            minLength={3}
            maxLength={100}
            required
            className="h-9"
            aria-describedby="session-notice"
          />
        </div>
        <p
          id="session-notice"
          className="text-xs leading-5 text-muted-foreground"
        >
          Acesso vinculado a este navegador. Sair ou apagar cookies impede
          recuperar os documentos pelo apelido.
        </p>
        {!configured && (
          <p role="alert" className="text-sm text-destructive">
            O acesso está temporariamente indisponível. Tente novamente mais
            tarde.
          </p>
        )}
        {error && (
          <p
            role="alert"
            className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive"
          >
            {error}
          </p>
        )}
        <Button
          type="submit"
          disabled={pending || !configured}
          className="h-9 w-full"
        >
          {pending ? (
            <>
              <Loader2 className="animate-spin" />
              Abrindo seu espaço...
            </>
          ) : (
            <>
              Começar
              <ArrowRight className="ml-auto" />
            </>
          )}
        </Button>
      </form>
    </>
  );
}
