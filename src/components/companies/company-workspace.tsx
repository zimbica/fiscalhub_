'use client';
import { useState } from 'react';
import { Building2, Search, Loader2, Star, Trash2, ChevronLeft, ChevronRight, ArrowUpRight } from 'lucide-react';
import { toast } from 'sonner';
import { z } from 'zod';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Button } from '@/components/ui/button';
import { Dialog,DialogContent,DialogTitle,DialogDescription } from '@/components/ui/dialog';
import { CompanyResult } from './company-result';
import { apiRequest } from '@/lib/http-client';
import { formatCnpj } from '@/lib/cnpj';
import { dateTime } from '@/lib/format';
import { lookupSchema,type CompanyLookup,type CompanyHistory,type CompanyHistoryEntry } from '@/types/company';

export function CompanyWorkspace({initialHistory}:{initialHistory:CompanyHistory}){
  const [cnpj,setCnpj]=useState('');const [pending,setPending]=useState(false);const [error,setError]=useState('');
  const [result,setResult]=useState<CompanyLookup|null>(null);const [history,setHistory]=useState(initialHistory);
  const [query,setQuery]=useState('');const [onlyFavorites,setOnlyFavorites]=useState(false);const [historyBusy,setHistoryBusy]=useState(false);
  const [removing,setRemoving]=useState<CompanyHistoryEntry|null>(null);const [mutationBusy,setMutationBusy]=useState(false);
  async function loadHistory(page=1,favorites=onlyFavorites){
    setHistoryBusy(true);
    try{setHistory(await apiRequest<CompanyHistory>(`/api/companies?${new URLSearchParams({q:query,page:String(page),favorites:String(favorites)})}`,undefined,'GET'));}
    catch(error){toast.error(error instanceof Error ? error.message : 'Não foi possível carregar o histórico.');}
    finally{setHistoryBusy(false);}
  }
  async function lookup(value=cnpj,refresh=false){
    setError('');setPending(true);
    try{
      const body=lookupSchema.parse({cnpj:value,refresh});
      const response=await apiRequest<CompanyLookup>('/api/companies',body);setResult(response);setCnpj(formatCnpj(response.company.cnpj));
      if(response.warning)toast.warning(response.warning);else toast.success(response.fromCache ? 'Consulta recuperada do seu cache.' : 'Consulta realizada e salva.');
      await loadHistory();
    }catch(error){setError(error instanceof z.ZodError ? error.issues[0].message : error instanceof Error ? error.message : 'Não foi possível consultar.');setResult(null);}
    finally{setPending(false);}
  }
  async function favorite(company:CompanyHistoryEntry){
    setMutationBusy(true);
    try{await apiRequest(`/api/companies/${company.id}`,{favorite:!company.is_favorite},'PATCH');await loadHistory(history.page);toast.success(company.is_favorite ? 'Empresa removida dos favoritos.' : 'Empresa favoritada.');}
    catch(error){toast.error(error instanceof Error ? error.message : 'Não foi possível salvar o favorito.');}
    finally{setMutationBusy(false);}
  }
  async function remove(){
    if(!removing)return;setMutationBusy(true);
    try{await apiRequest(`/api/companies/${removing.id}`,undefined,'DELETE');if(result?.id===removing.id)setResult(null);setRemoving(null);await loadHistory();toast.success('Empresa removida do seu histórico.');}
    catch(error){toast.error(error instanceof Error ? error.message : 'Não foi possível remover.');}
    finally{setMutationBusy(false);}
  }
  const pages=Math.max(1,Math.ceil(history.total/history.pageSize));
  return <div className="space-y-6"><div><p className="text-xs font-medium text-primary">CONSULTA CADASTRAL</p><h1 className="mt-2 text-2xl font-semibold tracking-tight">Conheça a empresa por trás do CNPJ.</h1><p className="mt-2 text-sm text-muted-foreground">Consulte dados públicos, identifique a fonte e mantenha seu histórico organizado.</p></div>
  <section className="rounded-xl border bg-card p-6"><form onSubmit={event=>{event.preventDefault();void lookup();}} className="flex flex-col gap-3 sm:flex-row sm:items-end"><div className="min-w-0 w-full flex-1 space-y-2"><Label htmlFor="companyCnpj">CNPJ da empresa</Label><Input id="companyCnpj" value={cnpj} onChange={event=>setCnpj(formatCnpj(event.target.value))} placeholder="00.000.000/0000-00" maxLength={18} autoCapitalize="characters" autoComplete="off" spellCheck={false} required className="h-11 font-mono" /></div><Button type="submit" disabled={pending} className="h-11 w-full px-5 sm:w-auto">{pending ? <Loader2 className="animate-spin" /> : <Search />}{pending ? 'Consultando...' : 'Consultar CNPJ'}</Button></form><p className="mt-3 text-[11px] leading-5 text-muted-foreground">Aceita CNPJ numérico e alfanumérico. Pressione Enter para consultar. Dados em cache por até 24 horas.</p>{error && <p role="alert" className="mt-4 rounded-lg bg-destructive/10 p-3 text-sm text-destructive">{error}</p>}</section>
  {pending && <div role="status" className="flex items-center gap-3 rounded-xl border bg-card p-6 text-sm text-muted-foreground"><Loader2 className="size-5 animate-spin text-primary" />Consultando cadastro e verificando a disponibilidade das fontes de IE...</div>}
  {result && <CompanyResult result={result} busy={pending} onRefresh={()=>void lookup(result.company.cnpj,true)} />}
  {!result && !pending && !error && <div className="rounded-xl border border-dashed bg-card/40 p-10 text-center"><Building2 className="mx-auto size-9 text-primary/40" /><h2 className="mt-4 text-base font-semibold">Sua próxima consulta começa aqui.</h2><p className="mx-auto mt-2 max-w-md text-sm leading-6 text-muted-foreground">Informe um CNPJ para ver razão social, situação cadastral, atividades e endereço. A verificação de IE aparecerá separadamente.</p></div>}
  <section className="overflow-hidden rounded-xl border bg-card"><div className="flex flex-wrap items-center justify-between gap-4 border-b p-5"><div><h2 className="text-sm font-semibold">Empresas consultadas</h2><p className="mt-1 text-xs text-muted-foreground">{history.total} empresa(s) no resultado</p></div><div className="flex flex-wrap gap-2"><form onSubmit={event=>{event.preventDefault();void loadHistory();}} className="flex gap-2"><Input value={query} onChange={event=>setQuery(event.target.value)} maxLength={80} placeholder="Nome ou CNPJ" aria-label="Pesquisar empresas no histórico" className="h-9 w-44 sm:w-56" /><Button type="submit" variant="outline" disabled={historyBusy} aria-label="Pesquisar histórico"><Search /></Button></form><Button variant={onlyFavorites ? 'default' : 'outline'} onClick={()=>{setOnlyFavorites(!onlyFavorites);void loadHistory(1,!onlyFavorites);}} disabled={historyBusy} aria-pressed={onlyFavorites}><Star className={onlyFavorites ? 'fill-current' : ''} /> Favoritos</Button></div></div>
  <div aria-busy={historyBusy} className={historyBusy ? 'opacity-50' : ''}>{history.items.length ? <div className="overflow-x-auto"><table className="w-full text-left text-sm"><thead className="border-b bg-muted/40 text-xs text-muted-foreground"><tr><th className="px-5 py-3 font-medium">Empresa / CNPJ</th><th className="px-5 py-3 font-medium">Situação do CNPJ</th><th className="px-5 py-3 font-medium">Última consulta</th><th className="px-5 py-3 font-medium">Ações</th></tr></thead><tbody className="divide-y">{history.items.map(company=><tr key={company.id} className="hover:bg-muted/20"><td className="min-w-60 px-5 py-4"><button onClick={()=>void lookup(company.cnpj)} disabled={pending} className="text-left text-sm font-medium hover:text-primary">{company.legal_name}<ArrowUpRight className="ml-1 inline size-3" /></button><p className="mt-1 font-mono text-xs text-muted-foreground">{formatCnpj(company.cnpj)}</p></td><td className="px-5 py-4 text-xs">{company.registration_status || 'Não informada'}</td><td className="px-5 py-4 text-xs whitespace-nowrap text-muted-foreground">{dateTime(company.queried_at)}</td><td className="px-5 py-4"><div className="flex gap-1"><Button size="icon" variant="ghost" onClick={()=>void favorite(company)} disabled={mutationBusy} aria-label={`${company.is_favorite ? 'Desfavoritar' : 'Favoritar'} ${company.legal_name}`}><Star className={company.is_favorite ? 'fill-amber-400 text-amber-500' : 'text-muted-foreground'} /></Button><Button size="icon" variant="ghost" onClick={()=>setRemoving(company)} disabled={mutationBusy} aria-label={`Excluir consulta de ${company.legal_name}`}><Trash2 className="text-muted-foreground" /></Button></div></td></tr>)}</tbody></table></div> : <p className="p-10 text-center text-sm text-muted-foreground">{query || onlyFavorites ? 'Nenhuma empresa corresponde ao filtro.' : 'As empresas consultadas aparecerão aqui.'}</p>}</div>
  <div className="flex items-center justify-between border-t p-5 text-xs text-muted-foreground"><span>Página {history.page} de {pages}</span><div className="flex gap-2">{history.page>1 && <Button variant="outline" onClick={()=>void loadHistory(history.page-1)} disabled={historyBusy}><ChevronLeft />Anterior</Button>}{history.page<pages && <Button variant="outline" onClick={()=>void loadHistory(history.page+1)} disabled={historyBusy}>Próxima<ChevronRight /></Button>}</div></div></section>
  <Dialog open={Boolean(removing)} onOpenChange={open=>{if(!open && !mutationBusy)setRemoving(null);}}><DialogContent><DialogTitle>Remover empresa do histórico?</DialogTitle><DialogDescription>Os dados em cache, inscrições e consultas de {removing?.legal_name} serão excluídos da sua conta. Uma nova consulta poderá ser feita depois.</DialogDescription><div className="flex justify-end gap-2"><Button variant="outline" disabled={mutationBusy} onClick={()=>setRemoving(null)}>Cancelar</Button><Button variant="destructive" disabled={mutationBusy} onClick={()=>void remove()}>{mutationBusy && <Loader2 className="animate-spin" />}Remover consulta</Button></div></DialogContent></Dialog>
  </div>;
}
