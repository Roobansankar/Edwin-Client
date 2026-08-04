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

export async function createAccountsManager(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/accounts-managers`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create accounts manager' }));
    throw new Error(error.message || 'Failed to create accounts manager');
  }

  revalidatePath('/dashboard/accounts-managers');
  return res.json();
}

export async function updateAccountsManager(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/accounts-managers/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update accounts manager' }));
    throw new Error(error.message || 'Failed to update accounts manager');
  }

  revalidatePath('/dashboard/accounts-managers');
  return res.json();
}

export async function deleteAccountsManager(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/accounts-managers/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete accounts manager' }));
    throw new Error(error.message || 'Failed to delete accounts manager');
  }

  revalidatePath('/dashboard/accounts-managers');
  return { success: true };
}
