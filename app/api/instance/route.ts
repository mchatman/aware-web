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

    // Get user info from bluefairy
    const meResponse = await fetch(`${BLUEFAIRY_API_URL}/me`, {
      headers: { 'Authorization': `Bearer ${token}` },
    });

    if (!meResponse.ok) {
      return NextResponse.json(
        { message: 'Session expired' },
        { status: 401 }
      );
    }

    const user = await meResponse.json();

    // Look up instance via bluefairy's gateway proxy (bluefairy → tenant-orchestrator)
    // bluefairy proxies /api/* to the tenant, but we need the instance info.
    // Call tenant-orchestrator directly for the instance lookup.
    const TENANT_ORCHESTRATOR_URL = process.env.TENANT_ORCHESTRATOR_URL || '';
    if (!TENANT_ORCHESTRATOR_URL) {
      return NextResponse.json(
        { message: 'Tenant orchestrator not configured' },
        { status: 500 }
      );
    }

    const orchResponse = await fetch(
      `${TENANT_ORCHESTRATOR_URL}/tenants/${user.id}/instance`
    );

    if (!orchResponse.ok) {
      // Instance not found — it may not have been provisioned yet
      return NextResponse.json(
        { message: 'No instance found. Please contact support.' },
        { status: 404 }
      );
    }

    const instance = await orchResponse.json();

    return NextResponse.json({
      endpoint: `https://${instance.endpoint}.wareit.ai`,
      status: instance.status,
    });
  } catch (error) {
    console.error('Instance lookup error:', error);
    return NextResponse.json(
      { message: 'Failed to look up instance' },
      { status: 500 }
    );
  }
}
