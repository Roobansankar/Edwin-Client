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

export async function createPurchaseOrder(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to create purchase order');
  revalidatePath('/dashboard/purchase-orders');
  return res.json();
}

export async function convertPoToBill(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-orders/${id}/convert`, {
    method: 'POST',
    headers,
  });
  if (!res.ok) throw new Error('Failed to convert PO to bill');
  revalidatePath('/dashboard/purchase-orders');
  revalidatePath('/dashboard/accounts/bills');
  return res.json();
}

export async function updatePurchaseOrderStatus(id: string, status: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-orders/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });
  if (!res.ok) {
    let errorMessage = 'Failed to update purchase order status';
    try {
      const errorData = await res.json();
      errorMessage = errorData.message || errorMessage;
    } catch (e) {
      // ignore
    }
    throw new Error(errorMessage);
  }
  revalidatePath('/dashboard/purchase-orders');
  revalidatePath('/dashboard/approvals');
  return res.json();
}

export async function updatePurchaseOrder(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-orders/${id}`, {
    method: 'PUT',
    headers,
    body: JSON.stringify(data),
  });
  if (!res.ok) throw new Error('Failed to update purchase order');
  revalidatePath('/dashboard/purchase-orders');
  return res.json();
}

export async function uploadBillFile(data: { name: string; base64: string }) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const buf = Buffer.from(data.base64, 'base64');
  const blob = new Blob([buf], { type: 'application/octet-stream' });
  const formData = new FormData();
  formData.append('file', blob, data.name);
  const res = await fetch(`${getApiBaseUrl()}/purchase-orders/upload`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${token}`,
    },
    body: formData,
  });
  if (!res.ok) throw new Error('File upload failed');
  return res.json() as Promise<{ fileUrl: string; fileKey: string }>;
}

export async function deletePurchaseOrder(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/purchase-orders/${id}`, {
    method: 'DELETE',
    headers,
  });
  if (!res.ok) throw new Error('Failed to delete purchase order');
  revalidatePath('/dashboard/purchase-orders');
}
