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

export async function createInvoice(data: Record<string, unknown>) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/invoices`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to create invoice' }));
      throw new Error(error.message || 'Failed to create invoice');
    }
    revalidatePath('/dashboard/accounts/invoices');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateInvoiceStatus(id: string, status: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/invoices/${id}/status`, {
      method: 'PATCH', headers, body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update invoice');
    revalidatePath('/dashboard/accounts/invoices');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function createBill(data: Record<string, unknown>) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/bills`, {
      method: 'POST', headers, body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to create bill' }));
      throw new Error(error.message || 'Failed to create bill');
    }
    revalidatePath('/dashboard/accounts/bills');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function uploadBillFile(data: { name: string; base64: string }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const buf = Buffer.from(data.base64, 'base64');
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob, data.name);
    const res = await fetch(`${getApiBaseUrl()}/bills/upload`, {
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

export async function updateBillStatus(id: string, status: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/bills/${id}/status`, {
      method: 'PATCH', headers, body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update bill status');
    revalidatePath('/dashboard/accounts/bills');
    revalidatePath('/dashboard/approvals');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateBill(id: string, data: Record<string, unknown>) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/bills/${id}`, {
      method: 'PUT', headers, body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update bill' }));
      throw new Error(error.message || 'Failed to update bill');
    }
    revalidatePath('/dashboard/accounts/bills');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function deleteBill(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/bills/${id}`, {
      method: 'DELETE', headers,
    });
    if (!res.ok) throw new Error('Failed to delete bill');
    revalidatePath('/dashboard/accounts/bills');
    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function deleteInvoice(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/invoices/${id}`, {
      method: 'DELETE', headers,
    });
    if (!res.ok) throw new Error('Failed to delete invoice');
    revalidatePath('/dashboard/accounts/invoices');
    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
