'use server';

import { revalidatePath } from 'next/cache';
import { cookies } from 'next/headers';
import { getApiBaseUrl } from '@/lib/api-url';

async function getAuthHeaders() {
  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  return {
    ...(token ? { Authorization: `Bearer ${token}` } : {}),
  };
}

export async function createDailyLabourReport(formData: FormData) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/daily-labour`, {
      method: 'POST',
      headers,
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to create report' }));
      throw new Error(error.message || 'Failed to create report');
    }

    revalidatePath('/dashboard/dpw');
    revalidatePath('/dashboard/new');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to create report');
  }
}

export async function updateDailyLabourReport(id: string, formData: FormData) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/daily-labour/${id}`, {
      method: 'POST', // Backend uses POST for update too to handle multipart
      headers,
      body: formData,
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update report' }));
      throw new Error(error.message || 'Failed to update report');
    }

    revalidatePath('/dashboard/dpw');
    revalidatePath('/dashboard/new');
    revalidatePath(`/dashboard/dpw/${id}`);
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to update report');
  }
}

export async function updateDailyLabourReportStatus(id: string, status: string) {
  try {
    const headers = await getAuthHeaders();

    const res = await fetch(`${getApiBaseUrl()}/daily-labour/${id}/status`, {
      method: 'PATCH',
      headers: {
        'Content-Type': 'application/json',
        ...headers,
      },
      body: JSON.stringify({ status }),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Failed to update status' }));
      throw new Error(error.message || 'Failed to update status');
    }

    revalidatePath('/dashboard/dpw');
    revalidatePath('/dashboard/new');
    return res.json();
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to update status');
  }
}

export async function deleteDailyLabourReport(id: string) {
  try {
    const headers = await getAuthHeaders();

    const url = `${getApiBaseUrl()}/daily-labour/${id}`;
    const res = await fetch(url, {
      method: 'DELETE',
      headers,
    });

    if (!res.ok) {
      const body = await res.text().catch(() => '');
      let msg: string;
      try {
        const parsed = JSON.parse(body);
        msg = parsed.message || parsed.error || `HTTP ${res.status}`;
      } catch {
        msg = body || `HTTP ${res.status}`;
      }
      console.error(`[deleteDailyLabourReport] ${res.status} from ${url}:`, msg);
      throw new Error(msg);
    }

    revalidatePath('/dashboard/dpw');
    revalidatePath('/dashboard/new');
    return { success: true };
  } catch (error) {
    if (error instanceof Error) throw error;
    throw new Error('Failed to delete report');
  }
}
