import { AuthForm } from '@/components/auth/auth-form';
import { serverConfigured } from '@/lib/env';
export const metadata = { title: 'Criar conta' };
export const dynamic = 'force-dynamic';
export default function Signup() { return <AuthForm mode="signup" configured={serverConfigured()} />; }
