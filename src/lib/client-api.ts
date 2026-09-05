export class ClientApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ClientApiError';
    this.status = status;
  }
}

export async function clientApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  const response = await fetch(`/api/backend${normalizedPath}`, {
    ...options,
    headers: {
      Accept: 'application/json',
      ...options.headers,
    },
    credentials: 'same-origin',
  });

  if (response.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      // Clear token and redirect to login
      await fetch('/api/auth/logout', { method: 'POST' });
      window.location.href = '/login';
      return new Promise(() => {}); // Halt execution
    }
  }

  const payload = await response.json().catch(() => null);

  if (!response.ok) {
    throw new ClientApiError(
      payload?.message || payload?.error || `Request failed with status ${response.status}`,
      response.status,
    );
  }

  return payload as T;
}

export const fetchPurchaseDashboard = () => clientApiFetch<any>('/dashboard/purchase');
export const fetchEngineerDashboard = () => clientApiFetch<any>('/dashboard/engineer');
export const fetchPurchaseAssignedProjects = () => clientApiFetch<unknown[]>('/dashboard/purchase/projects');
export const fetchEngineerAssignedProjects = () => clientApiFetch<unknown[]>('/dashboard/engineer/projects');
