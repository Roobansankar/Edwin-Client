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

const PAGE = '/dashboard/my-todos';

export async function createTodo(data: { title: string; description?: string; dueDate?: string }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-todos`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to add todo' }));
    throw new Error(error.message || 'Failed to add todo');
  }
  revalidatePath(PAGE);
  return res.json();
}

export async function updateTodo(id: string, data: { title?: string; description?: string; dueDate?: string | null; isDone?: boolean }) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-todos/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update todo' }));
    throw new Error(error.message || 'Failed to update todo');
  }
  revalidatePath(PAGE);
  return res.json();
}

export async function deleteTodo(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-todos/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete todo' }));
    throw new Error(error.message || 'Failed to delete todo');
  }
  revalidatePath(PAGE);
  return { success: true };
}
