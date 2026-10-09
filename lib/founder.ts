import { SITE_URL, type Locale } from "./i18n/config";

// The person behind NiceThings, in one place: the About page, the home page,
// the footer, article bylines and the structured data all read from here.
// Only what the founder gave us to publish goes in: nothing is made up.

type Text = Record<Locale, string>;

export const FOUNDER = {
    name: "Yuhala Darren Tuma",
    role: { fr: "Fondateur de NiceThings", en: "Founder of NiceThings" } as Text,
    email: "yuhala24@gmail.com",

    // Files under /public/founder. The studio portrait is 3:4; the face crop
    // serves the small round pictures; the second one sits beside the story.
    photo: "/founder/yuhala-darren-tuma.jpg",
    avatar: "/founder/yuhala-darren-tuma-avatar.jpg",
    secondPhoto: "/founder/yuhala-darren-tuma-2.jpg",

    school: {
        name: "École Nationale Supérieure Polytechnique de Yaoundé",
        short: "ENSPY",
        year: { fr: "2e année", en: "2nd year" } as Text,
    },

    // One sentence under the name, also the summary given to search engines.
    lead: {
        fr: "Étudiant en deuxième année à Polytechnique Yaoundé (ENSPY), il a créé VariantFlow, Tayeb et NiceThings.",
        en: "A second-year student at Polytechnique Yaoundé (ENSPY), he built VariantFlow, Tayeb and NiceThings.",
    } as Text,

    // The line the story turns on, in two beats (the second is set in italics).
    pull: {
        fr: ["Construire, il savait.", "Il lui restait à se faire connaître."],
        en: ["He knew how to build.", "Getting known was the hard part."],
    } as Record<Locale, [string, string]>,

    // One paragraph per entry. The dates, the count of projects and what each
    // app does come from his public GitHub (github.com/Yuhala10) and from
    // the apps' own pages.
    story: {
        fr: [
            "Yuhala Darren Tuma est en deuxième année à l'École Nationale Supérieure Polytechnique de Yaoundé (ENSPY). En parallèle de ses études, il construit des applications.",
            "Sur son GitHub, le premier projet public date de novembre 2025. Moins d'un an plus tard, il y en a plus de quinze.",
            "Parmi eux : VariantFlow, qui génère les variantes et les références produits des boutiques Shopify. Tayeb, une plateforme logistique. Surety, qui garde l'argent d'une vente en séquestre jusqu'à ce que l'acheteur et le vendeur soient d'accord. Trust, qui transforme les cahiers des commerçants de marché en un dossier qu'un prêteur peut vérifier ligne par ligne.",
            "De ces projets, il a tiré une leçon : son vrai problème n'était pas de construire, c'était le marketing. Une application que personne ne connaît ne sert à personne, même bien faite.",
            "Avec NiceThings, il fait les deux. Le guide en est à sa cinquième version, et il le fait connaître lui-même : un guide gratuit pour trouver où manger, sortir et se poser au Cameroun, une ville et une bonne adresse à la fois.",
            "Tu gères un lieu, une adresse manque, ou tu veux simplement parler du projet ? Écris-lui.",
        ],
        en: [
            "Yuhala Darren Tuma is a second-year student at the National Advanced School of Engineering of Yaoundé (ENSPY, known as Polytechnique Yaoundé). Alongside his studies, he builds apps.",
            "On his GitHub, the first public project dates from November 2025. Less than a year later, there are more than fifteen.",
            "Among them: VariantFlow, which generates product variants and SKUs for Shopify stores. Tayeb, a logistics platform. Surety, which holds the money from a sale in escrow until buyer and seller both agree. Trust, which turns market traders' notebooks into a record a lender can check line by line.",
            "Those projects taught him one thing: building was not his real problem. Marketing was. An app nobody has heard of helps nobody, however well it is made.",
            "With NiceThings he does both. The guide is on its fifth version, and he makes it known himself: a free guide to where to eat, go out and unwind in Cameroon, one city and one good place at a time.",
            "Do you run a place, is an address missing, or do you simply want to talk about the project? Write to him.",
        ],
    } as Record<Locale, string[]>,

    // What he has built. A link only when the app is online.
    works: [
        { name: "NiceThings", note: { fr: "Le guide du Cameroun", en: "The guide to Cameroon" }, url: null },
        { name: "VariantFlow", note: { fr: "Variantes et SKU pour Shopify", en: "Variants and SKUs for Shopify" }, url: "https://variantflow-omega.vercel.app" },
        { name: "Tayeb", note: { fr: "Plateforme logistique", en: "Logistics platform" }, url: null },
        { name: "Surety", note: { fr: "Paiements sous séquestre", en: "Escrow payments" }, url: "https://surety-omega.vercel.app" },
        { name: "Trust", note: { fr: "Dossier de crédit des commerçants", en: "Credit records for market traders" }, url: null },
    ] as { name: string; note: Text; url: string | null }[],

    // Public profiles (LinkedIn, Instagram…): shown on the About page and
    // given to search engines as the same person.
    links: [
        { label: "LinkedIn", url: "https://www.linkedin.com/in/yuhala-darren-3234b1403" },
        { label: "GitHub", url: "https://github.com/Yuhala10" },
    ] as { label: string; url: string }[],
};

// Stable identifiers so every page describes the same person and the same
// organisation to search engines.
export const FOUNDER_ID = `${SITE_URL}/#founder`;
export const ORGANIZATION_ID = `${SITE_URL}/#organization`;

function normalise(value: string) {
    return value.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();
}

// An article is the founder's when its byline is his name.
export function isFounder(author: string | null | undefined) {
    return Boolean(author) && normalise(author!) === normalise(FOUNDER.name);
}

// The founder as schema.org sees him. `aboutUrl` is the About page in the
// language of the page carrying the data.
export function founderJsonLd(aboutUrl: string, lang: Locale) {
    return {
        "@type": "Person",
        "@id": FOUNDER_ID,
        name: FOUNDER.name,
        jobTitle: FOUNDER.role[lang],
        description: FOUNDER.lead[lang],
        url: aboutUrl,
        image: `${SITE_URL}${FOUNDER.photo}`,
        sameAs: FOUNDER.links.map((link) => link.url),
        affiliation: { "@type": "CollegeOrUniversity", name: FOUNDER.school.name, alternateName: FOUNDER.school.short },
        worksFor: { "@type": "Organization", "@id": ORGANIZATION_ID, name: "NiceThings", url: SITE_URL },
    };
}
