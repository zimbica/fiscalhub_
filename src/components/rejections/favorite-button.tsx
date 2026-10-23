"use client";
import { useState } from "react";
import { Star, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { apiRequest } from "@/lib/http-client";
export function FavoriteButton({
  code,
  initial,
  onChange,
}: {
  code: string;
  initial: boolean;
  onChange?: (value: boolean) => void;
}) {
  const [favorite, setFavorite] = useState(initial),
    [busy, setBusy] = useState(false);
  async function toggle() {
    setBusy(true);
    try {
      const result = await apiRequest<{ favorite: boolean }>(
        `/api/rejections/${code}`,
        { favorite: !favorite },
        "PATCH",
      );
      setFavorite(result.favorite);
      onChange?.(result.favorite);
      toast.success(
        result.favorite
          ? "Rejeição salva nos favoritos."
          : "Rejeição removida dos favoritos.",
      );
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Falha ao salvar favorito.");
    } finally {
      setBusy(false);
    }
  }
  return (
    <Button
      size="icon"
      variant="outline"
      disabled={busy}
      aria-pressed={favorite}
      aria-label={`${favorite ? "Desfavoritar" : "Favoritar"} rejeição ${code}`}
      onClick={toggle}
    >
      {busy ? (
        <Loader2 className="size-4 animate-spin" />
      ) : (
        <Star
          className={`size-4 ${favorite ? "fill-amber-400 text-amber-500" : ""}`}
        />
      )}
    </Button>
  );
}
