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

export async function createLabourPayment(data: {
  userId: string;
  weekStart: string;
  weekEnd: string;
  paymentDate: string;
  status?: 'pending' | 'paid';
  notes?: string;
}) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/labour-payments`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to record payment' }));
      throw new Error(error.message || 'Failed to record payment');
    }

    revalidatePath('/dashboard/labour-payments');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateLabourPaymentStatus(id: string, status: 'pending' | 'paid') {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/labour-payments/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update status' }));
      throw new Error(error.message || 'Failed to update status');
    }

    revalidatePath('/dashboard/labour-payments');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
