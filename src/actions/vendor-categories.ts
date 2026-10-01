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

const PAGE = '/dashboard/vendors';

export async function createVendorCategory(name: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/vendor-categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify({ name }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to add category' }));
    throw new Error(error.message || 'Failed to add category');
  }
  revalidatePath(PAGE);
  return res.json();
}

export async function deleteVendorCategory(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/vendor-categories/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete category' }));
    throw new Error(error.message || 'Failed to delete category');
  }
  revalidatePath(PAGE);
  return { success: true };
}
