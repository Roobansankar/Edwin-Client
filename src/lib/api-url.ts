const DEFAULT_API_URL = 'http://localhost:4000/api/v1';

export function getApiBaseUrl() {
  const url =
    typeof window === 'undefined'
      ? process.env.API_URL || process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL
      : process.env.NEXT_PUBLIC_API_URL || DEFAULT_API_URL;

  return url.replace(/\/$/, '');
}

export function getApiOrigin() {
  const url = getApiBaseUrl();
  try {
    const parsed = new URL(url);
    return parsed.origin;
  } catch (e) {
    // Fallback: remove /api/v1 from the end
    return url.replace(/\/api\/v1$/, '').replace(/\/api$/, '');
  }
}
