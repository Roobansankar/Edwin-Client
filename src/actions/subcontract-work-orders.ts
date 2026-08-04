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

export async function uploadWorkOrderFile(formData: FormData) {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;

  const res = await fetch(`${getApiBaseUrl()}/subcontract-work-orders/upload`, {
    method: 'POST',
    headers: {
      ...(token ? { Authorization: `Bearer ${token}` } : {}),
    },
    body: formData,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to upload file' }));
    throw new Error(error.message || 'Failed to upload file');
  }

  return res.json();
}

export async function createSubcontractWorkOrder(data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/subcontract-work-orders`, {
    method: 'POST',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to create work order' }));
    throw new Error(error.message || 'Failed to create work order');
  }

  revalidatePath('/dashboard/subcontract-work-orders');
  return res.json();
}

export async function updateSubcontractWorkOrder(id: string, data: Record<string, unknown>) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/subcontract-work-orders/${id}`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify(data),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update work order' }));
    throw new Error(error.message || 'Failed to update work order');
  }

  revalidatePath('/dashboard/subcontract-work-orders');
  return res.json();
}

export async function updateSubcontractWorkOrderStatus(id: string, status: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/subcontract-work-orders/${id}/status`, {
    method: 'PATCH',
    headers,
    body: JSON.stringify({ status }),
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to update status' }));
    throw new Error(error.message || 'Failed to update status');
  }

  revalidatePath('/dashboard/subcontract-work-orders');
  revalidatePath('/dashboard/approvals');
  return res.json();
}

export async function deleteSubcontractWorkOrder(id: string) {
  const headers = await getAuthHeaders();
  const res = await fetch(`${getApiBaseUrl()}/subcontract-work-orders/${id}`, {
    method: 'DELETE',
    headers,
  });

  if (!res.ok) {
    const error = await res.json().catch(() => ({ message: 'Failed to delete work order' }));
    throw new Error(error.message || 'Failed to delete work order');
  }

  revalidatePath('/dashboard/subcontract-work-orders');
  return { success: true };
}
