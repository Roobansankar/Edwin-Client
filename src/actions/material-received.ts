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

export async function createMaterialReceived(data: Record<string, unknown>) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/material-received`, {
      method: 'POST',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to create material received record' }));
      throw new Error(Array.isArray(error.message) ? error.message.join(', ') : error.message || 'Failed to create material received record');
    }
    revalidatePath('/dashboard/material-received');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateMaterialReceived(id: string, data: Record<string, unknown>) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/material-received/${id}`, {
      method: 'PUT',
      headers,
      body: JSON.stringify(data),
    });
    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update material received record' }));
      throw new Error(Array.isArray(error.message) ? error.message.join(', ') : error.message || 'Failed to update material received record');
    }
    revalidatePath('/dashboard/material-received');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateMaterialReceivedStatus(id: string, status: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/material-received/${id}/status`, {
      method: 'PATCH',
      headers,
      body: JSON.stringify({ status }),
    });
    if (!res.ok) throw new Error('Failed to update status');
    revalidatePath('/dashboard/material-received');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function uploadMaterialFile(data: { name: string; base64: string }) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;
    const buf = Buffer.from(data.base64, 'base64');
    const blob = new Blob([buf], { type: 'application/octet-stream' });
    const formData = new FormData();
    formData.append('file', blob, data.name);
    const res = await fetch(`${getApiBaseUrl()}/material-received/upload`, {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${token}`,
      },
      body: formData,
    });
    if (!res.ok) throw new Error('File upload failed');
    return res.json() as Promise<{ fileUrl: string; fileKey: string }>;
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function deleteMaterialReceived(id: string) {
  try {
    const headers = await getAuthHeaders();
    const res = await fetch(`${getApiBaseUrl()}/material-received/${id}`, {
      method: 'DELETE',
      headers,
    });
    if (!res.ok) throw new Error('Failed to delete material received record');
    revalidatePath('/dashboard/material-received');
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
