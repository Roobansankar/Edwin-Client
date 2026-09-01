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

export async function createTrade(data: { name: string; teamId?: string; shiftWiseAmount?: number }) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/trades`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to create trade' }));
      throw new Error(error.message || 'Failed to create trade');
    }

    revalidatePath('/dashboard/dpw');
    revalidatePath('/dashboard/salary');
    revalidatePath('/dashboard/new');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function deleteTrade(id: string) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/trades/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to delete trade' }));
      throw new Error(error.message || 'Failed to delete trade');
    }

    revalidatePath('/dashboard/dpw');
    revalidatePath('/dashboard/salary');
    revalidatePath('/dashboard/new');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateTrade(
  id: string,
  data: { name?: string; teamId?: string; shiftWiseAmount?: number },
) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/trades/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update trade' }));
      throw new Error(error.message || 'Failed to update trade');
    }

    revalidatePath('/dashboard/dpw');
    revalidatePath('/dashboard/salary');
    revalidatePath('/dashboard/new');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
