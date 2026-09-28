// Share a link with the phone's share sheet, or copy it when there is none.
export async function sharePlace(title: string, url: string, text: string) {
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
