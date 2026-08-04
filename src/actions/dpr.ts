'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api-url';

export async function uploadDpr(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const res = await fetch(`${getApiBaseUrl()}/dpr`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });
  if (!res.ok) throw new Error('Failed to upload DPR');
  revalidatePath('/dashboard/dpr');
  return res.json();
}

export async function deleteDpr(id: string) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const res = await fetch(`${getApiBaseUrl()}/dpr/${id}`, {
    method: 'DELETE',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete DPR' }));
    throw new Error(error.message || 'Failed to delete DPR');
  }

  revalidatePath('/dashboard/dpr');
  return { success: true };
}
