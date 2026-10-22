import { AuthForm } from '@/components/auth/auth-form';
import { requirePageUser } from '@/lib/auth/session';
export const metadata = { title: 'Nova senha' };
export default async function Password() { await requirePageUser(); return <AuthForm mode="password" />; }
