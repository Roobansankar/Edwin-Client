import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-url';

export const dynamic = 'force-dynamic';

const JSON_HEADERS = {
  'Content-Type': 'application/json',
};

type RouteContext = {
  params: Promise<{ path: string[] }>;
};

async function proxyToApi(request: NextRequest, context: RouteContext) {
  const { path } = await context.params;
  const targetUrl = new URL(`${getApiBaseUrl()}/${path.join('/')}`);
  targetUrl.search = new URL(request.url).search;

  const cookieStore = await cookies();
  const token = cookieStore.get('token')?.value;
  const contentType = request.headers.get('content-type');

  const headers = new Headers();
  headers.set('Accept', 'application/json');
  if (contentType) headers.set('Content-Type', contentType);
  if (token) headers.set('Authorization', `Bearer ${token}`);

  try {
    const response = await fetch(targetUrl, {
      method: request.method,
      headers,
      body: ['GET', 'HEAD'].includes(request.method) ? undefined : await request.arrayBuffer(),
      cache: 'no-store',
      signal: AbortSignal.timeout(15_000),
    });

    const responseBody = await response.arrayBuffer();
    const responseHeaders = new Headers();
    const responseContentType = response.headers.get('content-type');
    if (responseContentType) responseHeaders.set('Content-Type', responseContentType);

    return new NextResponse(responseBody, {
      status: response.status,
      statusText: response.statusText,
      headers: responseHeaders,
    });
  } catch {
    return NextResponse.json(
      {
        message: 'Unable to reach the ERP API. Confirm the Nest server is running and API_URL points to /api/v1.',
      },
      { status: 503, headers: JSON_HEADERS },
    );
  }
}

export const GET = proxyToApi;
export const POST = proxyToApi;
export const PUT = proxyToApi;
export const PATCH = proxyToApi;
export const DELETE = proxyToApi;
