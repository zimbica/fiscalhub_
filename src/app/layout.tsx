import type { Metadata } from "next";
import "@fontsource-variable/geist";
import { Providers } from "@/components/providers";
import "./globals.css";
export const metadata: Metadata = {
  title: { default: "FiscalHub", template: "%s | FiscalHub" },
  description:
    "Seu ambiente privado para consulta e análise de documentos fiscais brasileiros.",
  robots: { index: false, follow: false },
};
export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className="dark h-full antialiased"
    >
      <body className="min-h-full">
        <Providers>{children}</Providers>
      </body>
    </html>
  );
}
