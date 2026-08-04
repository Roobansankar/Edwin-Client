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

export async function createSubcontractor(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/subcontractors`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create subcontractor' }));
    throw new Error(error.message || 'Failed to create subcontractor');
  }

  revalidatePath('/dashboard/subcontractors');
  return res.json();
}

export async function updateSubcontractor(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/subcontractors/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update subcontractor' }));
    throw new Error(error.message || 'Failed to update subcontractor');
  }

  revalidatePath('/dashboard/subcontractors');
  return res.json();
}

export async function deleteSubcontractor(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/subcontractors/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete subcontractor' }));
    throw new Error(error.message || 'Failed to delete subcontractor');
  }

  revalidatePath('/dashboard/subcontractors');
  return { success: true };
}
