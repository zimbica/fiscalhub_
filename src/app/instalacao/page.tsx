import Link from "next/link";
import { Logo } from "@/components/logo";
import { Button } from "@/components/ui/button";
import { publicEnv, serverConfigured } from "@/lib/env";
export const dynamic = "force-dynamic";
export const metadata = { title: "Configurar ambiente" };
export default function Setup() {
  const configured = serverConfigured();
  const items = [
    {
      name: "Conexão com o Supabase",
      ok: Boolean(publicEnv()),
      description: "URL do projeto e chave publicável.",
    },
    {
      name: "Credenciais do servidor",
      ok: Boolean(
        process.env.SUPABASE_SECRET_KEY && process.env.RATE_LIMIT_SECRET,
      ),
      description: "Chave secreta e segredo do limitador.",
    },
    {
      name: "Endereço da aplicação",
      ok: Boolean(process.env.NEXT_PUBLIC_APP_URL),
      description: "URL pública configurada no servidor.",
    },
  ];
  return (
    <main className="mx-auto max-w-2xl px-5 py-8">
      <Logo />
      <section className="mt-8 overflow-hidden rounded-lg border bg-card">
        <h1 className="border-b p-4 text-xl font-semibold">
          Configuração do sistema
        </h1>
        <div className="divide-y">
          {items.map((item) => (
            <div
              key={item.name}
              className="flex items-center justify-between gap-4 p-4"
            >
              <div>
                <h2 className="text-sm font-medium">{item.name}</h2>
                <p className="mt-1 text-xs text-muted-foreground">
                  {item.description}
                </p>
              </div>
              <span
                className={`text-xs ${item.ok ? "text-emerald-400" : "text-amber-400"}`}
              >
                {item.ok ? "Configurado" : "Pendente"}
              </span>
            </div>
          ))}
        </div>
        <div className="space-y-4 border-t p-4">
          <p className="text-xs text-muted-foreground">
            Verificação de presença das variáveis; conexão e migrations devem
            ser conferidas conforme o README.
          </p>
          <Button asChild>
            <Link href={configured ? "/entrar" : "/instalacao"}>
              {configured
                ? "Acessar FiscalHub"
                : "Verificar configuração novamente"}
            </Link>
          </Button>
        </div>
      </section>
      <nav
        aria-label="Serviços de infraestrutura"
        className="mt-4 flex flex-wrap gap-5 text-xs text-primary-text"
      >
        {[
          { name: "Supabase", href: "https://supabase.com/dashboard" },
          {
            name: "GitHub",
            href: "https://github.com/new?name=fiscalhub&visibility=private",
          },
          { name: "Vercel", href: "https://vercel.com/new" },
        ].map((item) => (
          <a
            key={item.name}
            href={item.href}
            target="_blank"
            rel="noreferrer"
            className="hover:underline"
          >
            {item.name} ↗
          </a>
        ))}
      </nav>
    </main>
  );
}
