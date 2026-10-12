// Share a link with the phone's share sheet, or copy it when there is none.
//
// `text` is the sentence sent with the link. A place is shared with none: a
// conversation then shows the place's card and, under it, nothing but its
// short address (lib/places/short.ts).
//
// `preview` is the card's picture: asking for it now makes the nearest
// server keep it ready, so WhatsApp (which builds the card on this same
// phone) gets it instantly a few seconds later instead of a bare link.
export async function sharePlace(title: string, url: string, text: string, preview?: string) {
    if (preview) fetch(preview, { priority: "low" }).catch(() => {});
    try {
        if (navigator.share) {
            await navigator.share(text ? { title, text, url } : { title, url });
            return "shared" as const;
        }
        await navigator.clipboard.writeText(url);
        return "copied" as const;
    } catch {
        return "failed" as const;
    }
}
