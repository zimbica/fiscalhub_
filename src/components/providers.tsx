'use client';
import { ThemeProvider } from 'next-themes';
import { Toaster } from 'sonner';

export function Providers({ children }: { children: React.ReactNode }) {
  return <ThemeProvider attribute="class" defaultTheme="system" enableSystem disableTransitionOnChange storageKey="fiscalhub-theme">
    {children}<Toaster richColors closeButton position="bottom-right" toastOptions={{ className: 'font-sans' }} />
  </ThemeProvider>;
}
