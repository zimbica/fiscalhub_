'use client';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ reset }: { reset: () => void }) { return <main className="mx-auto max-w-lg px-6 py-24 text-center"><TriangleAlert className="mx-auto size-9 text-amber-500" /><h1 className="mt-5 text-2xl font-semibold">Não foi possível carregar esta página.</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Tente novamente. Se o problema continuar após a instalação, verifique a conexão com o Supabase e a aplicação das migrations.</p><Button className="mt-6" onClick={reset}>Tentar novamente</Button></main>; }
