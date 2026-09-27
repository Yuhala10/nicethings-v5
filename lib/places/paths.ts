import { CATEGORIES, YAOUNDE_NEIGHBORHOODS, type Category } from "../tags";
import type { Locale } from "../i18n/config";

// URL scheme (both languages share slugs for places and neighbourhoods so a
// shared link works for everyone; category words are localised for SEO):
//   /fr                          explore (map)
//   /fr/p/le-petit-cafe-bastos   place page
//   /fr/y-aller/<slug>           directions
//   /fr/yaounde                  city guide
//   /fr/yaounde/bastos           neighbourhood guide
//   /fr/yaounde/restaurants      category guide
//   /fr/yaounde/bastos/bars      neighbourhood × category

export function slugify(value: string) {
    return value
        .normalize("NFD")
        .replace(/[̀-ͯ]/g, "")
        .toLowerCase()
        .replace(/&/g, " et ")
        .replace(/[^a-z0-9]+/g, "-")
        .replace(/^-+|-+$/g, "");
}

const CATEGORY_SLUGS: Record<Category, Record<Locale, string>> = {
    Restaurant: { fr: "restaurants", en: "restaurants" },
    Cafe: { fr: "cafes", en: "cafes" },
    Bar: { fr: "bars", en: "bars" },
    Club: { fr: "boites-de-nuit", en: "nightclubs" },
    Hotel: { fr: "hotels", en: "hotels" },
    Bakery: { fr: "boulangeries-patisseries", en: "bakeries" },
    Shopping: { fr: "shopping", en: "shopping" },
    Beauty: { fr: "beaute", en: "beauty" },
    Wellness: { fr: "bien-etre-sport", en: "wellness-fitness" },
    Entertainment: { fr: "loisirs", en: "activities" },
    Culture: { fr: "culture", en: "culture" },
    Nature: { fr: "nature-parcs", en: "parks-nature" },
    Other: { fr: "autres", en: "other" },
};

// Plural labels for headings ("Restaurants à Bastos").
export const CATEGORY_PLURALS: Record<Category, Record<Locale, string>> = {
    Restaurant: { fr: "Restaurants", en: "Restaurants" },
    Cafe: { fr: "Cafés", en: "Cafés" },
    Bar: { fr: "Bars & lounges", en: "Bars & lounges" },
    Club: { fr: "Boîtes de nuit", en: "Nightclubs" },
    Hotel: { fr: "Hôtels", en: "Hotels" },
    Bakery: { fr: "Boulangeries & pâtisseries", en: "Bakeries & pastry shops" },
    Shopping: { fr: "Shopping", en: "Shopping" },
    Beauty: { fr: "Salons de beauté", en: "Beauty salons" },
    Wellness: { fr: "Bien-être & sport", en: "Wellness & fitness" },
    Entertainment: { fr: "Loisirs", en: "Activities" },
    Culture: { fr: "Culture & visites", en: "Culture & sights" },
    Nature: { fr: "Parcs & nature", en: "Parks & nature" },
    Other: { fr: "Autres lieux", en: "Other places" },
};

export function categorySlug(category: string, locale: Locale) {
    return CATEGORY_SLUGS[category as Category]?.[locale] ?? slugify(category);
}

export function categoryFromSlug(slug: string): Category | null {
    for (const [category, slugs] of Object.entries(CATEGORY_SLUGS)) {
        if (slugs.fr === slug || slugs.en === slug) return category as Category;
    }
    return null;
}

export function neighborhoodFromSlug(slug: string) {
    return YAOUNDE_NEIGHBORHOODS.find((area) => slugify(area.name) === slug) ?? null;
}

export const paths = {
    explore: (locale: Locale) => `/${locale}`,
    place: (locale: Locale, slug: string) => `/${locale}/p/${slug}`,
    directions: (locale: Locale, slug: string) => `/${locale}/y-aller/${slug}`,
    city: (locale: Locale) => `/${locale}/yaounde`,
    neighborhood: (locale: Locale, name: string) => `/${locale}/yaounde/${slugify(name)}`,
    category: (locale: Locale, category: string) => `/${locale}/yaounde/${categorySlug(category, locale)}`,
    neighborhoodCategory: (locale: Locale, name: string, category: string) =>
        `/${locale}/yaounde/${slugify(name)}/${categorySlug(category, locale)}`,
    search: (locale: Locale, query?: string) =>
        `/${locale}/recherche${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    saved: (locale: Locale) => `/${locale}/favoris`,
    submit: (locale: Locale) => `/${locale}/ajouter`,
    privacy: (locale: Locale) => `/${locale}/confidentialite`,
    terms: (locale: Locale) => `/${locale}/conditions`,
};

export { CATEGORIES };
