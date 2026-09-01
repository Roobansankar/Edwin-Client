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
  try {
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
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function deleteOfficeReport(id: string) {
  try {
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
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
