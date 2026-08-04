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

export async function createOfficeStaff(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/office-staff`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create office staff' }));
    throw new Error(error.message || 'Failed to create office staff');
  }

  revalidatePath('/dashboard/office-staff');
  return res.json();
}

export async function updateOfficeStaff(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/office-staff/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update office staff' }));
    throw new Error(error.message || 'Failed to update office staff');
  }

  revalidatePath('/dashboard/office-staff');
  return res.json();
}

export async function deleteOfficeStaff(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/office-staff/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to deactivate office staff' }));
    throw new Error(error.message || 'Failed to deactivate office staff');
  }

  revalidatePath('/dashboard/office-staff');
  return { success: true };
}
