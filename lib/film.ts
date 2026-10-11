import { FILM_PHOTOS as P, type FilmPhoto } from "./film-photos";
import type { Locale } from "./i18n/config";

// The opening film of the home page, written as a score: one scene after
// another, each lasting a whole number of beats so every cut falls on the
// music. It is drawn by components/landing/Film.tsx from real photos of the
// site; nothing in it is filmed or generated. Every fact shown comes from
// the place pages and articles of the site (which cite their sources).

type Text = Record<Locale, string>;

export const BEAT = 0.6; // seconds: 100 beats a minute

// What the music does under a scene: "air" is a held chord only, "beat" the
// full rhythm, "break" holds the drums back for a breath.
type Cue = { beats: number; chapter: number; music: "air" | "beat" | "break"; hit?: boolean; rise?: boolean };

export type FilmScene = Cue &
    (
        | { kind: "words"; lines: Text[]; accent?: boolean }
        | { kind: "montage"; photos: FilmPhoto[]; title: string; sub: Text }
        | { kind: "chapter"; number: string; label: Text }
        | { kind: "shot"; photo: FilmPhoto; title: Text; sub?: Text; enter: "zoom" | "wipe-x" | "wipe-y" | "iris" }
        | { kind: "count"; items: { value: number; label: Text }[]; line: Text }
        | { kind: "names"; names: string[]; line: Text }
        | { kind: "end"; line: Text; cta: Text }
    );

const same = (text: string): Text => ({ fr: text, en: text });

export const FILM_CHAPTERS: Text[] = [
    { fr: "Ouverture", en: "Opening" },
    { fr: "La terre", en: "The land" },
    { fr: "Les royaumes", en: "The kingdoms" },
    { fr: "La table", en: "The table" },
    { fr: "La nuit", en: "The night" },
    { fr: "Le pays", en: "The country" },
];

