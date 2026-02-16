import { NextRequest } from 'next/server';
import { handleAuthRequest } from '@/lib/auth-handler';

export async function POST(request: NextRequest) {
  return handleAuthRequest(request, '/auth/signup', 'Signup');
}
