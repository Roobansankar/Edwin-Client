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

export async function createTeam(data: { name: string }) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/teams`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to create team' }));
      throw new Error(error.message || 'Failed to create team');
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

export async function deleteTeam(id: string) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/teams/${id}`, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to delete team' }));
      throw new Error(error.message || 'Failed to delete team');
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

export async function updateTeam(id: string, data: { name?: string }) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/teams/${id}`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update team' }));
      throw new Error(error.message || 'Failed to update team');
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
