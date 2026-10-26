import { Palette, ShieldCheck, UserRound } from 'lucide-react';
import { ProfileForm } from '@/components/settings/profile-form';
import { AppearanceForm } from '@/components/settings/appearance-form';
import { DeleteAccount } from '@/components/settings/delete-account';
import { getWorkspace } from '@/services/workspace';
export const metadata = { title: 'Configurações' };
export default async function Settings() {
  const { profile, user } = await getWorkspace();
  const anonymous = Boolean(user.is_anonymous);
  return <div className="max-w-4xl">
    <h1 className="text-2xl font-semibold tracking-tight">Configurações</h1>
    <p className="mt-2 text-sm text-muted-foreground">Seu apelido, sua aparência e o controle dos seus dados.</p>
    <div className="mt-7 space-y-6">
      <section className="rounded-xl border bg-card p-6"><h2 className="mb-6 flex items-center gap-3 text-sm font-semibold"><UserRound className="size-4 text-primary-text" />Meu perfil</h2><ProfileForm fullName={profile.full_name} email={anonymous ? '' : user.email || ''} /></section>
      <section className="rounded-xl border bg-card p-6"><h2 className="mb-6 flex items-center gap-3 text-sm font-semibold"><Palette className="size-4 text-primary-text" />Aparência</h2><AppearanceForm /></section>
      <section className="rounded-xl border bg-card p-6"><h2 className="flex items-center gap-2 text-sm font-semibold"><ShieldCheck className="size-4 text-primary-text" />Seu acesso</h2><p className="mt-3 text-sm leading-6 text-muted-foreground">{anonymous ? 'Seu espaço está ligado à sessão deste navegador. O apelido é apenas um nome de exibição: ele não permite recuperar documentos em outro aparelho. Se você apagar os dados do navegador ou encerrar o acesso, não terá como recuperar este espaço. Exporte o que precisar guardar.' : 'Esta sessão pertence a uma conta criada anteriormente. Seus documentos continuam privados e separados dos espaços por apelido.'}</p></section>
      <section className="rounded-xl border border-destructive/20 bg-card p-6"><h2 className="text-sm font-semibold">Excluir conta e dados</h2><p className="mt-2 mb-5 text-xs leading-6 text-muted-foreground">Remova permanentemente o perfil, histórico e arquivos deste espaço.{!anonymous && ' Contas anteriores ainda exigem a senha para exclusão.'}</p><DeleteAccount anonymous={anonymous} /></section>
    </div>
  </div>;
}
