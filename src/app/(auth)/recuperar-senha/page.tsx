import { AuthForm } from '@/components/auth/auth-form';
import { serverConfigured } from '@/lib/env';
export const metadata = { title: 'Recuperar senha' };
export const dynamic = 'force-dynamic';
export default function Recovery() { return <AuthForm mode="recovery" configured={serverConfigured()} />; }
