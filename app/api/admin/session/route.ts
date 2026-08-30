import { NextResponse } from "next/server";
import { hasAdminSession } from "../../../../lib/admin-auth";

export async function GET() {
    return NextResponse.json({ authenticated: await hasAdminSession() });
}
