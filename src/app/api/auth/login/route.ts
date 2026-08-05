// import { NextRequest, NextResponse } from 'next/server';
// import { getApiBaseUrl } from '@/lib/api-url';

// export async function POST(request: NextRequest) {
//   const body = await request.json();
//   const apiUrl = `${getApiBaseUrl()}/auth/login`;
//   console.log('Logging in to:', apiUrl);

//   try {
//     const res = await fetch(apiUrl, {
//       method: 'POST',
//       headers: { 'Content-Type': 'application/json' },
//       body: JSON.stringify(body),
//     });

//     if (!res.ok) {
//       const error = await res.json().catch(() => ({ message: 'Login failed' }));
//       return NextResponse.json(error, { status: res.status });
//     }

//     const data = await res.json();
//     const response = NextResponse.json({ user: data.user });

//     // Set httpOnly cookie with JWT
//     response.cookies.set('token', data.access_token, {
//       httpOnly: true,
//       secure: process.env.NODE_ENV === 'production',
//       sameSite: 'lax',
//       path: '/',
//     });

//     return response;
//   } catch (err: any) {
//     return NextResponse.json({ 
//       message: 'Internal server error', 
//       error: err.message,
//       url: apiUrl 
//     }, { status: 500 });
//   }
// }



import { NextRequest, NextResponse } from 'next/server';
import { getApiBaseUrl } from '@/lib/api-url';

export async function POST(request: NextRequest) {
  const body = await request.json();
  const apiUrl = `${getApiBaseUrl()}/auth/login`;

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

    // Include access_token in the JSON response for client-side state/localStorage
    const response = NextResponse.json({
      user: data.user,
      access_token: data.access_token,
      token: data.access_token,
    });

    const cookieOptions = {
      httpOnly: true,
      sameSite: 'lax' as const,
      path: '/',
      maxAge: 60 * 60 * 24 * 7, // 7 days
    };

    // Set under both 'token' and 'access_token' so middleware & client cookies both pass
    response.cookies.set('token', data.access_token, cookieOptions);
    response.cookies.set('access_token', data.access_token, cookieOptions);

    return response;
  } catch (err: any) {
    return NextResponse.json({
      message: 'Internal server error',
      error: err.message,
      url: apiUrl,
    }, { status: 500 });
  }
}