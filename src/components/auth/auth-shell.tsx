import Link from 'next/link';
import { ArrowUpRight, FileCode2, Fingerprint, Layers3, ShieldCheck, Sparkles } from 'lucide-react';
import { Logo } from '@/components/logo';

export function AuthShell({ children }: { children: React.ReactNode }) {
  return <div className="grid min-h-svh lg:grid-cols-[1fr_1.06fr]">
    <aside className="auth-panel relative hidden overflow-hidden bg-[#0c1730] px-12 py-10 text-white lg:flex lg:flex-col xl:px-20">
      <Link href="/entrar" aria-label="FiscalHub — início"><Logo inverse /></Link>
      <div className="relative z-10 my-auto max-w-lg py-16">
        <span className="inline-flex items-center gap-2 rounded-full border border-blue-300/20 bg-blue-400/10 px-3 py-1.5 text-xs font-medium text-blue-200"><Sparkles className="size-3.5" /> Clareza para sua rotina fiscal</span>
        <h1 className="mt-7 text-5xl leading-[1.12] font-semibold tracking-[-0.045em] xl:text-6xl">Um novo olhar.<br /><span className="text-blue-300">Mais controle fiscal.</span></h1>
        <p className="mt-6 max-w-sm text-base leading-7 text-slate-300">Seu espaço para organizar, consultar e analisar documentos fiscais. Construído com segurança, desde o primeiro acesso.</p>
        <div className="relative mt-12 rounded-2xl border border-white/10 bg-white/[0.04] p-6 shadow-2xl backdrop-blur-sm">
          <div className="flex items-center justify-between"><div className="flex items-center gap-3"><span className="flex size-10 items-center justify-center rounded-xl bg-blue-400/15 text-blue-300"><FileCode2 className="size-5" /></span><div><p className="text-sm font-medium">Seu ambiente fiscal</p><p className="mt-0.5 text-xs text-slate-400">Privado. Organizado. Seu.</p></div></div><ShieldCheck className="size-5 text-emerald-300" /></div>
          <div className="mt-6 grid grid-cols-3 gap-3" aria-hidden="true">{['NF-e', 'NFC-e', 'XML'].map((label) => <div key={label} className="rounded-xl border border-white/10 bg-[#101f39] p-4"><Layers3 className="mb-4 size-5 text-blue-300/70" /><span className="text-xs font-medium tracking-wider text-slate-300">{label}</span></div>)}</div>
          <div className="mt-5 flex items-center gap-2 text-xs text-slate-400"><Fingerprint className="size-4 text-blue-300" /> Seu espaço, neste navegador</div>
        </div>
      </div>
      <div className="relative z-10 flex items-center justify-between text-xs text-slate-400"><span>FiscalHub · Simples desde o início</span><Link href="/privacidade" className="flex items-center gap-1 hover:text-white">Privacidade <ArrowUpRight className="size-3" /></Link></div>
    </aside>
    <main className="flex min-h-svh flex-col bg-background px-6 py-8 sm:px-12">
      <div className="mb-10 flex items-center justify-between lg:justify-end"><Link href="/entrar" className="lg:hidden"><Logo /></Link><span className="flex items-center gap-1.5 text-xs text-muted-foreground"><ShieldCheck className="size-3.5" /> Acesso seguro</span></div>
      <div className="mx-auto my-auto w-full max-w-[400px] py-10">{children}</div>
      <p className="mt-10 text-center text-xs leading-6 text-muted-foreground">Seus dados pertencem a você. <Link href="/privacidade" className="underline underline-offset-4 hover:text-primary-text">Conheça os controles de privacidade.</Link></p>
    </main>
  </div>;
}
