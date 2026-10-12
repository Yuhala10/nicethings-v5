import type { Locale } from "./i18n/config";

// "Chroniques de la rue": what Cameroon eats outside, chapter by chapter. Each
// one is tied to an editorial collection (lib/places/collections.ts), so the
// places under it are the ones the catalogue really holds. The words say
// only what anyone who has eaten there knows: nothing is claimed about a
// particular seller.

type Text = Record<Locale, string>;

// `needsPlaces`: a chapter that only makes sense with addresses under it (it
// speaks of opening hours) stays away until the catalogue has some.
export const STREET_CHAPTERS: { collection: string; title: Text; body: Text; needsPlaces?: boolean }[] = [
    {
        collection: "braise",
        title: { fr: "La braise", en: "The grill" },
        body: {
            fr: "Le poisson se choisit à l'œil sur l'étal, part sur la grille et revient avec du piment, des oignons et, selon l'envie, du bâton de manioc, du miondo ou des plantains frits. On mange avec les doigts, et on prend son temps. À côté, le soya : des brochettes de viande grillée, vendues au coin de la rue, surtout le soir.",
            en: "You choose your fish by eye at the stall; it goes on the grill and comes back with chilli, onions and, as you like, cassava sticks, miondo or fried plantain. You eat with your fingers, and you take your time. Next to it, soya: skewers of grilled meat sold on the street corner, mostly in the evening.",
        },
    },
    {
        collection: "beignets",
        title: { fr: "Beignets-haricots", en: "Beignets and beans" },
        body: {
            fr: "Des beignets tout chauds, des haricots mijotés, une bouillie : on dit aussi « BHB ». Le trio se sert tôt le matin et revient à la tombée de la nuit. Beaucoup de vendeurs n'ont pas d'enseigne : on les reconnaît à la file d'attente.",
            en: "Hot beignets, stewed beans and a bowl of bouillie: people also say “BHB”. The trio is served early in the morning and comes back at nightfall. Many sellers have no sign: you know them by the queue.",
        },
    },
    {
        collection: "chicken",
        title: { fr: "Le poulet", en: "Chicken" },
        body: {
            fr: "Braisé, frit ou à la broche, avec des plantains ou des frites. Chaque quartier a son adresse, et chacun défend la sienne.",
            en: "Grilled, fried or off the spit, with plantain or chips. Every neighbourhood has its place, and everyone stands up for theirs.",
        },
    },
    {
        collection: "local",
        title: { fr: "La marmite", en: "The pot" },
        body: {
            fr: "Ndolé, eru, taro sauce jaune, koki, poulet DG : les plats de la maison se mangent aussi dehors, dans les restaurants de quartier, à l'heure du déjeuner.",
            en: "Ndolé, eru, taro with yellow sauce, koki, poulet DG: home dishes are eaten out too, in neighbourhood restaurants, at lunchtime.",
        },
    },
    {
        collection: "late-grill",
        needsPlaces: true,
        title: { fr: "Après minuit", en: "After midnight" },
        body: {
            fr: "Quand la soirée se prolonge, c'est souvent autour d'un poisson ou de quelques brochettes qu'elle se termine. Voici les braises dont les horaires disent qu'elles tiennent après minuit.",
            en: "When the evening runs on, it often ends around a fish or a few skewers. Here are the grills whose opening hours say they keep going after midnight.",
        },
    },
    {
        collection: "breakfast",
        needsPlaces: true,
        title: { fr: "Le petit matin", en: "Early morning" },
        body: {
            fr: "Du pain chaud, un café, une omelette au coin de la rue : la journée commence tôt. Ces adresses ouvrent à 7 h 30 ou avant, d'après leurs horaires.",
            en: "Warm bread, a coffee, an omelette on the street corner: the day starts early. These places open at 7:30 am or before, according to their hours.",
        },
    },
];
