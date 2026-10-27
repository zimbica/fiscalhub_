"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { ChevronRight, Loader2, LogOut, Menu } from "lucide-react";
import { toast } from "sonner";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetTitle,
  SheetTrigger,
} from "@/components/ui/sheet";
import {
  Dialog,
  DialogContent,
  DialogTitle,
  DialogDescription,
} from "@/components/ui/dialog";
import { GlobalSearch } from "@/components/layout/global-search";
import { apiRequest } from "@/lib/http-client";
import { cn } from "@/lib/utils";
import { navigation } from "@/lib/navigation";

export function AppShell({
  fullName,
  anonymous = false,
  children,
}: {
  fullName: string;
  anonymous?: boolean;
  children: React.ReactNode;
}) {
  const pathname = usePathname(),
    router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false),
    [confirmLogout, setConfirmLogout] = useState(false),
    [leaving, setLeaving] = useState(false);
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
  const active = (href: string) =>
    pathname === href || pathname.startsWith(href + "/");
  async function logout() {
    setLeaving(true);
    try {
      await apiRequest("/api/auth/logout");
      router.replace("/entrar");
      router.refresh();
    } catch (error) {
      toast.error(
        error instanceof Error ? error.message : "Não foi possível sair.",
      );
    } finally {
      setLeaving(false);
    }
  }
  function links(items: typeof navigation) {
    return items.map(({ title, href, icon: Icon }) => (
      <Link
        key={href}
        href={href}
        onClick={() => setMobileOpen(false)}
        aria-current={active(href) ? "page" : undefined}
        className={cn(
          "flex min-h-10 items-center gap-2.5 rounded-md px-3 text-[13px] transition-colors hover:bg-muted",
          active(href)
            ? "bg-accent text-accent-foreground"
            : "text-muted-foreground",
        )}
      >
        <Icon className="size-4" strokeWidth={1.7} />
        {title}
      </Link>
    ));
  }
  function Sidebar() {
    return (
      <div className="flex h-full flex-col">
        <div className="flex h-14 shrink-0 items-center border-b px-5">
          <Link href="/painel" onClick={() => setMobileOpen(false)}>
            <Logo />
          </Link>
        </div>
        <nav
          aria-label="Navegação principal"
          className="flex flex-1 flex-col overflow-y-auto p-3"
        >
          <div className="space-y-1">{links(navigation.slice(0, 6))}</div>
          <div className="mt-auto space-y-1 border-t pt-3">
            {links(navigation.slice(6))}
            <Link
              href="/privacidade"
              onClick={() => setMobileOpen(false)}
              className="block rounded-md px-3 py-2.5 text-xs text-muted-foreground hover:bg-muted"
            >
              Privacidade
            </Link>
          </div>
        </nav>
        <div className="border-t p-3">
          <div className="flex items-center gap-2 rounded-md px-2 py-2">
            <span
              aria-hidden="true"
              className="flex size-7 shrink-0 items-center justify-center rounded bg-secondary text-[10px] font-medium"
            >
              {initials}
            </span>
            <Link
              href="/configuracoes"
              onClick={() => setMobileOpen(false)}
              className="min-w-0 flex-1 truncate text-xs"
            >
              {fullName}
            </Link>
            <Button
              variant="ghost"
              size="icon"
              disabled={leaving}
              aria-label={anonymous ? "Encerrar acesso" : "Sair da conta"}
              onClick={() =>
                anonymous ? setConfirmLogout(true) : void logout()
              }
            >
              {leaving ? (
                <Loader2 className="size-4 animate-spin" />
              ) : (
                <LogOut className="size-4" />
              )}
            </Button>
          </div>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-svh bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded focus:bg-primary focus:p-3 focus:text-white"
      >
        Ir para o conteúdo
      </a>
      <Dialog open={confirmLogout} onOpenChange={setConfirmLogout}>
        <DialogContent>
          <DialogTitle>Encerrar este acesso?</DialogTitle>
          <DialogDescription>
            Você perderá o acesso aos documentos deste espaço. O mesmo apelido
            não recupera os dados. Para removê-los, use Excluir minha conta nas
            configurações.
          </DialogDescription>
          <div className="flex flex-wrap justify-end gap-2">
            <Button
              variant="outline"
              disabled={leaving}
              onClick={() => setConfirmLogout(false)}
            >
              Continuar aqui
            </Button>
            <Button variant="destructive" disabled={leaving} onClick={logout}>
              Encerrar mesmo assim
            </Button>
          </div>
        </DialogContent>
      </Dialog>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-56 border-r bg-sidebar lg:block">
        <Sidebar />
      </aside>
      <div className="min-w-0 lg:pl-56">
        <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background px-4 sm:px-6">
          <Sheet open={mobileOpen} onOpenChange={setMobileOpen}>
            <SheetTrigger asChild>
              <Button
                variant="ghost"
                size="icon"
                aria-label="Abrir menu"
                className="lg:hidden"
              >
                <Menu />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-64 gap-0 bg-sidebar p-0">
              <SheetTitle className="sr-only">
                Navegação do FiscalHub
              </SheetTitle>
              <SheetDescription className="sr-only">
                Ferramentas e configurações.
              </SheetDescription>
              <Sidebar />
            </SheetContent>
          </Sheet>
          <div className="flex min-w-0 items-center gap-2 text-xs">
            <span className="hidden text-muted-foreground sm:inline">
              FiscalHub
            </span>
            <ChevronRight className="hidden size-3 text-muted-foreground sm:block" />
            <span className="truncate">
              {navigation.find((item) => active(item.href))?.title ||
                "FiscalHub"}
            </span>
          </div>
          <div className="ml-auto flex shrink-0 items-center gap-3">
            <GlobalSearch />
            <Link
              href="/configuracoes"
              aria-label={`${initials} — Abrir configurações do perfil`}
              className="flex size-8 items-center justify-center rounded-md border text-[11px] font-medium hover:bg-muted"
            >
              <span aria-hidden="true">{initials}</span>
            </Link>
          </div>
        </header>
        <main
          id="conteudo"
          tabIndex={-1}
          className="workspace-content mx-auto max-w-[1600px] px-4 py-5 sm:px-6"
        >
          {children}
        </main>
      </div>
    </div>
  );
}
