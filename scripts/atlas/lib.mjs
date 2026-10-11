// Shared by Atlas's jobs: the keys, the two services it talks to (Claude and
// the NiceThings database), and an exact account of what each call costs.
import { existsSync, readFileSync } from "node:fs";
import Anthropic from "@anthropic-ai/sdk";
import { createClient } from "@supabase/supabase-js";

// On a developer's computer the keys live in .env.local; in GitHub's cloud
// they arrive as secrets, already in the environment.
export function loadEnv() {
    if (!existsSync(".env.local")) return;
    for (const line of readFileSync(".env.local", "utf8").split(/\r?\n/)) {
        const at = line.indexOf("=");
        if (at < 1 || line.trimStart().startsWith("#")) continue;
        const key = line.slice(0, at).trim();
        if (!(key in process.env)) process.env[key] = line.slice(at + 1).trim().replace(/^["']|["']$/g, "");
    }
}

export function database() {
    const url = process.env.SUPABASE_URL || process.env.NEXT_PUBLIC_SUPABASE_URL;
    const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!url || !key) throw new Error("Missing SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");
    return createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
}

export const MODEL = process.env.ATLAS_MODEL || "claude-opus-5-5";

// Public list prices in US dollars per million tokens, and per web search.
const PRICES = {
    "claude-opus-5-5": { input: 4, output: 20, cacheRead: 0.2 },
    "claude-sonnet-5-5": { input: 2, output: 10, cacheRead: 0.2 },
    "claude-haiku-5-5": { input: 0.1, output: 0.5, cacheRead: 0.01 },
};
const SEARCH_PRICE = 0.01;
// Models whose declined requests can be re-run on another model by the API.
const WITH_FALLBACK = ["claude-opus-5-5", "claude-opus-5", "claude-sonnet-5-5", "claude-fable-5-1"];

export function costOf(usage, model = MODEL) {
    const price = PRICES[model] ?? PRICES["claude-opus-5-5"];
    const tokens =
        (usage.input_tokens ?? 0) * price.input +
        (usage.cache_creation_input_tokens ?? 0) * price.input * 1.25 +
        (usage.cache_read_input_tokens ?? 0) * price.cacheRead +
        (usage.output_tokens ?? 0) * price.output;
    return tokens / 1_000_000 + (usage.searches ?? 0) * SEARCH_PRICE;
}

let client;

// One question to Claude, with web search when `search` is set. A long
// search can pause mid-way; it is resumed here. Returns the text of the
// answer and what the call used.
export async function ask({ system, user, search = 0, effort = "low", maxTokens = 6000, city = null }) {
    client ??= new Anthropic();
    const usage = { input_tokens: 0, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0, searches: 0 };
    const messages = [{ role: "user", content: user }];
    const tools = search
        ? [{ type: "web_search_20260209", name: "web_search", max_uses: search, user_location: { type: "approximate", country: "CM", ...(city && { city }) } }]
        : undefined;
    let response;

    for (let turn = 0; turn < 4; turn++) {
        response = await client.beta.messages.create({
            model: MODEL,
            max_tokens: maxTokens,
            output_config: { effort },
            system,
            messages,
            ...(tools && { tools }),
            ...(WITH_FALLBACK.includes(MODEL) && { betas: ["server-side-fallback-2026-07-01"], fallbacks: "default" }),
        });
        for (const key of ["input_tokens", "output_tokens", "cache_creation_input_tokens", "cache_read_input_tokens"]) usage[key] += response.usage?.[key] ?? 0;
        usage.searches += response.usage?.server_tool_use?.web_search_requests ?? 0;
        if (response.stop_reason !== "pause_turn") break;
        // The server stopped in the middle of its searches: hand its turn
        // back and it carries on from there.
        messages.splice(1, messages.length - 1, { role: "assistant", content: response.content });
    }

    const text = response.content.filter((block) => block.type === "text").map((block) => block.text).join("");
    return { text, usage, cost: costOf(usage, response.model?.startsWith("claude-") && PRICES[response.model] ? response.model : MODEL), stop: response.stop_reason, model: response.model };
}

// The JSON object an answer ends with, between <result> tags. null when the
// answer has none or it does not parse: the caller then leaves the place as
// it was.
export function resultOf(text) {
    const match = text.match(/<result>([\s\S]*?)<\/result>/);
    if (!match) return null;
    try {
        return JSON.parse(match[1].trim().replace(/^```(?:json)?\s*|\s*```$/g, ""));
    } catch {
        return null;
    }
}

export function dollars(value) {
    return `$${value.toFixed(value < 0.1 ? 4 : 2)}`;
}
