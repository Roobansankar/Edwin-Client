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

export async function createSubcontractorBill(data: Record<string, unknown>) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/subcontractor-bills`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to create bill' }));
      throw new Error(error.message || 'Failed to create bill');
    }
    revalidatePath('/dashboard/accounts/subcontractor-bills');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function uploadSubcontractorBillFile(data: { name: string; base64: string }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const buf = Buffer.from(data.base64, 'base64');
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob, data.name);
    const res = await fetch(`${getApiBaseUrl()}/subcontractor-bills/upload`, {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: formData,
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'File upload failed' }));
      throw new Error(err.message || 'File upload failed');
    }
    return res.json() as Promise<{ fileUrl: string; fileKey: string }>;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateSubcontractorBillStatus(id: string, status: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/subcontractor-bills/${id}/status`, {
      method: 'PATCH', headers, body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update bill status');
    revalidatePath('/dashboard/accounts/subcontractor-bills');
    revalidatePath('/dashboard/approvals');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateSubcontractorBill(id: string, data: Record<string, unknown>) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/subcontractor-bills/${id}`, {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update bill' }));
      throw new Error(error.message || 'Failed to update bill');
    }
    revalidatePath('/dashboard/accounts/subcontractor-bills');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function deleteSubcontractorBill(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/subcontractor-bills/${id}`, {
      method: 'DELETE', headers,
    });
    if (!res.ok) throw new Error('Failed to delete bill');
    revalidatePath('/dashboard/accounts/subcontractor-bills');
    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
