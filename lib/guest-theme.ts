import type { Tier } from "./invitations";

// The two ranks of guests, as they are drawn everywhere (cards, pages, the
// line under a place's name, the invitation itself):
//   guest   ink and champagne, the printed-invitation look;
//   honour  emerald and gold leaf (site.css .nt-foil), the green of the flag
//           and the gold of its star.
// Written out in full so the stylesheet keeps every class.

export type GuestTheme = {
    panel: string; // the big dark surface
    text: string; // words on it
    soft: string; // quieter words on it
    accent: string; // the rank's colour on words (gold leaf for honour)
    frame: string; // the thin line inside the panel
    ring: string; // the border around a portrait or a seal
    portraitBack: string; // behind a portrait while it loads
    glow: string; // the light in a corner of the panel
    seal: string; // the small pill with the rank and number
    button: string; // the light button on the panel
    nod: string; // the line under a place's name
    nodRank: string; // the rank in that line
    star: boolean; // the gold star
};

export const GUEST_THEMES: Record<Tier, GuestTheme> = {
    guest: {
        panel: "bg-[#15110e]",
        text: "text-[#faf7f2]",
        soft: "text-[#faf7f2]/75",
        accent: "text-[#d9bc8c]",
        frame: "border-[#d9bc8c]/35",
        ring: "border-[#d9bc8c]/60",
        portraitBack: "bg-[#241b15]",
        glow: "bg-[radial-gradient(circle,rgba(192,71,27,0.35),transparent_68%)]",
        seal: "border-[#d9bc8c] bg-[#15110e] text-[#d9bc8c]",
        button: "bg-[#faf7f2] text-[#15110e] hover:bg-white",
        nod: "border-[#d9bc8c]/70 bg-[#faf6ee] text-[#15110e] dark:bg-[#211a14] dark:text-[#faf7f2]",
        nodRank: "text-[#a8824a]",
        star: false,
    },
    honour: {
        panel: "bg-[#0a3326]",
        text: "text-[#fbf6e9]",
        soft: "text-[#fbf6e9]/75",
        accent: "nt-foil",
        frame: "border-[#e2c065]/45",
        ring: "border-[#e2c065]",
        portraitBack: "bg-[#06231a]",
        glow: "bg-[radial-gradient(circle,rgba(226,192,101,0.32),transparent_68%)]",
        seal: "border-[#e2c065] bg-[#06231a] text-[#f3d77e]",
        button: "nt-foil-bg text-[#06231a]",
        nod: "border-[#e2c065] bg-[#0a3326] text-[#fbf6e9]",
        nodRank: "text-[#f3d77e]",
        star: true,
    },
};

export const themeOf = (tier: Tier | null | undefined) => GUEST_THEMES[tier === "honour" ? "honour" : "guest"];
