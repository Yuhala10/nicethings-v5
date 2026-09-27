// Fixed vocabularies for describing a place. Stored in nt_spots as text[]
// using the keys below; labels are shown to visitors in their language.
// Keep keys stable: renaming one orphans every place already tagged with it.

export type TagLabel = {
    en: string;
    fr: string;
};

function defineTags<const T extends Record<string, TagLabel>>(tags: T) {
    return tags;
}

export const VIBES = defineTags({
    calm: { en: "Calm", fr: "Calme" },
    lively: { en: "Lively", fr: "Animé" },
    romantic: { en: "Romantic", fr: "Romantique" },
    chic: { en: "Chic", fr: "Chic" },
    casual: { en: "Casual", fr: "Décontracté" },
    local: { en: "Authentic local", fr: "Authentique" },
    trendy: { en: "Trendy", fr: "Tendance" },
    outdoor: { en: "Open air", fr: "En plein air" },
});

export const GOOD_FOR = defineTags({
    date: { en: "Date", fr: "Rendez-vous" },
    friends: { en: "Friends", fr: "Entre amis" },
    family: { en: "Family & kids", fr: "Famille" },
    study: { en: "Study / work", fr: "Étudier / travailler" },
    business: { en: "Business meeting", fr: "Réunion d'affaires" },
    solo: { en: "Going solo", fr: "Seul(e)" },
    party: { en: "Party / night out", fr: "Faire la fête" },
    football: { en: "Watching football", fr: "Regarder le foot" },
    celebration: { en: "Birthday / celebration", fr: "Anniversaire / fête" },
});

export const AMENITIES = defineTags({
    wifi: { en: "Wi-Fi", fr: "Wi-Fi" },
    ac: { en: "Air conditioning", fr: "Climatisation" },
    generator: { en: "Generator (no blackouts)", fr: "Groupe électrogène" },
    parking: { en: "Parking", fr: "Parking" },
    terrace: { en: "Terrace", fr: "Terrasse" },
    live_music: { en: "Live music", fr: "Musique live" },
    screens: { en: "TV screens", fr: "Écrans TV" },
    delivery: { en: "Delivery", fr: "Livraison" },
    mobile_money: { en: "Mobile Money", fr: "Mobile Money" },
    card: { en: "Card payment", fr: "Paiement par carte" },
});

export type Vibe = keyof typeof VIBES;
export type GoodFor = keyof typeof GOOD_FOR;
export type Amenity = keyof typeof AMENITIES;

export const CATEGORIES = defineTags({
    Restaurant: { en: "Restaurant", fr: "Restaurant" },
    Cafe: { en: "Café", fr: "Café" },
    Bar: { en: "Bar & lounge", fr: "Bar & lounge" },
    Club: { en: "Nightclub", fr: "Boîte de nuit" },
    Hotel: { en: "Hotel", fr: "Hôtel" },
    Bakery: { en: "Bakery & pastry", fr: "Boulangerie & pâtisserie" },
    Shopping: { en: "Shopping", fr: "Shopping" },
    Beauty: { en: "Beauty & hair", fr: "Beauté & coiffure" },
    Wellness: { en: "Wellness & sport", fr: "Bien-être & sport" },
    Entertainment: { en: "Activities & fun", fr: "Loisirs" },
    Culture: { en: "Culture & sights", fr: "Culture & visites" },
    Nature: { en: "Nature & parks", fr: "Nature & parcs" },
    Other: { en: "Other", fr: "Autre" },
});

export type Category = keyof typeof CATEGORIES;

// Budget bands per person, in FCFA, used by the home-screen budget chips.
export const BUDGETS = [
    { key: "under5", max: 5000, label: { en: "Under 5k", fr: "Moins de 5k" } },
    { key: "5to10", min: 5000, max: 10000, label: { en: "5–10k", fr: "5–10k" } },
    { key: "10to20", min: 10000, max: 20000, label: { en: "10–20k", fr: "10–20k" } },
    { key: "over20", min: 20000, label: { en: "20k+", fr: "20k et +" } },
] as const;

export function tagLabel(
    vocabulary: Record<string, TagLabel>,
    key: string,
    language: "en" | "fr"
) {
    return vocabulary[key]?.[language] ?? key;
}
