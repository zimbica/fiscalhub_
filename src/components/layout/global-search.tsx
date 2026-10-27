"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { ArrowUpRight, Search } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { navigation } from "@/lib/navigation";

export function GlobalSearch() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      if ((event.ctrlKey || event.metaKey) && event.key === "k") {
        event.preventDefault();
        setOpen((value) => !value);
      }
    };
    document.addEventListener("keydown", handler);
    return () => document.removeEventListener("keydown", handler);
  }, []);
  const normalize = (text: string) =>
    text
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .toLowerCase();
  const results = navigation.filter((item) =>
    normalize(item.title).includes(normalize(query)),
  );
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex h-9 items-center gap-2 whitespace-nowrap rounded-md px-3 text-xs text-muted-foreground hover:bg-muted sm:w-56 sm:border sm:bg-muted/40"
      >
        <Search className="size-4" />
        <span className="sr-only sm:not-sr-only">Buscar páginas</span>
        <kbd className="ml-auto hidden shrink-0 whitespace-nowrap rounded border bg-background px-1.5 py-0.5 text-[10px] sm:inline">
          Ctrl K
        </kbd>
      </button>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="sm:max-w-lg">
          <DialogTitle>Ir para uma página</DialogTitle>
          <DialogDescription className="sr-only">
            Navegação e pesquisa de rejeições.
          </DialogDescription>
          <Input
            maxLength={500}
            value={query}
            onChange={(event) => setQuery(event.target.value)}
            aria-label="Nome da página"
            autoFocus
          />
          <div className="space-y-1">
            {results.map(({ title, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setOpen(false)}
                className="flex items-center gap-3 rounded-lg p-3 text-sm hover:bg-muted"
              >
                <Icon className="size-4 text-primary-text" />
                {title}
                <ArrowUpRight className="ml-auto size-4 text-muted-foreground" />
              </Link>
            ))}
            {query.trim() && (
              <Link
                href={`/rejeicoes?q=${encodeURIComponent(query.trim())}`}
                onClick={() => setOpen(false)}
                className="block rounded-lg border p-3 text-sm text-primary-text hover:bg-muted"
              >
                Pesquisar no catálogo de rejeições
                <ArrowUpRight className="ml-2 inline size-4" />
              </Link>
            )}
            {results.length === 0 && (
              <p className="p-4 text-center text-sm text-muted-foreground">
                Nenhuma página encontrada.
              </p>
            )}
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
}
