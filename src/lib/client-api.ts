export class ClientApiError extends Error {
  status: number;

  constructor(message: string, status: number) {
    super(message);
    this.name = 'ClientApiError';
    this.status = status;
  }
}

export const SERVER_UNREACHABLE_MESSAGE = "Can't reach the server. Check that the ERP API is running, then retry.";

/** Signs out and opens the login page with a reason it can explain. */
export async function endSession(reason: 'expired' | 'session' = 'expired') {
  if (typeof window === 'undefined' || window.location.pathname.includes('/login')) return;
  try {
    await fetch('/api/auth/logout', { method: 'POST' });
  } catch {
    /* still leave the page */
  }
  try {
    window.localStorage.removeItem('auth-storage');
  } catch {
    /* storage unavailable */
  }
  window.location.href = `/login?reason=${reason}`;
}

export async function clientApiFetch<T>(path: string, options: RequestInit = {}): Promise<T> {
  const normalizedPath = path.startsWith('/') ? path : `/${path}`;
  let response: Response;
  try {
    response = await fetch(`/api/backend${normalizedPath}`, {
      ...options,
      headers: {
        Accept: 'application/json',
        ...options.headers,
      },
      credentials: 'same-origin',
    });
  } catch {
    throw new ClientApiError(SERVER_UNREACHABLE_MESSAGE, 0);
  }

  if (response.status === 401) {
    if (typeof window !== 'undefined' && !window.location.pathname.includes('/login')) {
      // Login expired or no longer valid: sign out and explain on the login page.
      await endSession('expired');
      return new Promise(() => {}); // Halt execution
    }
  }

  // An HTML page (instead of JSON) or a gateway error means the request never
  // reached the ERP API, e.g. the app's API bridge or the API server is down.
  const isHtml = (response.headers.get('content-type') || '').includes('text/html');
  if (!response.ok && (isHtml || [502, 503, 504].includes(response.status))) {
    throw new ClientApiError(SERVER_UNREACHABLE_MESSAGE, response.status);
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
