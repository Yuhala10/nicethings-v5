// The faces people can wear on NiceThings: drawn avatars from open sets,
// tuned for Cameroon (deep and brown skin first; afro, twists, bantu knots,
// locs, cornrows, headwraps), on backgrounds named after our cloths and
// colours. Shared by the picker in the browser and the server that draws
// them.
//
// A choice is kept as one short code: family, seed, skin tone, background.
// "pp.k3j9x2.1.4" is a sketch, drawn from the seed "k3j9x2", in the second
// skin tone, on the fifth background. The same code always gives the same
// face, so nothing but the code is stored.

export const FAMILIES = ["pp", "tn", "mc", "lo"] as const;
export type Family = (typeof FAMILIES)[number];

export const FAMILY_NAMES: Record<Family, { fr: string; en: string }> = {
    pp: { fr: "Croquis", en: "Sketch" },
    tn: { fr: "Cartoon", en: "Cartoon" },
    mc: { fr: "Portrait", en: "Portrait" },
    lo: { fr: "Dessin", en: "Line art" },
};

// Four skin tones per family, deepest first. The swatch is a middle shade;
// each family draws its own matching one.
export const SKIN_TONES = 4;
export const SKINS: Record<Family, string[]> = {
    pp: ["694d3d", "ae5d29", "d08b5b", "edb98a"],
    tn: ["614335", "ae5d29", "d08b5b", "edb98a"],
    mc: ["5c2a1a", "77311d", "ac6651", "d39a7a"],
    lo: ["5c3a24", "763900", "9e5622", "c88a5a"],
};
export const SKIN_SWATCHES = ["5a3b2c", "8a4a26", "b8784c", "e3ae7f"];

// Backgrounds, drawn in a 100 × 100 square. The cloths are inspired by,
// not copies of: the toghu (black velvet with bright embroidery, North-West),
// the ndop (indigo with white motifs, the Grassfields' royal cloth) and wax.
export type Backdrop = { key: string; name: { fr: string; en: string }; swatch: string; svg: string };

const stripes = (colours: string[]) => colours.map((colour, index) => `<rect x="${(100 / colours.length) * index}" y="0" width="${100 / colours.length + 0.5}" height="100" fill="#${colour}"/>`).join("");

// A row of small diamonds and triangles, like an embroidered band.
function band(y: number, colours: string[]) {
    let out = "";
    for (let index = 0; index < 10; index++) {
        const x = index * 10 + 5;
        const colour = colours[index % colours.length];
        out += `<path d="M${x} ${y - 4}L${x + 4} ${y}L${x} ${y + 4}L${x - 4} ${y}Z" fill="#${colour}"/>`;
        out += `<path d="M${x + 5} ${y - 3}L${x + 7} ${y + 1}L${x + 3} ${y + 1}Z" fill="#${colours[(index + 1) % colours.length]}" opacity=".85"/>`;
    }
    return out;
}

