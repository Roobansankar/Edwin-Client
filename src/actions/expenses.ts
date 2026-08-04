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

export async function createExpense(data: FormData | Record<string, unknown>) {
  const isFormData = data instanceof FormData;
  const headers = await getAuthHeaders(isFormData);
  
  const res = await fetch(`${getApiBaseUrl()}/expenses`, {
    method: 'POST', 
    headers, 
    body: isFormData ? data : JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create expense' }));
    throw new Error(error.message || 'Failed to create expense');
  }
  
  revalidatePath('/dashboard/expenses');
  return res.json();
}


export async function updateExpense(id: string, data: FormData | Record<string, unknown>) {
  const isFormData = data instanceof FormData;
  const headers = await getAuthHeaders(isFormData);
  
  const res = await fetch(`${getApiBaseUrl()}/expenses/${id}`, {
    method: 'PATCH', 
    headers, 
    body: isFormData ? data : JSON.stringify(data),
  });
  
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update expense' }));
    throw new Error(error.message || 'Failed to update expense');
  }
  
  revalidatePath('/dashboard/expenses');
  return res.json();
}

export async function deleteExpense(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/expenses/${id}`, {
    method: 'DELETE', headers,
  });
  if (!res.ok) throw new Error('Failed to delete expense');
  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard/payments');
  return { success: true };
}

export async function updateExpenseStatus(id: string, status: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/expenses/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update status' }));
    throw new Error(error.message || 'Failed to update status');
  }
  revalidatePath('/dashboard/expenses');
  revalidatePath('/dashboard/approvals');
  return res.json();
}
