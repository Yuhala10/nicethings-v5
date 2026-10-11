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

    // What he believes about his country, as he asked for it to be said:
    // Cameroon is not perfect, it is great; blaming one another moves
    // nothing, walking through the hurdles does. The people named did what
    // is said of them (their Wikipedia articles are the source): no words
    // are put in anyone's mouth.
    thirdPhoto: "/founder/yuhala-darren-tuma-3.jpg",
    country: {
        eyebrow: { fr: "Ce qu'il croit", en: "What he believes" } as Text,
        title: {
            fr: ["Le Cameroun n'est pas parfait.", "Il est immense."],
            en: ["Cameroon is not perfect.", "It is immense."],
        } as Record<Locale, [string, string]>,
        message: {
            fr: [
                "On entend souvent que rien ne marche au Cameroun. Il ne prétend pas que tout va bien : les imperfections du pays, il les vit comme tout le monde.",
                "Mais il refuse deux choses : en avoir honte, et passer son temps à chercher un coupable. Se renvoyer la faute n'a jamais fait avancer personne.",
                "Ce pays a déjà montré ce dont il est capable quand quelqu'un décide d'avancer malgré les obstacles.",
            ],
            en: [
                "People often say that nothing works in Cameroon. He does not pretend all is well: he lives the country's imperfections like everyone else.",
                "But he refuses two things: to be ashamed of it, and to spend his time looking for someone to blame. Passing the blame around has never moved anyone forward.",
                "This country has already shown what it can do when someone decides to move forward in spite of the hurdles.",
            ],
        } as Record<Locale, string[]>,
        giants: [
            { name: "Ibrahim Njoya", did: { fr: "Roi des Bamoun, il a donné une écriture à son peuple pour garder son histoire.", en: "King of the Bamoun, he gave his people a script to keep their history." } },
            { name: "Rudolf Douala Manga Bell", did: { fr: "Il a pris la tête de la résistance quand on a voulu chasser les siens de leurs terres.", en: "He led the resistance when his people were to be driven from their land." } },
            { name: "Ruben Um Nyobè", did: { fr: "Le « Mpodol », celui qui porte la parole des siens, a défendu la cause du Cameroun devant les Nations unies en 1952.", en: "The “Mpodol”, the one who carries his people's word, took Cameroon's cause to the United Nations in 1952." } },
            { name: "Manu Dibango", did: { fr: "Il a composé « Soul Makossa » en 1972, sur la face B d'un 45 tours. Le titre a conquis les États-Unis.", en: "He wrote “Soul Makossa” in 1972, on the B-side of a single. The track conquered the United States." } },
            { name: "Roger Milla", did: { fr: "En 1990, avec lui, le Cameroun est devenu le premier pays africain en quart de finale d'une Coupe du monde. Il avait 38 ans.", en: "In 1990, with him, Cameroon became the first African country in a World Cup quarter-final. He was 38." } },
            { name: "Françoise Mbango Etone", did: { fr: "Née à Yaoundé, championne olympique du triple saut en 2004 et en 2008.", en: "Born in Yaoundé, Olympic triple jump champion in 2004 and 2008." } },
            { name: "Francis Ngannou", did: { fr: "Né à Batié, champion des poids lourds de l'UFC en 2021.", en: "Born in Batié, UFC heavyweight champion in 2021." } },
            { name: "Arthur Zang", did: { fr: "Ingénieur formé à Polytechnique Yaoundé, il a créé le CardioPad, pour qu'un cardiologue lise un électrocardiogramme à distance.", en: "An engineer trained at Polytechnique Yaoundé, he created the CardioPad, so that a cardiologist can read an electrocardiogram from a distance." } },
        ] as { name: string; did: Text }[],
        close: {
            fr: "Aucun d'eux n'a attendu que tout soit parfait. C'est ce qu'il essaie de faire, à son échelle, avec NiceThings : traverser les obstacles un par un, et rendre le pays un peu plus simple à vivre et un peu plus beau à découvrir, pour tous ceux qui y sont.",
            en: "None of them waited for everything to be perfect. That is what he tries to do, at his own scale, with NiceThings: walk through the hurdles one by one, and make the country a little easier to live in and a little more beautiful to discover, for everyone in it.",
        } as Text,
        source: { fr: "Les faits cités viennent des articles Wikipédia consacrés à chacun.", en: "The facts quoted come from each person's Wikipedia article." } as Text,
    },

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