export const BACKDROPS: Backdrop[] = [
    {
        key: "sunset",
        name: { fr: "Coucher de soleil", en: "Sunset" },
        swatch: "linear-gradient(120deg,#ec8a3f,#d9572b 55%,#c2416a)",
        svg: `<defs><linearGradient id="g" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#ec8a3f"/><stop offset=".55" stop-color="#d9572b"/><stop offset="1" stop-color="#c2416a"/></linearGradient></defs><rect width="100" height="100" fill="url(#g)"/>`,
    },
    {
        key: "toghu",
        name: { fr: "Toghu", en: "Toghu" },
        swatch: "#15110e",
        svg: `<rect width="100" height="100" fill="#15110e"/><g opacity=".9">${band(8, ["f2c230", "d9572b", "e9e1d4", "c8102e"])}${band(92, ["c8102e", "f2c230", "e9e1d4", "d9572b"])}</g>`,
    },
    {
        key: "ndop",
        name: { fr: "Ndop", en: "Ndop" },
        swatch: "#1f2f5c",
        svg: `<defs><pattern id="n" width="20" height="20" patternUnits="userSpaceOnUse"><rect width="20" height="20" fill="#1f2f5c"/><circle cx="10" cy="10" r="3.2" fill="none" stroke="#e8ecf4" stroke-width="1.2" opacity=".55"/><path d="M0 0L20 20M20 0L0 20" stroke="#e8ecf4" stroke-width=".8" opacity=".28"/></pattern></defs><rect width="100" height="100" fill="url(#n)"/>`,
    },
    {
        key: "wax",
        name: { fr: "Wax", en: "Wax" },
        swatch: "#e8743b",
        svg: `<defs><pattern id="w" width="25" height="25" patternUnits="userSpaceOnUse"><rect width="25" height="25" fill="#e8743b"/><circle cx="12.5" cy="12.5" r="9" fill="#f2c230"/><circle cx="12.5" cy="12.5" r="6" fill="#0f6e6a"/><circle cx="12.5" cy="12.5" r="3" fill="#f6efe4"/><circle cx="0" cy="0" r="3" fill="#0f6e6a"/><circle cx="25" cy="0" r="3" fill="#0f6e6a"/><circle cx="0" cy="25" r="3" fill="#0f6e6a"/><circle cx="25" cy="25" r="3" fill="#0f6e6a"/></pattern></defs><rect width="100" height="100" fill="url(#w)" opacity=".92"/>`,
    },
    {
        key: "lions",
        name: { fr: "Vert-rouge-jaune", en: "Green-red-yellow" },
        swatch: "linear-gradient(90deg,#0f7a5c 33%,#c8102e 33% 66%,#f2c230 66%)",
        svg: stripes(["0f7a5c", "c8102e", "f2c230"]),
    },
    {
        key: "forest",
        name: { fr: "Forêt", en: "Forest" },
        swatch: "linear-gradient(160deg,#2f8a5f,#0f3d2b)",
        svg: `<defs><linearGradient id="f" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#2f8a5f"/><stop offset="1" stop-color="#0f3d2b"/></linearGradient></defs><rect width="100" height="100" fill="url(#f)"/>`,
    },
    {
        key: "night",
        name: { fr: "Nuit", en: "Night" },
        swatch: "#1b1612",
        svg: `<defs><radialGradient id="r" cx=".5" cy=".35" r=".7"><stop offset="0" stop-color="#3a2f27"/><stop offset="1" stop-color="#1b1612"/></radialGradient></defs><rect width="100" height="100" fill="url(#r)"/>`,
    },
    {
        key: "gold",
        name: { fr: "Or", en: "Gold" },
        swatch: "linear-gradient(135deg,#efdcb3,#d9bc8c)",
        svg: `<defs><linearGradient id="o" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#efdcb3"/><stop offset="1" stop-color="#d9bc8c"/></linearGradient></defs><rect width="100" height="100" fill="url(#o)"/>`,
    },
    {
        key: "sky",
        name: { fr: "Ciel", en: "Sky" },
        swatch: "linear-gradient(160deg,#a9d8f0,#5aa6d6)",
        svg: `<defs><linearGradient id="s" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#a9d8f0"/><stop offset="1" stop-color="#5aa6d6"/></linearGradient></defs><rect width="100" height="100" fill="url(#s)"/>`,
    },
    {
        key: "hibiscus",
        name: { fr: "Hibiscus", en: "Hibiscus" },
        swatch: "linear-gradient(160deg,#f4a3a8,#d6456b)",
        svg: `<defs><linearGradient id="h" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f4a3a8"/><stop offset="1" stop-color="#d6456b"/></linearGradient></defs><rect width="100" height="100" fill="url(#h)"/>`,
    },
    {
        key: "sand",
        name: { fr: "Sable de Kribi", en: "Kribi sand" },
        swatch: "#f2e3c6",
        svg: `<rect width="100" height="100" fill="#f2e3c6"/>`,
    },
];

const CODE = /^(pp|tn|mc|lo)\.([a-z0-9]{4,12})\.([0-3])\.(\d{1,2})$/;

export type AvatarChoice = { family: Family; seed: string; skin: number; backdrop: number };

export function parseAvatar(code: unknown): AvatarChoice | null {
    if (typeof code !== "string") return null;
    const match = CODE.exec(code);
    if (!match) return null;
    const backdrop = Number(match[4]);
    if (backdrop >= BACKDROPS.length) return null;
    return { family: match[1] as Family, seed: match[2], skin: Number(match[3]), backdrop };
}

export function avatarCode(choice: AvatarChoice) {
    return `${choice.family}.${choice.seed}.${choice.skin}.${choice.backdrop}`;
}

export function avatarUrl(code: string) {
    return `/api/avatar/${code}`;
}

// A fresh seed: six letters and digits. Math.random is enough here, a face
// is not a secret.
export function randomSeed() {
    let seed = "";
    for (let index = 0; index < 6; index++) seed += "abcdefghijklmnopqrstuvwxyz0123456789"[Math.floor(Math.random() * 36)];
    return seed;
}

// The face given to someone who has not picked one: drawn from their name,
// so it never changes on its own.
export function defaultAvatar(handle: string): string {
    let hash = 7;
    for (const char of handle) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
    const family = FAMILIES[hash % FAMILIES.length];
    const seed = (handle.replace(/[^a-z0-9]/g, "") + "nicethings").slice(0, 12);
    return avatarCode({ family, seed, skin: (hash >> 3) % 3, backdrop: (hash >> 5) % BACKDROPS.length });
}
