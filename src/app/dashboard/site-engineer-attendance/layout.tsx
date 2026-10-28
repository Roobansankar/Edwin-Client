import type { ReactNode } from 'react';
import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';

export default async function TimesheetApprovalsLayout({ children }: { children: ReactNode }) {
  const user = await getUserFromToken();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');
  return children;
}
