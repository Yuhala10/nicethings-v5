// Share a link with the phone's share sheet, or copy it when there is none.
// `preview` is the link-preview image: asking for it now makes the nearest
// server keep it ready, so WhatsApp (which builds previews on this same
// phone) gets it instantly a few seconds later instead of a bare link.
export async function sharePlace(title: string, url: string, text: string, preview?: string) {
    if (preview) fetch(preview, { priority: "low" }).catch(() => {});
    try {
        if (navigator.share) {
            await navigator.share({ title, text, url });
            return "shared" as const;
        }
        await navigator.clipboard.writeText(url);
        return "copied" as const;
    } catch {
        return "failed" as const;
    }
}
