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

export async function createItemDescription(name: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/item-descriptions`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create' }));
    throw new Error(error.message || 'Failed to create');
  }

  revalidatePath('/dashboard/purchase-orders');
  return res.json();
}

export async function updateItemDescription(id: string, name: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/item-descriptions/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ name }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update' }));
    throw new Error(error.message || 'Failed to update');
  }

  revalidatePath('/dashboard/purchase-orders');
  return res.json();
}

export async function deleteItemDescription(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/item-descriptions/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete' }));
    throw new Error(error.message || 'Failed to delete');
  }

  revalidatePath('/dashboard/purchase-orders');
  return { success: true };
}
