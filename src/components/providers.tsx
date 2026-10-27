"use client";
import { ThemeProvider } from "next-themes";
import { Toaster } from "sonner";

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ThemeProvider
      attribute="class"
      forcedTheme="dark"
      defaultTheme="dark"
      enableSystem={false}
      disableTransitionOnChange
      storageKey="fiscalhub-theme"
    >
      {children}
      <Toaster
        theme="dark"
        richColors
        closeButton
        position="bottom-right"
        toastOptions={{ className: "font-sans" }}
      />
    </ThemeProvider>
  );
}
