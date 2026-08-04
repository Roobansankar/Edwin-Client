'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api-url';

async function getAuthHeaders(isFormData = false) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  return {
    ...(!isFormData ? { 'Content-Type': 'application/json' } : {}),
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createOfficeReport(data: FormData) {
  const headers = await getAuthHeaders(true);
  const res = await fetch(`${getApiBaseUrl()}/office-reports`, {
    method: 'POST',
    headers,
    body: data,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to upload report' }));
    throw new Error(error.message || 'Failed to upload report');
  }

  revalidatePath('/dashboard/reports');
  return res.json();
}

export async function deleteOfficeReport(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/office-reports/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete report' }));
    throw new Error(error.message || 'Failed to delete report');
  }

  revalidatePath('/dashboard/reports');
  return { success: true };
}
