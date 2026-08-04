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

export async function createPurchaseEnquiry(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-enquiries`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create purchase enquiry');
  revalidatePath('/dashboard/material-requirement');
  return res.json();
}

export async function updatePurchaseEnquiry(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-enquiries/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update purchase enquiry');
  revalidatePath('/dashboard/material-requirement');
  return res.json();
}

export async function updatePurchaseEnquiryStatus(id: string, status: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-enquiries/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  if (!res.ok) throw new Error('Failed to update status');
  revalidatePath('/dashboard/material-requirement');
  return res.json();
}

export async function deletePurchaseEnquiry(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-enquiries/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete purchase enquiry');
  revalidatePath('/dashboard/material-requirement');
}
