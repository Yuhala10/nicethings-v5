import { NextResponse } from "next/server";
import { fail, requireAdmin } from "@/lib/admin-api";
import { pushStatus, sendTrialNotice } from "@/lib/push-server";

// Weather notices, the team's side (lib/push-server.ts).
//   GET   how many phones asked to be told, city by city, and the last notices sent
//   POST  a trial notice to the phone that signed up last

export async function GET() {
    const { denied } = await requireAdmin();
    if (denied) return denied;
    try {
        return NextResponse.json({ ok: true, ...(await pushStatus()) });
    } catch (error) {
        return fail(error);
    }
}

export async function POST() {
    const { denied } = await requireAdmin();
    if (denied) return denied;
    try {
        return NextResponse.json({ ok: true, ...(await sendTrialNotice()) });
    } catch (error) {
        return fail(error);
    }
}
