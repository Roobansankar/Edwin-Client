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

export async function createPayment(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/payments`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to record payment');
  revalidatePath('/dashboard/accounts/bills');
  revalidatePath('/dashboard/accounts/invoices');
  revalidatePath('/dashboard/payments');
  revalidatePath('/dashboard/purchase-orders');
  return res.json();
}

export async function syncExpensesToLedger() {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/payments/sync-expenses`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to sync expenses');
  revalidatePath('/dashboard/payments');
  return res.json();
}
