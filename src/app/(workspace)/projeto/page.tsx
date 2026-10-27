import { CheckCircle2, CircleDashed, ExternalLink } from "lucide-react";
import { modules } from "@/lib/navigation";
export const metadata = { title: "Etapas do projeto" };
export default function Project() {
  const stages = [
    {
      stage: 1,
      title: "Fundação",
      description:
        "Next.js, interface responsiva, temas, autenticação Supabase, perfil, exclusão de conta, banco com RLS e histórico de atividade.",
      complete: true,
    },
    ...modules.map((item) => ({ ...item, complete: item.stage <= 5 })),
    {
      stage: 6,
      title: "Revisão e publicação",
      description:
        "Testes completos dos módulos fiscais, revisão de segurança e desempenho, documentação final e implantação na Vercel.",
      complete: false,
    },
  ];
  return (
    <div className="max-w-4xl">
      <h1 className="mt-3 text-xl font-semibold tracking-tight">
        Status do projeto
      </h1>

      <div className="mt-5 divide-y overflow-hidden rounded-md border bg-card">
        {stages.map(({ stage, title, description, complete }) => (
          <section
            id={`etapa-${stage}`}
            key={stage}
            className="scroll-mt-24 p-4"
          >
            <div className="flex items-start gap-4">
              {complete ? (
                <CheckCircle2 className="mt-1 size-4 shrink-0 text-emerald-400" />
              ) : (
                <CircleDashed className="mt-1 size-4 shrink-0 text-muted-foreground/50" />
              )}
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <h2 className="text-base font-semibold">
                    {String(stage).padStart(2, "0")} · {title}
                  </h2>
                  <span
                    className={`rounded-md px-2 py-1 text-[10px] font-medium ${complete ? "bg-emerald-500/10 text-emerald-400 dark:text-emerald-400" : "bg-muted text-muted-foreground"}`}
                  >
                    {complete ? "Implementada" : "Planejada"}
                  </span>
                </div>
                <p className="mt-2 text-xs leading-5 text-muted-foreground">
                  {description}
                </p>
                {stage === 5 && (
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    Base inicial com oito rejeições revisadas, busca local,
                    favoritos e histórico. Não representa todas as rejeições nem
                    pesquisa automática na internet.
                  </p>
                )}
                {stage === 4 && (
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    Motor XSD real com pacote oficial versionado, editor,
                    histórico e regras locais limitadas. Assinatura
                    criptográfica e cobertura fiscal completa continuam não
                    verificadas. Validar localmente não comprova autorização
                    pela SEFAZ.
                  </p>
                )}
                {stage === 2 && (
                  <p className="mt-3 text-xs leading-6 text-muted-foreground">
                    A situação da IE aparece separada da situação do CNPJ. Sem
                    API autorizada, a consulta é identificada como não
                    verificada e são exibidos links oficiais.
                  </p>
                )}
              </div>
            </div>
          </section>
        ))}
      </div>
      <a
        href="https://github.com/zimbica/fiscalhub_"
        target="_blank"
        rel="noreferrer"
        className="mt-7 inline-flex items-center gap-2 text-sm font-medium text-primary-text"
      >
        Acompanhar código no GitHub <ExternalLink className="size-4" />
      </a>
    </div>
  );
}
