import { NextResponse } from 'next/server';

export async function GET() {
  return NextResponse.json({
    bluefairy_url: process.env.BLUEFAIRY_API_URL || '(not set, using fallback)',
  });
}
