import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { cityBySlug } from "@/lib/cities";
import { isLocale } from "@/lib/i18n";
import { forgetPhone, pushKeys, pushReady, readPhoneAddress, savePhone } from "@/lib/push-server";

// Weather notices, the visitor's side (lib/push-server.ts).
//   GET    ?ready=1                        whether they can be asked for, and the public key to ask with
//   POST   { endpoint, p256dh, auth, city, lang }   a phone asks to be told about a city
//   DELETE { endpoint }                    it asks to be left alone: its address is erased

export async function GET() {
    try {
        const ready = await pushReady();
        return NextResponse.json({ ready, key: ready ? pushKeys()?.publicKey : null }, { headers: { "Cache-Control": "public, max-age=60, s-maxage=300" } });
    } catch (error) {
        console.error("Notices not checked:", error);
        return NextResponse.json({ ready: false, key: null });
    }
}

async function read(request: Request) {
    try {
        const body = await request.json();
        return body && typeof body === "object" ? (body as Record<string, unknown>) : null;
    } catch {
        return null;
    }
}

export async function POST(request: Request) {
    const body = await read(request);
    const agent = userAgent(request);
    if (!body || agent.isBot || looksAutomated(agent.ua)) return NextResponse.json({ ok: false }, { status: 400 });

    const address = readPhoneAddress(body);
    const city = cityBySlug(typeof body.city === "string" ? body.city : null);
    if (!address || !city) return NextResponse.json({ ok: false }, { status: 400 });
    try {
        if (!(await pushReady())) return NextResponse.json({ ok: false }, { status: 503 });
        await savePhone(address, city.slug, isLocale(typeof body.lang === "string" ? body.lang : null) ? (body.lang as "fr" | "en") : "fr");
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Phone not saved for notices:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}

export async function DELETE(request: Request) {
    const body = await read(request);
    const endpoint = typeof body?.endpoint === "string" ? body.endpoint.slice(0, 1000) : null;
    if (!endpoint) return NextResponse.json({ ok: false }, { status: 400 });
    try {
        await forgetPhone(endpoint);
        return NextResponse.json({ ok: true });
    } catch (error) {
        console.error("Phone not forgotten:", error);
        return NextResponse.json({ ok: false }, { status: 502 });
    }
}
