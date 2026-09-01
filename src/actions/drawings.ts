'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api-url';

export async function uploadDrawing(formData: FormData) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    const res = await fetch(`${getApiBaseUrl()}/drawings`, {
      method: 'POST',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to upload drawing' }));
      throw new Error(error.message || 'Failed to upload drawing');
    }

    revalidatePath('/dashboard/drawings');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function updateDrawing(id: string, formData: FormData) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    const res = await fetch(`${getApiBaseUrl()}/drawings/${id}`, {
      method: 'PATCH',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update drawing' }));
      throw new Error(error.message || 'Failed to update drawing');
    }

    revalidatePath('/dashboard/drawings');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}

export async function deleteDrawing(id: string) {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get('token')?.value;

    const res = await fetch(`${getApiBaseUrl()}/drawings/${id}`, {
      method: 'DELETE',
      headers: {
        ...(token ? { Authorization: `Bearer ${token}` } : {}),
      },
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to delete drawing' }));
      throw new Error(error.message || 'Failed to delete drawing');
    }

    revalidatePath('/dashboard/drawings');
    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Something went wrong. Please try again.');
  }
}
