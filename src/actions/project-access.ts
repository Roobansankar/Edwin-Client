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

export async function approveProjectAccess(projectId: string, userId: string, days: number) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/project-access/approve`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId, userId, days }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to approve access' }));
      throw new Error(error.message || 'Failed to approve access');
    }

    revalidatePath('/dashboard/project-access');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function revokeProjectAccess(projectId: string, userId: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/project-access/revoke`, {
      method: 'POST',
      headers,
      body: JSON.stringify({ projectId, userId }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to revoke access' }));
      throw new Error(error.message || 'Failed to revoke access');
    }

    revalidatePath('/dashboard/project-access');
    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
