import { NextRequest, NextResponse } from 'next/server';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'https://api.wareit.ai';

export async function GET(request: NextRequest) {
  const auth = request.headers.get('Authorization') || '';
  const res = await fetch(`${API_URL}/me`, {
    headers: { Authorization: auth },
  });
  const data = await res.text();
  return new NextResponse(data, {
    status: res.status,
    headers: { 'Content-Type': 'application/json' },
  });
}
