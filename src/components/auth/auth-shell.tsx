import Link from "next/link";
import { Logo } from "@/components/logo";
export function AuthShell({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex min-h-svh flex-col bg-background">
      <header className="flex h-16 items-center justify-between border-b px-6">
        <Link href="/entrar" aria-label="FiscalHub — início">
          <Logo />
        </Link>
        <Link
          href="/privacidade"
          className="text-xs text-muted-foreground hover:text-foreground"
        >
          Privacidade
        </Link>
      </header>
      <main className="flex flex-1 items-center justify-center px-5 py-12">
        <div className="w-full max-w-sm rounded-lg border bg-card p-4 sm:p-8">
          {children}
        </div>
      </main>
    </div>
  );
}
