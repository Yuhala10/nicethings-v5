// What someone asking for an invitation may answer (components/guest/
// RequestInvitation.tsx, app/api/invitations/request). Shared by the form and
// the server, so a choice the form offers is always one the server accepts.

export const PLATFORMS = ["instagram", "tiktok", "facebook", "youtube", "other"] as const;
export type Platform = (typeof PLATFORMS)[number];

export const LIKES = ["food", "cafe", "street", "nature", "night", "culture", "stay", "shopping"] as const;
export type Like = (typeof LIKES)[number];

// Where an account lives, from its name: what the team opens to look at it.
export function profileUrl(platform: string, handle: string) {
    const name = handle.replace(/^@/, "");
    switch (platform) {
        case "instagram":
            return `https://www.instagram.com/${name}/`;
        case "tiktok":
            return `https://www.tiktok.com/@${name}`;
        case "facebook":
            return `https://www.facebook.com/${name}`;
        case "youtube":
            return `https://www.youtube.com/@${name}`;
        default:
            return null;
    }
}
