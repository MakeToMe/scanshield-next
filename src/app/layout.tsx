import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import '@/styles/globals.css';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'ScanShield - Detecte vulnerabilidades em APIs Supabase',
  description: 'Ferramenta de segurança para detectar e prevenir exposição de dados em APIs Supabase',
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="pt-BR">
      <body className={inter.className}>
        <div className="min-h-screen bg-gradient-to-b from-dark to-dark-darker text-white">
          {children}
        </div>
      </body>
    </html>
  );
}
