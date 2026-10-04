// GET /api/tts?l=fr&t=… — a guidance sentence spoken by Google's neural
// voice (fluent, natural French). Switched on by GOOGLE_TTS_API_KEY; without
// it the app uses the phone's own best voice. The same sentences come back
// again and again ("Dans 150 mètres, tourne à droite…"), so each one is
// made once and then served from the CDN for a year.

const VOICES = {
    fr: { languageCode: "fr-FR", name: "fr-FR-Neural2-F" },
    en: { languageCode: "en-GB", name: "en-GB-Neural2-A" },
} as const;

export async function GET(request: Request) {
    const key = process.env.GOOGLE_TTS_API_KEY;
    if (!key) return new Response(null, { status: 501 });

    const params = new URL(request.url).searchParams;
    const lang = params.get("l") === "en" ? "en" : "fr";
    const text = (params.get("t") ?? "").replace(/\s+/g, " ").trim().slice(0, 220);
    if (text.length < 2) return new Response(null, { status: 400 });

    const response = await fetch(`https://texttospeech.googleapis.com/v1/text:synthesize?key=${key}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            input: { text },
            voice: VOICES[lang],
            audioConfig: { audioEncoding: "MP3", speakingRate: lang === "fr" ? 1.02 : 1, sampleRateHertz: 24000 },
        }),
        signal: AbortSignal.timeout(6000),
    }).catch(() => null);
    if (!response?.ok) return new Response(null, { status: 502 });

    const { audioContent } = (await response.json()) as { audioContent?: string };
    if (!audioContent) return new Response(null, { status: 502 });
    return new Response(Buffer.from(audioContent, "base64"), {
        headers: { "Content-Type": "audio/mpeg", "Cache-Control": "public, max-age=31536000, s-maxage=31536000, immutable" },
    });
}
