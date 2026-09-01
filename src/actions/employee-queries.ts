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

export async function createEmployeeQuery(data: { timesheetId: string; reason: string; dayIndex: number }) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/employee-queries`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to send edit request' }));
      throw new Error(error.message || 'Failed to send edit request');
    }

    revalidatePath('/dashboard/timesheet-attendance');
    revalidatePath('/dashboard/employee-queries');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function respondEmployeeQuery(id: string, action: 'approved' | 'rejected') {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/employee-queries/${id}/respond`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to respond to request' }));
      throw new Error(error.message || 'Failed to respond to request');
    }

    revalidatePath('/dashboard/employee-queries');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
