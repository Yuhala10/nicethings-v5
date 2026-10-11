// A small, read-only trial of the Inspector: checks a few of the most-viewed
// places and prints what it found and what it cost. Nothing is written to
// the database.
//   node scripts/atlas/trial.mjs [how many, default 3] [city name, default Yaoundé]
import { inspectPlace } from "./inspector.mjs";
import { MODEL, database, dollars, loadEnv } from "./lib.mjs";

loadEnv();
const count = Math.min(5, Math.max(1, Number(process.argv[2]) || 3));
const city = process.argv[3] || "Yaoundé";
const db = database();

// The places people open most (last 30 days), most opened first.
const since = new Date(Date.now() - 30 * 86_400_000).toISOString();
const { data: events, error: eventsError } = await db.from("nt_events").select("place").not("place", "is", null).gte("created_at", since).limit(5000);
if (eventsError) throw eventsError;
const views = new Map();
for (const event of events) views.set(event.place, (views.get(event.place) ?? 0) + 1);
const slugs = [...views.entries()].sort((a, b) => b[1] - a[1]).map(([slug]) => slug);

const { data: rows, error } = await db
    .from("nt_spots")
    .select("id,slug,name,category,city,neighborhood,address,landmark,latitude,longitude,phone,website,source,verified")
    .in("slug", slugs.slice(0, 40))
    .eq("city", city)
    .eq("status", "APPROVED");
if (error) throw error;
const places = rows.sort((a, b) => (views.get(b.slug) ?? 0) - (views.get(a.slug) ?? 0)).slice(0, count);

console.log(`Atlas trial · ${MODEL} · ${places.length} places in ${city}\n`);
let total = 0;
for (const place of places) {
    const started = Date.now();
    const { finding, usage, cost, refused } = await inspectPlace(place);
    total += cost;
    console.log(`■ ${place.name} (${place.category}, ${place.neighborhood ?? "?"}) · ${views.get(place.slug)} views`);
    if (!finding) {
        console.log(refused ? "  the request was declined" : "  the answer could not be read; the place is left as it is");
    } else {
        console.log(`  ${finding.status} (confidence ${finding.confidence})`);
        console.log(`  ${finding.summary}`);
        const contacts = Object.entries(finding.contacts).filter(([, value]) => value);
        if (contacts.length) console.log(`  contacts: ${contacts.map(([key, value]) => `${key} ${value}`).join(" · ")}`);
        if (finding.hours.asWritten) console.log(`  hours: ${finding.hours.asWritten}`);
        for (const source of finding.sources) console.log(`  source: ${source.url}${source.dated ? ` (${source.dated})` : ""} — ${source.shows ?? ""}`);
        if (finding.notes) console.log(`  note: ${finding.notes}`);
    }
    console.log(`  used: ${usage.input_tokens} in, ${usage.output_tokens} out, ${usage.searches} searches · ${dollars(cost)} · ${Math.round((Date.now() - started) / 1000)} s\n`);
}
console.log(`Total: ${dollars(total)} for ${places.length} places (${dollars(total / Math.max(1, places.length))} each)`);
