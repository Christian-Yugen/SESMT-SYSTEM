import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "SESMT - Saúde Ocupacional",
  description: "Sistema de Gestão de ASO e Exames",
};

import IdleLogout from "@/components/IdleLogout";

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR" suppressHydrationWarning>
      <body
        className={`${inter.className} antialiased`}
        suppressHydrationWarning
      >
        <IdleLogout />
        {children}
      </body>
    </html>
  );
}
