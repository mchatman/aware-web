import { NextRequest, NextResponse } from 'next/server';

const BLUEFAIRY_API_URL = process.env.BLUEFAIRY_API_URL || 'http://localhost:8080';

export async function GET(request: NextRequest) {
  try {
    const token = request.cookies.get('token')?.value;
    if (!token) {
      return NextResponse.json(
        { message: 'Not authenticated' },
        { status: 401 }
      );
    }

    // Call bluefairy to get the user's instance
    const response = await fetch(`${BLUEFAIRY_API_URL}/instance`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (response.status === 401) {
      return NextResponse.json(
        { message: 'Session expired' },
        { status: 401 }
      );
    }

    if (response.status === 404) {
      return NextResponse.json(
        { message: 'No instance found. Please contact support.' },
        { status: 404 }
      );
    }

    if (!response.ok) {
      return NextResponse.json(
        { message: 'Failed to look up instance' },
        { status: response.status }
      );
    }

    const data = await response.json();
    return NextResponse.json(data);
  } catch (error) {
    console.error('Instance lookup error:', error);
    return NextResponse.json(
      { message: 'Failed to connect to server' },
      { status: 500 }
    );
  }
}
