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

export async function createProjectCategory(data: { name: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/project-categories`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create project category' }));
    throw new Error(error.message || 'Failed to create project category');
  }

  revalidatePath('/dashboard/projects');
  return res.json();
}
