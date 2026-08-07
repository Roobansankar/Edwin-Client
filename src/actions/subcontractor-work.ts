'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api-url';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createSubcontractorWork(formData: FormData) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${getApiBaseUrl()}/subcontractor-work`, {
    method: 'POST',
    headers,
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to submit subcontractor work' }));
    throw new Error(error.message || 'Failed to submit subcontractor work');
  }

  revalidatePath('/dashboard/subcontractor-work');
  return res.json();
}

export async function updateSubcontractorWorkStatus(id: string, status: string) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${getApiBaseUrl()}/subcontractor-work/${id}/status`, {
    method: 'PATCH',
    headers: {
      'Content-Type': 'application/json',
      ...headers,
    },
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update status' }));
    throw new Error(error.message || 'Failed to update status');
  }

  revalidatePath('/dashboard/subcontractor-work');
  return res.json();
}

export async function deleteSubcontractorWork(id: string) {
  const headers = await getAuthHeaders();

  const res = await fetch(`${getApiBaseUrl()}/subcontractor-work/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete entry' }));
    throw new Error(error.message || 'Failed to delete entry');
  }

  revalidatePath('/dashboard/subcontractor-work');
  return res.json();
}
