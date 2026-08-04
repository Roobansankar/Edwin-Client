import type { Metadata } from 'next';
import { AntdRegistry } from '@ant-design/nextjs-registry';
import { QueryProvider } from '@/components/providers/QueryProvider';
import { ThemeProvider } from '@/components/providers/ThemeProvider';
import './globals.css';

export const metadata: Metadata = {
  title: 'Edwin Constructions ERP',
  description: 'ERP Management System for Edwin Constructions - Projects, Accounts, Expenses & Payments',
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body className="antialiased font-(--app-font)">
        <AntdRegistry>
          <ThemeProvider>
            <QueryProvider>{children}</QueryProvider>
          </ThemeProvider>
        </AntdRegistry>
      </body>
    </html>
  );
}