export const FILM: FilmScene[] = [
    // ---- Opening
    { kind: "words", beats: 8, chapter: 0, music: "air", lines: [{ fr: "On dit que le Cameroun", en: "They say Cameroon" }, { fr: "n’a rien d’extraordinaire.", en: "is nothing special." }] },
    { kind: "words", beats: 4, chapter: 0, music: "air", rise: true, accent: true, lines: [{ fr: "Viens voir.", en: "Come and see." }] },
    {
        kind: "montage", beats: 8, chapter: 0, music: "beat", hit: true,
        photos: [P.cameroun, P.ekom, P.palace, P.night, P.soya, P.manengouba, P.pagode, P.lobe],
        title: "Le Continent",
        sub: { fr: "Le Cameroun. On l’appelle l’Afrique en miniature.", en: "Cameroon. They call it Africa in miniature." },
    },
    // ---- The land
    { kind: "chapter", beats: 2, chapter: 1, music: "break", number: "01", label: FILM_CHAPTERS[1] },
    { kind: "shot", beats: 4, chapter: 1, music: "beat", enter: "zoom", photo: P.cameroun, title: same("Mont Cameroun"), sub: { fr: "Plus de 4 000 mètres. Un volcan vivant.", en: "Over 4,000 metres. A living volcano." } },
    { kind: "shot", beats: 4, chapter: 1, music: "beat", enter: "wipe-x", photo: P.lobe, title: { fr: "Chutes de la Lobé", en: "The Lobé falls" }, sub: { fr: "Un fleuve qui tombe dans l’océan.", en: "A river that falls into the ocean." } },
    { kind: "shot", beats: 4, chapter: 1, music: "beat", enter: "iris", photo: P.ekom, title: { fr: "Chutes d’Ekom-Nkam", en: "The Ekom-Nkam falls" }, sub: { fr: "80 mètres. Tarzan a été tourné ici.", en: "80 metres. Tarzan was filmed here." } },
    { kind: "shot", beats: 4, chapter: 1, music: "beat", enter: "wipe-y", photo: P.manengouba, title: { fr: "Lacs du Manengouba", en: "The Manengouba lakes" }, sub: { fr: "Un lac vert. Un lac bleu.", en: "One green lake. One blue lake." } },
    { kind: "shot", beats: 4, chapter: 1, music: "beat", enter: "zoom", photo: P.mindif, title: { fr: "Dent de Mindif", en: "The Mindif Tooth" }, sub: { fr: "Plus au nord, le Sahel.", en: "Further north, the Sahel." } },
    { kind: "shot", beats: 4, chapter: 1, music: "beat", enter: "wipe-x", photo: P.ossa, title: { fr: "Lac Ossa", en: "Lake Ossa" }, sub: { fr: "22 îles. Des lamantins.", en: "22 islands. Manatees." } },
    // ---- The kingdoms
    { kind: "chapter", beats: 2, chapter: 2, music: "break", number: "02", label: FILM_CHAPTERS[2] },
    { kind: "shot", beats: 4, chapter: 2, music: "beat", enter: "iris", photo: P.palace, title: same("Foumban"), sub: { fr: "Une dynastie depuis 1394.", en: "A dynasty since 1394." } },
    { kind: "shot", beats: 4, chapter: 2, music: "beat", enter: "wipe-y", photo: P.njoya, title: { fr: "Le roi Njoya", en: "King Njoya" }, sub: { fr: "Il a donné une écriture à son peuple.", en: "He gave his people a script." } },
    { kind: "shot", beats: 4, chapter: 2, music: "beat", enter: "zoom", photo: P.pagode, title: same("Douala"), sub: { fr: "Manga Bell, le roi qui a dit non.", en: "Manga Bell, the king who said no." } },
    { kind: "shot", beats: 4, chapter: 2, music: "beat", enter: "wipe-x", photo: P.bimbia, title: same("Bimbia"), sub: { fr: "Une mémoire que l’on garde.", en: "A memory we keep." } },
    // ---- The table
    { kind: "chapter", beats: 2, chapter: 3, music: "break", number: "03", label: FILM_CHAPTERS[3] },
    { kind: "shot", beats: 2, chapter: 3, music: "beat", enter: "zoom", photo: P.eru, title: same("Eru") },
    { kind: "shot", beats: 2, chapter: 3, music: "beat", enter: "zoom", photo: P.soya, title: same("Soya") },
    { kind: "shot", beats: 2, chapter: 3, music: "beat", enter: "zoom", photo: P.beignets, title: same("Beignets-haricots") },
    // ---- The night
    { kind: "chapter", beats: 2, chapter: 4, music: "break", number: "04", label: FILM_CHAPTERS[4] },
    { kind: "shot", beats: 4, chapter: 4, music: "beat", enter: "wipe-y", photo: P.night, title: same("Yaoundé"), sub: { fr: "Quand la nuit tombe, la ville sort.", en: "When night falls, the city comes out." } },
    { kind: "shot", beats: 4, chapter: 4, music: "beat", enter: "iris", photo: P.match, title: { fr: "Le snack-bar", en: "The snack-bar" }, sub: { fr: "Le match, la table, les amis.", en: "The match, the table, the friends." } },
    { kind: "shot", beats: 4, chapter: 4, music: "beat", enter: "wipe-x", photo: P.dusk, title: same("Douala"), sub: { fr: "Makossa. Bikutsi. Jusqu’au matin.", en: "Makossa. Bikutsi. Until morning." } },
    // ---- The country
    {
        kind: "count", beats: 6, chapter: 5, music: "beat",
        items: [
            { value: 309, label: { fr: "langues", en: "languages" } },
            { value: 10, label: { fr: "régions", en: "regions" } },
            { value: 2, label: { fr: "langues officielles", en: "official languages" } },
        ],
        line: { fr: "Un seul pays.", en: "One country." },
    },
    {
        kind: "names", beats: 8, chapter: 5, music: "beat",
        names: ["Um Nyobè", "Manga Bell", "Njoya", "Manu Dibango", "Roger Milla", "Françoise Mbango", "Francis Ngannou", "Arthur Zang"],
        line: { fr: "Un pays qui fabrique des géants.", en: "A country that raises giants." },
    },
    { kind: "words", beats: 4, chapter: 5, music: "air", lines: [{ fr: "Le Cameroun", en: "Cameroon" }, { fr: "n’est pas parfait.", en: "is not perfect." }] },
    { kind: "words", beats: 4, chapter: 5, music: "air", hit: true, accent: true, lines: [{ fr: "Il est immense.", en: "It is immense." }] },
    { kind: "end", beats: 8, chapter: 5, music: "beat", hit: true, line: { fr: "Viens voir par toi-même.", en: "Come and see for yourself." }, cta: { fr: "Explorer", en: "Explore" } },
];

// When each scene starts, in beats from the top, and the whole length.
export const FILM_STARTS = FILM.reduce<number[]>((starts, scene, index) => [...starts, index === 0 ? 0 : starts[index - 1] + FILM[index - 1].beats], []);
export const FILM_BEATS = FILM.reduce((sum, scene) => sum + scene.beats, 0);
