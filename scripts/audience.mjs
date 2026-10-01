// Prints the audience report in the terminal: visitors, who came back,
// cities, top places, where visits come from and what people search for.
//
//   node scripts/audience.mjs        # last 30 days
//   node scripts/audience.mjs 7      # last 7 days
//
// Same numbers as the admin "Audience" and "Recherches" pages. Read-only.

import { readFileSync } from "node:fs";
import { createClient } from "@supabase/supabase-js";

const DAYS = Math.min(90, Math.max(1, Number(process.argv[2]) || 30));
const DAY = 86_400_000;
const CAMEROON_OFFSET = 3_600_000; // UTC+1, no daylight saving

function loadEnv() {
    const env = {};
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
        const match = line.match(/^([A-Z0-9_]+)=(.*)$/);
        if (match) env[match[1]] = match[2].trim().replace(/^"|"$/g, "");
    }
    return env;
}

function table(title, rows) {
    console.log(`\n${title}`);
    if (!rows.length) return console.log("  (rien)");
    const width = Math.max(...rows.map(([label]) => String(label).length));
    for (const [label, ...values] of rows) console.log(`  ${String(label).padEnd(width)}  ${values.join("  ")}`);
}

async function main() {
    const env = loadEnv();
    const db = createClient(env.NEXT_PUBLIC_SUPABASE_URL, env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
    const today = Math.floor((Date.now() + CAMEROON_OFFSET) / DAY) * DAY;
    const since = new Date(today - (DAYS - 1) * DAY - CAMEROON_OFFSET).toISOString();
    console.log(`NiceThings, ${DAYS} derniers jours`);

    const { data, error } = await db.rpc("nt_audience", { since });
    if (error) {
        console.log(`\nAudience indisponible (${error.code}): ${error.message}`);
        console.log("Si la table n'existe pas encore, lance database/migrations/002_analytics.sql dans Supabase (SQL Editor).");
    } else {
        const back = data.visitors ? Math.round((data.returned / data.visitors) * 100) : 0;
        table("Audience", [
            ["Visiteurs", data.visitors],
            ["Nouveaux", data.fresh],
            ["Sont revenus", `${data.returned} (${back}%)`],
            ["Pages vues", data.views],
        ]);
        table("Par jour (visiteurs, déjà venus, pages)", data.perDay.map((day) => [day.day, day.visitors, day.returned, day.views]));
        table("Villes (visiteurs, revenus, pages)", data.cities.map((row) => [row.city, row.visitors, row.returned, row.views]));
        table("Pages (vues)", data.pages.map((row) => [row.page, row.views]));
        table("Lieux les plus vus (vues)", data.places.map((row) => [row.name ?? row.slug, row.views]));
        table("Sources (visites)", data.sources.map((row) => [row.source, row.visits]));
        table("Langue (visiteurs)", data.langs.map((row) => [row.lang, row.visitors]));
        table("Appareil (visiteurs)", data.devices.map((row) => [row.device, row.visitors]));
    }

    const searches = new Map();
    for (let from = 0; ; from += 1000) {
        const { data: rows, error: failed } = await db
            .from("nt_searches")
            .select("query,result_count")
            .gte("created_at", since)
            .range(from, from + 999);
        if (failed) throw failed;
        for (const row of rows) {
            const query = (row.query ?? "").trim().toLowerCase().replace(/\s+/g, " ");
            if (!query) continue;
            const bucket = searches.get(query) ?? { count: 0, zero: 0 };
            bucket.count++;
            if (row.result_count === 0) bucket.zero++;
            searches.set(query, bucket);
        }
        if (rows.length < 1000) break;
    }
    const list = [...searches.entries()];
    table("Recherches les plus demandées", list.sort((a, b) => b[1].count - a[1].count).slice(0, 20).map(([query, bucket]) => [query, bucket.count]));
    table("Recherches sans résultat", list.filter(([, bucket]) => bucket.zero).sort((a, b) => b[1].zero - a[1].zero).slice(0, 20).map(([query, bucket]) => [query, bucket.zero]));
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
