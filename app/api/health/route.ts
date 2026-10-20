import { NextResponse, userAgent } from "next/server";
import { looksAutomated } from "@/lib/analytics";
import { notInstalled } from "@/lib/atlas/store";
import { SITE_URL } from "@/lib/i18n/config";
import { getSupabaseAdminClient } from "@/lib/supabase/admin";

// A visitor's browser saying that a page did not come out right: shown
// without its design, machine-translated, hit by a script error, or opened
// without JavaScript (see lib/health-script.ts). Each kind of trouble
// on each kind of browser is one line in Atlas's problem list, counted every
// time it is seen again. No visitor id, no address: only which browser and
// which page. A browser too old for the site is not a fault: it is counted
// on one line, filed away.

const CODES = {
    "styles-missing": { severity: "serious", title: (browser: string) => `Page affichée sans sa mise en forme sur ${browser}` },
    translated: { severity: "normal", title: (browser: string) => `Page traduite automatiquement par le navigateur (${browser})` },
    "script-error": { severity: "normal", title: (browser: string) => `Erreur de script sur ${browser}` },
    "no-js": { severity: "minor", title: (browser: string) => `Visite sans JavaScript (${browser})` },
    // Not a fault to fix: the page told the visitor to update their browser.
    // One line for all of them, filed away, counting how often it happens.
    "old-browser": { severity: "minor", title: () => "Navigateurs trop anciens pour le site : l'avis « mets à jour ton navigateur » leur est montré" },
} as const;
type Code = keyof typeof CODES;

// The list stays readable whatever is thrown at this address.
const MAX_LINES = 150;

const short = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\s+/g, " ").trim().slice(0, max) : "");

async function record(request: Request, code: Code, report: { path?: unknown; ref?: unknown; detail?: unknown }) {
    const agent = userAgent(request);
    if (agent.isBot || looksAutomated(agent.ua)) return;
    // An iPhone app drawing a link preview opens the page in a bare WebKit
    // view with JavaScript off: that is not someone visiting.
    if (code === "no-js" && agent.browser.name === "WebKit") return;

    const browser = [agent.browser.name ?? "navigateur inconnu", agent.browser.major].filter(Boolean).join(" ");
    const system = [agent.os.name, agent.os.version].filter(Boolean).join(" ") || "système inconnu";
    const detail = short(report.detail, 300);
    // A script error is a different problem for each message; the rest is
    // one problem per browser.
    const about = code === "script-error" ? `:${detail.slice(0, 80)}` : "";
    const fingerprint = code === "old-browser" ? "health:old-browser" : `health:${code}:${agent.browser.name ?? "?"}:${agent.browser.major ?? "?"}:${agent.os.name ?? "?"}${about}`.slice(0, 300);
    const evidence = { code: `health-${code}`, browser, system, device: short(agent.device.model, 60) || null, path: short(report.path, 200), ref: short(report.ref, 80) || null, message: detail || null };

    const db = getSupabaseAdminClient();
    const existing = await db.from("nt_atlas_issues").select("id,status,times_seen").eq("fingerprint", fingerprint).maybeSingle();
    if (existing.error) {
        if (!notInstalled(existing.error)) console.error("Health report failed:", existing.error);
        return;
    }
    const now = new Date().toISOString();
    if (existing.data) {
        await db
            .from("nt_atlas_issues")
            .update({ times_seen: existing.data.times_seen + 1, last_seen_at: now, evidence, ...(existing.data.status === "fixed" && code !== "old-browser" && { status: "open", resolved_at: null }) })
            .eq("id", existing.data.id);
        return;
    }
    const { count } = await db.from("nt_atlas_issues").select("id", { count: "exact", head: true }).eq("area", "health");
    if ((count ?? 0) >= MAX_LINES) return;
    await db.from("nt_atlas_issues").insert({
        fingerprint,
        area: "health",
        severity: CODES[code].severity,
        title: code === "old-browser" ? CODES[code].title() : `${CODES[code].title(browser)} (${system})`,
        detail: [evidence.path && `Page : ${evidence.path}`, evidence.ref && `en venant de ${evidence.ref}`, detail].filter(Boolean).join(" · ") || null,
        evidence,
        ...(code === "old-browser" && { status: "dismissed", resolved_at: now }),
    });
}

// Only our own pages report, or our pages shown through Google's
// translation service (the one case where the address is not ours).
function fromOurPages(request: Request) {
    const origin = request.headers.get("origin") ?? request.headers.get("referer") ?? "";
    try {
        const host = new URL(origin).hostname;
        return host === new URL(SITE_URL).hostname || host === new URL(request.url).hostname || host.endsWith(".translate.goog");
    } catch {
        return false;
    }
}

export async function POST(request: Request) {
    const done = () => new NextResponse(null, { status: 204 });
    if (!fromOurPages(request)) return done();
    let body: Record<string, unknown>;
    try {
        // Sent as plain text so that it also passes from a translated copy
        // of the page, which lives at another address.
        body = JSON.parse(await request.text());
    } catch {
        return done();
    }
    const code = typeof body.code === "string" && body.code in CODES && body.code !== "no-js" ? (body.code as Code) : null;
    if (code) await record(request, code, body).catch((error) => console.error("Health report failed:", error));
    return done();
}

// A browser without JavaScript cannot report: the page carries an invisible
// image that asks for this address instead.
const PIXEL = Buffer.from("R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7", "base64");

export async function GET(request: Request) {
    if (fromOurPages(request)) {
        const path = (() => {
            try {
                return new URL(request.headers.get("referer") ?? "").pathname;
            } catch {
                return "";
            }
        })();
        await record(request, "no-js", { path }).catch((error) => console.error("Health report failed:", error));
    }
    return new NextResponse(PIXEL, { headers: { "Content-Type": "image/gif", "Cache-Control": "no-store" } });
}
