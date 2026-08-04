import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-url';

function getSecureCookieSetting(request: NextRequest) {
  const value = process.env.AUTH_COOKIE_SECURE;
  if (value !== undefined && value !== '') {
    return ['1', 'true', 'yes', 'on'].includes(value.toLowerCase());
  }

  const forwardedProto = request.headers.get('x-forwarded-proto');
  const protocol = forwardedProto || request.nextUrl.protocol.replace(':', '');

  return protocol === 'https';
}

export async function POST(request: NextRequest) {
  const body = await request.json();
  const apiUrl = `${getApiBaseUrl()}/auth/login`;
  console.log('Logging in to:', apiUrl);

  try {
    const res = await fetch(apiUrl, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(body),
    });

    if (!res.ok) {
      const error = await res.json().catch(() => ({ message: 'Login failed' }));
      return NextResponse.json(error, { status: res.status });
    }

    const data = await res.json();
    const response = NextResponse.json({ user: data.user });

    // Set httpOnly cookie with JWT
    response.cookies.set('token', data.access_token, {
      httpOnly: true,
      secure: getSecureCookieSetting(request),
      sameSite: 'lax',
      path: '/',
    });

    return response;
  } catch (err: any) {
    return NextResponse.json({ 
      message: 'Internal server error', 
      error: err.message,
      url: apiUrl 
    }, { status: 500 });
  }
}
