"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import { Loader2, Trash2, TriangleAlert } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { apiRequest } from "@/lib/http-client";

export function DeleteAccount({ anonymous = false }: { anonymous?: boolean }) {
  const [open, setOpen] = useState(false);
  const [pending, setPending] = useState(false);
  const [error, setError] = useState("");
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError("");
    setPending(true);
    try {
      const result = await apiRequest(
        "/api/auth/delete",
        Object.fromEntries(new FormData(event.currentTarget)),
      );
      router.replace(result.redirect || "/entrar");
      router.refresh();
    } catch (error) {
      setError(
        error instanceof Error
          ? error.message
          : "Não foi possível excluir sua conta.",
      );
    } finally {
      setPending(false);
    }
  }
  return (
    <Dialog
      open={open}
      onOpenChange={(value) => {
        if (!pending) {
          setOpen(value);
          setError("");
        }
      }}
    >
      <DialogTrigger asChild>
        <Button variant="destructive" className="h-10">
          <Trash2 /> Excluir minha conta
        </Button>
      </DialogTrigger>
      <DialogContent
        className="sm:max-w-md"
        showCloseButton={!pending}
        onInteractOutside={(event) => {
          if (pending) event.preventDefault();
        }}
        onEscapeKeyDown={(event) => {
          if (pending) event.preventDefault();
        }}
      >
        <TriangleAlert className="size-7 text-destructive" />
        <DialogTitle>Excluir conta permanentemente?</DialogTitle>
        <DialogDescription>
          Seu perfil, histórico e documentos serão removidos. Todas as suas
          sessões serão encerradas. Esta ação não pode ser desfeita.
        </DialogDescription>
        <form onSubmit={submit} className="space-y-4">
          {!anonymous && (
            <div className="space-y-2">
              <Label htmlFor="deletePassword">Confirme sua senha atual</Label>
              <Input
                id="deletePassword"
                name="password"
                type="password"
                autoComplete="current-password"
                required
                maxLength={128}
                disabled={pending}
              />
            </div>
          )}
          <div className="space-y-2">
            <Label htmlFor="confirmation">Digite EXCLUIR para confirmar</Label>
            <Input
              id="confirmation"
              name="confirmation"
              autoComplete="off"
              required
              pattern="EXCLUIR"
              placeholder="EXCLUIR"
              disabled={pending}
            />
          </div>
          {error && (
            <p role="alert" className="text-sm text-destructive">
              {error}
            </p>
          )}
          <p className="text-xs leading-5 text-muted-foreground">
            A exclusão pode levar alguns instantes. Se houver falha parcial,
            mantenha esta sessão aberta e tente novamente.
          </p>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => setOpen(false)}
              disabled={pending}
            >
              Cancelar
            </Button>
            <Button type="submit" variant="destructive" disabled={pending}>
              {pending && <Loader2 className="animate-spin" />}Excluir
              permanentemente
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
