import { NextResponse } from "next/server";
import { ownerSessionClient } from "@/lib/supabase/owner";

export async function POST() {
    await (await ownerSessionClient()).auth.signOut();
    return NextResponse.json({ ok: true });
}
