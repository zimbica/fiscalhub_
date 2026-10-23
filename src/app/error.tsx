'use client';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
export default function ErrorPage({ retry }: { retry: () => void }) { return <main className="mx-auto max-w-lg px-6 py-24 text-center"><TriangleAlert className="mx-auto size-9 text-amber-500" /><h1 className="mt-5 text-2xl font-semibold">Não foi possível carregar esta página.</h1><p className="mt-4 text-sm leading-7 text-muted-foreground">Verifique sua conexão e tente carregar a página novamente. Se o problema continuar, aguarde alguns instantes.</p><Button className="mt-6" onClick={retry}>Tentar novamente</Button></main>; }
