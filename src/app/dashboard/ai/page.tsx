import { redirect } from 'next/navigation';
import { getUserFromToken } from '@/lib/auth';
import { AiDashboardClient } from '@/components/dashboard/AiDashboardClient';

export default async function AiDashboardPage() {
  const user = await getUserFromToken();
  if (!user) redirect('/login');
  if (user.role !== 'admin') redirect('/dashboard');
  return <AiDashboardClient />;
}
