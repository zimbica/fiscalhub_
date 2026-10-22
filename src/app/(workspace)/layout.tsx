import { AppShell } from '@/components/layout/app-shell';
import { PreferencesProvider } from '@/components/settings/preferences-provider';
import { getWorkspace } from '@/services/workspace';
export const dynamic = 'force-dynamic';
export default async function WorkspaceLayout({ children }: { children: React.ReactNode }) {
  const { profile, preferences } = await getWorkspace();
  return <PreferencesProvider initial={preferences}><AppShell fullName={profile.full_name}>{children}</AppShell></PreferencesProvider>;
}
