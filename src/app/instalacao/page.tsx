import Link from 'next/link';
import { ArrowRight, Check, Circle, Database, GitBranch, KeyRound, Server } from 'lucide-react';
import { Logo } from '@/components/logo';
import { Button } from '@/components/ui/button';
import { publicEnv, serverConfigured } from '@/lib/env';
export const dynamic = 'force-dynamic';
export const metadata = { title: 'Configurar ambiente' };
export default function Setup() {
  const configured = serverConfigured();
  const items = [
    { name: 'Conexão com o Supabase', ok: Boolean(publicEnv()), description: 'URL do projeto e chave publicável nas variáveis de ambiente.' },
    { name: 'Credenciais do servidor', ok: Boolean(process.env.SUPABASE_SECRET_KEY && process.env.RATE_LIMIT_SECRET), description: 'Chave secreta e segredo do limitador, usados somente no servidor.' },
    { name: 'Endereço da aplicação', ok: Boolean(process.env.NEXT_PUBLIC_APP_URL), description: 'URL usada nos links de confirmação e recuperação.' },
  ];
  return <main className="mx-auto max-w-3xl px-6 py-12"><Logo /><div className="mt-16 rounded-2xl border bg-card p-7 sm:p-10"><span className="inline-flex rounded-xl bg-primary/10 p-3 text-primary"><Database className="size-6" /></span><p className="mt-6 text-xs font-semibold tracking-widest text-primary uppercase">Configuração inicial</p><h1 className="mt-3 text-3xl font-semibold tracking-tight">Conecte seu espaço fiscal.</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">O FiscalHub precisa de um projeto Supabase para autenticar usuários e armazenar dados. As variáveis são configuradas no servidor; nenhuma credencial é solicitada nesta página.</p><div className="my-8 divide-y">{items.map((item) => <div key={item.name} className="flex gap-3 py-5">{item.ok ? <Check className="mt-0.5 size-5 shrink-0 text-emerald-600" /> : <Circle className="mt-0.5 size-5 shrink-0 text-muted-foreground" />}<div><h2 className="text-sm font-medium">{item.name}</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.description}</p></div></div>)}</div><p className="mb-6 text-xs leading-6 text-muted-foreground">Esta página verifica a presença da configuração. Verifique o acesso ao banco e as migrations seguindo o README.</p><Button asChild className="h-10"><Link href={configured ? '/entrar' : '/instalacao'}>{configured ? 'Ir para o login' : 'Verificar configuração novamente'}<ArrowRight /></Link></Button></div><div className="mt-6 grid gap-4 sm:grid-cols-3">{[{ Icon: KeyRound, name: 'Supabase', href: 'https://supabase.com/dashboard', text: 'Criar organização e projeto' }, { Icon: GitBranch, name: 'GitHub', href: 'https://github.com/new?name=fiscalhub&visibility=private', text: 'Criar repositório vazio' }, { Icon: Server, name: 'Vercel', href: 'https://vercel.com/new', text: 'Importar seu repositório' }].map(({ Icon,name,href,text }) => <a key={name} href={href} target="_blank" rel="noreferrer" className="rounded-xl border bg-card p-5 transition hover:border-primary/40"><Icon className="size-5 text-primary" /><h2 className="mt-3 text-sm font-medium">{name}</h2><p className="mt-1 text-xs text-muted-foreground">{text} ↗</p></a>)}</div></main>;
}
