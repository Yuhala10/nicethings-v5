import { CATEGORIES, type Category } from "../tags";
import type { Locale } from "../i18n/config";

// URL scheme (both languages share slugs for places, cities and
// neighbourhoods so a shared link works for everyone; category words are
// localised for SEO):
//   /fr                          landing page (all of Cameroon)
//   /fr/carte                    opens the map in the visitor's city
//   /fr/douala/carte             the map app for one city
//   /fr/p/le-petit-cafe-bastos   place page
//   /fr/y-aller/<slug>           directions and navigation
//   /fr/douala                   city guide
//   /fr/douala/akwa              neighbourhood guide
//   /fr/douala/restaurants       category guide
//   /fr/douala/akwa/bars         neighbourhood × category

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

export const paths = {
    home: (locale: Locale) => `/${locale}`,
    map: (locale: Locale, query?: string) => `/${locale}/carte${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    explore: (locale: Locale, city: string, query?: string) =>
        `/${locale}/${city}/carte${query ? `?q=${encodeURIComponent(query)}` : ""}`,
    place: (locale: Locale, slug: string) => `/${locale}/p/${slug}`,
    directions: (locale: Locale, slug: string) => `/${locale}/y-aller/${slug}`,
    city: (locale: Locale, city: string) => `/${locale}/${city}`,
    neighborhood: (locale: Locale, city: string, name: string) => `/${locale}/${city}/${slugify(name)}`,
    category: (locale: Locale, city: string, category: string) => `/${locale}/${city}/${categorySlug(category, locale)}`,
    neighborhoodCategory: (locale: Locale, city: string, name: string, category: string) =>
        `/${locale}/${city}/${slugify(name)}/${categorySlug(category, locale)}`,
    saved: (locale: Locale) => `/${locale}/favoris`,
    submit: (locale: Locale) => `/${locale}/ajouter`,
    privacy: (locale: Locale) => `/${locale}/confidentialite`,
    terms: (locale: Locale) => `/${locale}/conditions`,
};

export { CATEGORIES };
