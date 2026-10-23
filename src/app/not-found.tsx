import Link from 'next/link';
import { Button } from '@/components/ui/button';
export default function NotFound() { return <main className="mx-auto max-w-lg px-6 py-24 text-center"><p className="text-sm font-medium text-primary-text">404</p><h1 className="mt-4 text-3xl font-semibold">Página não encontrada</h1><p className="mt-4 text-sm text-muted-foreground">Este endereço não faz parte do seu espaço fiscal.</p><Button asChild className="mt-7"><Link href="/">Voltar ao início</Link></Button></main>; }
