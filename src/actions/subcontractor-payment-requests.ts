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

export async function createSubcontractorPaymentRequest(data: {
  subcontractorId: string;
  projectId: string;
  subcontractWorkOrderId?: string;
  amount: number;
  notes?: string;
}) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/subcontractor-payment-requests`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to send payment request' }));
      throw new Error(error.message || 'Failed to send payment request');
    }

    revalidatePath('/dashboard/subcontractor-payments');
    revalidatePath('/dashboard/subcontractor-payment-requests');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function respondSubcontractorPaymentRequest(id: string, action: 'accepted' | 'admin_approved' | 'rejected') {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/subcontractor-payment-requests/${id}/respond`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ action }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to respond to request' }));
      throw new Error(error.message || 'Failed to respond to request');
    }

    revalidatePath('/dashboard/subcontractor-payment-requests');
    revalidatePath('/dashboard/subcontractor-payments');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
