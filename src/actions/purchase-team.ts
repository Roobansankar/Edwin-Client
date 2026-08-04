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

export async function createPurchaseTeamMember(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-team`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create purchase team member' }));
    throw new Error(error.message || 'Failed to create purchase team member');
  }

  revalidatePath('/dashboard/purchase-team');
  return res.json();
}

export async function updatePurchaseTeamMember(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-team/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update purchase team member' }));
    throw new Error(error.message || 'Failed to update purchase team member');
  }

  revalidatePath('/dashboard/purchase-team');
  return res.json();
}

export async function deletePurchaseTeamMember(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-team/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete purchase team member' }));
    throw new Error(error.message || 'Failed to delete purchase team member');
  }

  revalidatePath('/dashboard/purchase-team');
  return { success: true };
}
