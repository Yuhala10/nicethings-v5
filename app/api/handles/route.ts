import { NextResponse } from "next/server";
import { notInstalled } from "@/lib/atlas/store";
import { checkHandle } from "@/lib/people/handles";

// While someone types the @name they want: free, taken (with free names
// close to it), or not allowed.
export async function GET(request: Request) {
    const query = new URL(request.url).searchParams;
    try {
        const answer = await checkHandle(query.get("h") ?? "", query.get("area"));
        return NextResponse.json({ ok: true, ...answer }, { headers: { "Cache-Control": "no-store" } });
    } catch (error) {
        if (notInstalled(error)) return NextResponse.json({ ok: false, why: "closed" }, { status: 503 });
        console.error("Handle not checked:", error);
        return NextResponse.json({ ok: false, why: "failed" }, { status: 502 });
    }
}
