import { cookies } from 'next/headers';
import { getApiBaseUrl } from './api-url';

export async function getToken(): Promise<string | undefined> {
  const cookieStore = await cookies();
  return cookieStore.get('token')?.value;
}

export async function getUserFromToken(): Promise<{ id: string; email: string; role: string; name: string } | null> {
  const token = await getToken();
  if (!token) return null;

  try {
    const res = await fetch(`${getApiBaseUrl()}/auth/me`, {
      headers: { Authorization: `Bearer ${token}` },
      cache: 'no-store',
    });
    if (!res.ok) return null;
    return res.json();
  } catch {
    return null;
  }
}
