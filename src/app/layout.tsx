import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import Providers from './providers';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'OfferFlow - 求职工作流助手',
  description: '高效管理你的求职流程，追踪每一个岗位的状态',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="zh-CN">
      <body className={inter.className}>
        <Providers>
          <main className="min-h-screen bg-slate-50">
            {children}
          </main>
        </Providers>
      </body>
    </html>
  );
}
