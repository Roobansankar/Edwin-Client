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

export async function createExpensePayment(data: {
  paymentId?: string;
  amount?: number;
  paymentMode?: string;
  referenceNumber?: string;
  userId: string;
  weekStart: string;
  weekEnd: string;
  paymentDate: string;
  status?: 'pending' | 'paid';
  notes?: string;
}) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/expense-payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to record payment' }));
      console.error('Expense payment API failure:', res.status, error);
      return { success: false as const, error: res.status < 500
        ? (Array.isArray(error.message) ? error.message.join(', ') : error.message) || 'Failed to record payment'
        : 'Unable to confirm payment. Refresh and check payment history before trying again.' };
    }

    for (const path of ['/dashboard/expense-payments', '/dashboard/payments', '/dashboard/weekly-report', '/dashboard/all-reports']) revalidatePath(path);
    return { success: true as const };
  } catch (error) {
    console.error('Expense payment action failed:', error);
    return { success: false as const, error: 'Unable to confirm payment. Refresh and check payment history before trying again.' };
  }
}

export async function updateExpensePaymentStatus(id: string, status: 'pending' | 'paid') {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/expense-payments/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update status' }));
      console.error('Expense payment status API failure:', res.status, error);
      return { success: false as const, error: res.status < 500
        ? (Array.isArray(error.message) ? error.message.join(', ') : error.message) || 'Failed to update status'
        : 'Unable to confirm the status update. Refresh and check payment history.' };
    }

    for (const path of ['/dashboard/expense-payments', '/dashboard/payments', '/dashboard/weekly-report', '/dashboard/all-reports']) revalidatePath(path);
    return { success: true as const };
  } catch (error) {
    console.error('Expense payment action failed:', error);
    return { success: false as const, error: 'Unable to confirm payment. Refresh and check payment history before trying again.' };
  }
}
