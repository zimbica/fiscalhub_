'use client';
import Link from 'next/link';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, CheckCircle2, Eye, EyeOff, Loader2, Mail } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { apiRequest } from '@/lib/http-client';
import { loginSchema, signupSchema, recoverySchema, passwordUpdateSchema } from '@/lib/auth/schemas';

type Mode = 'login' | 'signup' | 'recovery' | 'password';
const copy = {
  login: { title: 'Bom ter você por aqui.', subtitle: 'Entre na sua conta para acessar seu espaço fiscal.', button: 'Entrar na minha conta' },
  signup: { title: 'Comece pelo essencial.', subtitle: 'Crie sua conta e organize seu ambiente de trabalho.', button: 'Criar minha conta' },
  recovery: { title: 'Vamos recuperar seu acesso.', subtitle: 'Informe seu e-mail para receber um link de recuperação.', button: 'Enviar link de recuperação' },
  password: { title: 'Uma nova senha.', subtitle: 'Escolha uma senha forte e exclusiva para sua conta.', button: 'Salvar nova senha' },
};
const schemas = { login: loginSchema, signup: signupSchema, recovery: recoverySchema, password: passwordUpdateSchema };

export function AuthForm({ mode, configured = true, notice }: { mode: Mode; configured?: boolean; notice?: string }) {
  const [pending, setPending] = useState(false);
  const [visible, setVisible] = useState(false);
  const [error, setError] = useState('');
  const [message, setMessage] = useState('');
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setError(''); setPending(true);
    try {
      const values = Object.fromEntries(new FormData(event.currentTarget));
      const data = schemas[mode].parse(values);
      const result = await apiRequest(`/api/auth/${mode}`, data);
      if (result.redirect) { router.replace(result.redirect); router.refresh(); }
      else setMessage(result.message || 'Solicitação concluída.');
    } catch (error) {
      setError(error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : 'Não foi possível continuar.');
    } finally { setPending(false); }
  }
  return <>
    <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary uppercase">{mode === 'signup' ? 'Seu próximo passo' : 'Bem-vindo ao FiscalHub'}</p>
    <h2 className="text-3xl font-semibold tracking-tight">{copy[mode].title}</h2>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">{copy[mode].subtitle}</p>
    {!configured && <div role="alert" className="mt-6 rounded-xl border border-amber-200 bg-amber-50 p-4 text-sm text-amber-900 dark:border-amber-700 dark:bg-amber-950 dark:text-amber-100">Conecte o Supabase para ativar o acesso. <Link href="/instalacao" className="font-medium underline">Ver configuração</Link></div>}
    {notice && <p role="status" className="mt-5 rounded-xl bg-muted p-4 text-sm leading-6">{notice}</p>}
    {message ? <div className="mt-8 rounded-xl border border-emerald-200 bg-emerald-50 p-6 dark:border-emerald-800 dark:bg-emerald-950"><CheckCircle2 className="mb-3 size-6 text-emerald-600" /><p role="status" className="text-sm leading-6">{message}</p><p className="mt-3 text-xs text-muted-foreground">Verifique a caixa de entrada e o spam. Abra o link neste mesmo navegador.</p><Button asChild variant="link" className="mt-4 px-0"><Link href="/entrar">Voltar para o login <ArrowRight /></Link></Button></div> :
    <form onSubmit={submit} className="mt-8 space-y-5" aria-busy={pending}>
      {mode === 'signup' && <div className="space-y-2"><Label htmlFor="fullName">Nome completo</Label><Input id="fullName" name="fullName" autoComplete="name" placeholder="Como podemos chamar você?" required minLength={3} maxLength={100} className="h-11" /></div>}
      {mode !== 'password' && <div className="space-y-2"><Label htmlFor="email">E-mail</Label><div className="relative"><Input id="email" name="email" type="email" autoComplete="email" placeholder="voce@empresa.com.br" required maxLength={254} className="h-11 pr-10" /><Mail aria-hidden="true" className="pointer-events-none absolute top-3.5 right-3 size-4 text-muted-foreground/60" /></div></div>}
      {mode !== 'recovery' && <div className="space-y-2"><div className="flex items-center justify-between"><Label htmlFor="password">{mode === 'password' ? 'Nova senha' : 'Senha'}</Label>{mode === 'login' && <Link href="/recuperar-senha" className="text-xs font-medium text-primary hover:underline">Esqueci minha senha</Link>}</div><div className="relative"><Input id="password" name="password" type={visible ? 'text' : 'password'} autoComplete={mode === 'login' ? 'current-password' : 'new-password'} placeholder={mode === 'login' ? 'Sua senha' : 'Pelo menos 12 caracteres'} required minLength={mode === 'login' ? 1 : 12} maxLength={128} className="h-11 pr-11" /><button type="button" onClick={() => setVisible(!visible)} aria-label={visible ? 'Ocultar senha' : 'Mostrar senha'} className="absolute inset-y-0 right-0 px-3 text-muted-foreground hover:text-primary">{visible ? <EyeOff className="size-4" /> : <Eye className="size-4" />}</button></div>{mode !== 'login' && <p className="text-xs text-muted-foreground">Use pelo menos 12 caracteres. Uma frase longa é uma boa opção.</p>}</div>}
      {(mode === 'signup' || mode === 'password') && <div className="space-y-2"><Label htmlFor="confirmPassword">Confirmar senha</Label><Input id="confirmPassword" name="confirmPassword" type={visible ? 'text' : 'password'} autoComplete="new-password" placeholder="Repita sua senha" required maxLength={128} className="h-11" /></div>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending || !configured} className="h-11 w-full rounded-lg font-medium shadow-sm">{pending ? <><Loader2 className="animate-spin" /> Aguarde...</> : <>{copy[mode].button}<ArrowRight className="ml-auto" /></>}</Button>
    </form>}
    {!message && <p className="mt-7 text-center text-sm text-muted-foreground">{mode === 'login' ? <>Ainda não tem uma conta? <Link href="/cadastro" className="font-medium text-primary hover:underline">Criar conta</Link></> : <>Já tem acesso? <Link href="/entrar" className="font-medium text-primary hover:underline">Voltar para o login</Link></>}</p>}
  </>;
}
