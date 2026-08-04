'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api-url';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  return {
    'Content-Type': 'application/json',
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createSiteEngineer(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/site-engineers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create site engineer' }));
    throw new Error(error.message || 'Failed to create site engineer');
  }

  revalidatePath('/dashboard/site-engineers');
  revalidatePath('/dashboard/assigned-projects');
  return res.json();
}

export async function updateSiteEngineer(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/site-engineers/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update site engineer' }));
    throw new Error(error.message || 'Failed to update site engineer');
  }

  revalidatePath('/dashboard/site-engineers');
  revalidatePath('/dashboard/assigned-projects');
  return res.json();
}

export async function deleteSiteEngineer(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/site-engineers/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to deactivate site engineer' }));
    throw new Error(error.message || 'Failed to deactivate site engineer');
  }

  revalidatePath('/dashboard/site-engineers');
  revalidatePath('/dashboard/assigned-projects');
  return { success: true };
}
