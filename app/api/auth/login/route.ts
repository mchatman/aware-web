import { NextRequest, NextResponse } from 'next/server';

const BLUEFAIRY_API_URL = process.env.BLUEFAIRY_API_URL || 'https://bluefairy-n68eu.ondigitalocean.app';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();

    const response = await fetch(`${BLUEFAIRY_API_URL}/auth/login`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });

    const text = await response.text();
    let data;
    try {
      data = JSON.parse(text);
    } catch {
      // If response is not JSON, wrap it in a message object
      data = { message: text };
    }

    if (!response.ok) {
      return NextResponse.json(data, { status: response.status });
    }

    // Set cookie with the JWT token
    const res = NextResponse.json(data);
    if (data.accessToken) {
      res.cookies.set('token', data.accessToken, {
        httpOnly: true,
        secure: process.env.NODE_ENV === 'production',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
    }

    return res;
  } catch (error) {
    console.error('Login error:', error);
    return NextResponse.json(
      { message: 'Internal server error' },
      { status: 500 }
    );
  }
}