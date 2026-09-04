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

export async function verifyTimesheet(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/timesheet-attendance/${id}/verify`, {
      method: 'PATCH',
      headers,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to verify' }));
      throw new Error(error.message || 'Failed to verify');
    }
    revalidatePath('/dashboard/approvals');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function approveTimesheet(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/timesheet-attendance/${id}/approve`, {
      method: 'PATCH',
      headers,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to approve' }));
      throw new Error(error.message || 'Failed to approve');
    }
    revalidatePath('/dashboard/approvals');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function resetTimesheetStatus(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/timesheet-attendance/${id}/reset-status`, {
      method: 'PATCH',
      headers,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to reset status' }));
      throw new Error(error.message || 'Failed to reset status');
    }
    revalidatePath('/dashboard/approvals');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function rejectTimesheet(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/timesheet-attendance/${id}/reject`, {
      method: 'PATCH',
      headers,
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to reject' }));
      throw new Error(error.message || 'Failed to reject');
    }
    revalidatePath('/dashboard/approvals');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
