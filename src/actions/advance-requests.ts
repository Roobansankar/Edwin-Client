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

export async function createAdvanceRequest(data: {
  vendorId: string;
  projectId: string;
  materialRequirementNo?: string;
  vendorQuotationId?: string;
  purchaseOrderId?: string;
  amount: number;
  notes?: string;
}) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/advance-requests`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to send vendor payment request' }));
    throw new Error(error.message || 'Failed to send vendor payment request');
  }

  revalidatePath('/dashboard/advance');
  revalidatePath('/dashboard/advance-requests');
  return res.json();
}

export async function respondAdvanceRequest(id: string, action: 'accepted' | 'admin_approved' | 'rejected') {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/advance-requests/${id}/respond`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ action }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to respond to request' }));
    throw new Error(error.message || 'Failed to respond to request');
  }

  revalidatePath('/dashboard/advance-requests');
  revalidatePath('/dashboard/advance');
  return res.json();
}
