import { ScanLine } from 'lucide-react';
import { cn } from '@/lib/utils';

export function Logo({ inverse = false }: { inverse?: boolean }) {
  return <span className="inline-flex items-center gap-2.5">
    <span className={cn('flex size-9 items-center justify-center rounded-xl bg-primary text-white shadow-sm', inverse && 'bg-white/10 ring-1 ring-white/20')}><ScanLine className="size-5" strokeWidth={2.2} /></span>
    <span className={cn('text-xl font-semibold tracking-tight', inverse && 'text-white')}>Fiscal<span className={inverse ? 'text-blue-300' : 'text-primary-text'}>Hub</span></span>
  </span>;
}
