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

export async function saveTimesheet(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/timesheet-attendance`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to save timesheet' }));
    throw new Error(error.message || 'Failed to save timesheet');
  }
  revalidatePath('/dashboard/timesheet-attendance');
  return res.json();
}

export async function updateTimesheet(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/timesheet-attendance/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update timesheet' }));
    throw new Error(error.message || 'Failed to update timesheet');
  }
  revalidatePath('/dashboard/timesheet-attendance');
  return res.json();
}

export async function submitTimesheet(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/timesheet-attendance/${id}/submit`, {
    method: 'PATCH',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to submit timesheet' }));
    throw new Error(error.message || 'Failed to submit timesheet');
  }
  revalidatePath('/dashboard/timesheet-attendance');
  return res.json();
}

export async function deleteTimesheet(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/timesheet-attendance/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete timesheet' }));
    throw new Error(error.message || 'Failed to delete timesheet');
  }
  revalidatePath('/dashboard/timesheet-attendance');
  return { success: true };
}
