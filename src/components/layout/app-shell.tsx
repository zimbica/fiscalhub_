"use client";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useState } from "react";
import { useTheme } from "next-themes";
import {
  ChevronRight,
  Loader2,
  LogOut,
  Menu,
  Moon,
  ShieldCheck,
  Sun,
} from "lucide-react";
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
import { GlobalSearch } from "@/components/layout/global-search";
import { usePreferences } from "@/components/settings/preferences-provider";
import { apiRequest } from "@/lib/http-client";
import { cn } from "@/lib/utils";
import { modules, navigation } from "@/lib/navigation";

export function AppShell({
  fullName,
  children,
}: {
  fullName: string;
  children: React.ReactNode;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [mobileOpen, setMobileOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const { preferences, save, saving } = usePreferences();
  const { resolvedTheme } = useTheme();
  const initials = fullName
    .split(" ")
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0])
    .join("")
    .toUpperCase();
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
  function Sidebar() {
    return (
      <div className="flex h-full flex-col overflow-y-auto px-5 py-7">
        <Link
          href="/painel"
          className="px-2"
          onClick={() => setMobileOpen(false)}
        >
          <Logo />
        </Link>
        <div className="mt-8 flex items-center gap-3 rounded-xl border bg-background px-3 py-3">
          <div className="flex size-9 items-center justify-center rounded-lg bg-primary/10 text-xs font-semibold text-primary">
            {initials}
          </div>
          <div className="min-w-0">
            <p className="truncate text-xs font-semibold">Meu espaço fiscal</p>
            <p className="mt-1 text-[11px] text-muted-foreground">
              Conta individual
            </p>
          </div>
        </div>
        <nav aria-label="Navegação principal" className="mt-7">
          <p className="mb-3 px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Meu espaço
          </p>
          <div className="space-y-1">
            {navigation.slice(0, 5).map(({ title, href, icon: Icon }) => (
              <Link
                key={href}
                href={href}
                onClick={() => setMobileOpen(false)}
                aria-current={pathname === href ? "page" : undefined}
                className={cn(
                  "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] font-medium transition-colors hover:bg-muted",
                  pathname === href
                    ? "bg-primary/10 text-primary"
                    : "text-muted-foreground",
                )}
              >
                <Icon className="size-[17px]" />
                {title}
              </Link>
            ))}
          </div>
          <p className="mt-8 mb-3 px-3 text-[10px] font-semibold tracking-[0.14em] text-muted-foreground uppercase">
            Módulos · próximas etapas
          </p>
          <div className="space-y-1">
            {modules
              .filter((item) => item.stage > 4)
              .map(({ title, icon: Icon, stage }) => (
                <Link
                  key={title}
                  href={`/projeto#etapa-${stage}`}
                  onClick={() => setMobileOpen(false)}
                  className="flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] text-muted-foreground transition-colors hover:bg-muted"
                >
                  <Icon className="size-[17px]" />
                  {title}
                  <span className="ml-auto text-[9px] opacity-70">
                    0{stage}
                  </span>
                </Link>
              ))}
          </div>
        </nav>
        <div className="mt-auto pt-8">
          <div className="mb-5 rounded-xl border border-primary/10 bg-primary/[0.035] p-4">
            <ShieldCheck className="mb-2 size-5 text-primary" />
            <p className="text-xs font-medium">Seu espaço é privado</p>
            <p className="mt-1 text-[11px] leading-5 text-muted-foreground">
              Seus documentos e consultas ficam associados à sua conta.
            </p>
          </div>
          {navigation.slice(5).map(({ title, href, icon: Icon }) => (
            <Link
              key={href}
              href={href}
              onClick={() => setMobileOpen(false)}
              aria-current={pathname === href ? "page" : undefined}
              className={cn(
                "flex h-10 items-center gap-3 rounded-lg px-3 text-[13px] hover:bg-muted",
                pathname === href
                  ? "bg-primary/10 text-primary"
                  : "text-muted-foreground",
              )}
            >
              <Icon className="size-[17px]" />
              {title}
            </Link>
          ))}
          <button
            onClick={logout}
            disabled={leaving}
            className="mt-2 flex h-10 w-full items-center gap-3 rounded-lg px-3 text-[13px] text-muted-foreground hover:bg-muted"
          >
            {leaving ? (
              <Loader2 className="size-4 animate-spin" />
            ) : (
              <LogOut className="size-4" />
            )}
            {leaving ? "Saindo..." : "Sair da conta"}
          </button>
        </div>
      </div>
    );
  }
  return (
    <div className="min-h-svh bg-[#f7f9fc] dark:bg-background">
      <a
        href="#conteudo"
        className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-[100] focus:rounded-lg focus:bg-primary focus:p-3 focus:text-white"
      >
        Ir para o conteúdo
      </a>
      <aside className="fixed inset-y-0 left-0 z-30 hidden w-64 border-r bg-card lg:block">
        <Sidebar />
      </aside>
      <div className="lg:pl-64">
        <header className="sticky top-0 z-20 flex h-[72px] items-center gap-3 border-b bg-card/95 px-4 backdrop-blur sm:px-8">
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
            <SheetContent side="left" className="w-72 gap-0 p-0">
              <SheetTitle className="sr-only">
                Navegação do FiscalHub
              </SheetTitle>
              <SheetDescription className="sr-only">
                Páginas e módulos do seu espaço fiscal.
              </SheetDescription>
              <Sidebar />
            </SheetContent>
          </Sheet>
          <div className="hidden items-center gap-2 text-xs text-muted-foreground md:flex">
            <span>Meu espaço</span>
            <ChevronRight className="size-3" />
            <span className="font-medium text-foreground">
              {navigation.find((item) => item.href === pathname)?.title ||
                "FiscalHub"}
            </span>
          </div>
          <div className="ml-auto flex items-center gap-2 sm:gap-4">
            <GlobalSearch />
            <Button
              variant="ghost"
              size="icon"
              disabled={saving}
              onClick={() =>
                save({
                  ...preferences,
                  theme: resolvedTheme === "dark" ? "light" : "dark",
                })
              }
              aria-label="Alternar tema claro ou escuro"
            >
              <Sun className="hidden dark:block" />
              <Moon className="dark:hidden" />
            </Button>
            <span className="hidden h-6 border-l sm:block" />
            <Link
              href="/configuracoes"
              aria-label="Abrir configurações do perfil"
              className="flex items-center gap-2.5"
            >
              <span className="flex size-9 items-center justify-center rounded-full border border-primary/10 bg-primary/10 text-xs font-semibold text-primary">
                {initials}
              </span>
              <span className="hidden max-w-32 truncate text-xs font-medium xl:block">
                {fullName.split(" ")[0]}
              </span>
            </Link>
          </div>
        </header>
        <main
          id="conteudo"
          className="mx-auto max-w-[1440px] px-4 py-7 sm:px-8 lg:py-9"
        >
          {children}
        </main>
        <footer className="mx-auto flex max-w-[1440px] flex-wrap justify-between gap-2 px-4 py-7 text-[11px] text-muted-foreground sm:px-8">
          <span>FiscalHub · Etapa 4 — Validação XML</span>
          <Link href="/privacidade" className="hover:text-primary">
            Privacidade e seus dados
          </Link>
        </footer>
      </div>
    </div>
  );
}
