'use client';
import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ArrowRight, Loader2 } from 'lucide-react';
import { z } from 'zod';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { nicknameSchema } from '@/lib/auth/schemas';
import { apiRequest } from '@/lib/http-client';

export function NicknameForm({ configured, notice }: { configured: boolean; notice?: string }) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState('');
  const router = useRouter();
  async function submit(event: React.FormEvent<HTMLFormElement>) {
    event.preventDefault(); setPending(true); setError('');
    try {
      const values = nicknameSchema.parse(Object.fromEntries(new FormData(event.currentTarget)));
      await apiRequest('/api/auth/anonymous', values);
      router.replace('/painel'); router.refresh();
    } catch (error) {
      setError(error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : 'Não foi possível abrir seu espaço.');
    } finally { setPending(false); }
  }
  return <>
    <p className="mb-3 text-xs font-semibold tracking-[0.16em] text-primary-text uppercase">Seu espaço fiscal</p>
    <h1 className="text-3xl font-semibold tracking-tight">Como podemos chamar você?</h1>
    <p className="mt-3 text-sm leading-6 text-muted-foreground">Escolha um apelido e comece. Sem e-mail ou senha.</p>
    {notice && <p role="status" className="mt-5 rounded-xl bg-muted p-4 text-sm">{notice}</p>}
    <form onSubmit={submit} className="mt-8 space-y-5" aria-busy={pending}>
      <div className="space-y-2"><Label htmlFor="nickname">Apelido</Label><Input id="nickname" name="nickname" autoComplete="nickname" minLength={3} maxLength={100} required placeholder="Seu apelido" className="h-11" aria-describedby="session-notice" /></div>
      <p id="session-notice" className="text-xs leading-6 text-muted-foreground">Seus documentos ficam ligados a este navegador. Apagar os dados do navegador, encerrar o acesso ou usar outro aparelho não recupera o mesmo espaço. O apelido não funciona como senha.</p>
      {!configured && <p role="alert" className="text-sm text-destructive">O acesso está temporariamente indisponível. Tente novamente mais tarde.</p>}
      {error && <p role="alert" className="rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={pending || !configured} className="h-11 w-full">{pending ? <><Loader2 className="animate-spin" />Abrindo seu espaço...</> : <>Começar<ArrowRight className="ml-auto" /></>}</Button>
    </form>
  </>;
}
