import { fetchMySalary } from '@/lib/api';
import { ProfileClient } from '@/components/dashboard/ProfileClient';

async function loadMySalary() {
  try {
    return await fetchMySalary();
  } catch {
    return null;
  }
}

export default async function ProfilePage() {
  const salary = await loadMySalary();

  return <ProfileClient initialSalary={salary} />;
}
