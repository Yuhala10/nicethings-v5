import type { Locale } from "./i18n/config";

// Plain-language legal pages. They describe what the app actually does;
// update them whenever data handling changes.

type Doc = { title: string; updated: string; sections: { heading: string; body: string[] }[] };

export const PRIVACY: Record<Locale, Doc> = {
    fr: {
        title: "Confidentialité",
        updated: "Mise à jour : 27 septembre 2026",
        sections: [
            {
                heading: "En bref",
                body: [
                    "NiceThings fonctionne sans compte. On ne vend aucune donnée et il n'y a pas de publicité ciblée.",
                ],
            },
            {
                heading: "Ce qui reste sur ton téléphone",
                body: [
                    "Tes favoris, le quartier que tu choisis et ta langue sont enregistrés dans ton navigateur. Ils ne sont pas envoyés à nos serveurs. Effacer les données du site les supprime.",
                ],
            },
            {
                heading: "Ta position",
                body: [
                    "Ta position n'est demandée que si tu appuies sur « Utiliser ma position ». Elle sert dans ton navigateur à trier les lieux par distance.",
                    "Pour calculer un itinéraire, ton point de départ et la destination sont envoyés au service de calcul d'itinéraires OSRM (OpenStreetMap). Les fonds de carte viennent d'OpenFreeMap, qui reçoit ton adresse IP comme tout site web.",
                ],
            },
            {
                heading: "Ce que tu nous envoies",
                body: [
                    "Quand tu proposes un lieu ou signales une erreur, on enregistre ce que tu écris (et ta position si tu l'ajoutes) pour vérifier et mettre à jour la fiche. N'y mets pas d'informations personnelles.",
                ],
            },
            {
                heading: "Hébergement",
                body: ["Le site est hébergé par Vercel et les données des lieux par Supabase."],
            },
        ],
    },
    en: {
        title: "Privacy",
        updated: "Updated: 27 September 2026",
        sections: [
            {
                heading: "In short",
                body: ["NiceThings works without an account. We don't sell any data and there is no targeted advertising."],
            },
            {
                heading: "What stays on your phone",
                body: [
                    "Your saved places, chosen neighbourhood and language are stored in your browser. They are not sent to our servers. Clearing the site's data removes them.",
                ],
            },
            {
                heading: "Your location",
                body: [
                    "We only ask for your location when you tap “Use my location”. It is used in your browser to sort places by distance.",
                    "To calculate directions, your starting point and the destination are sent to the OSRM routing service (OpenStreetMap). Map tiles come from OpenFreeMap, which sees your IP address like any website.",
                ],
            },
            {
                heading: "What you send us",
                body: [
                    "When you suggest a place or report an error, we store what you write (and your position if you add it) to check and update the listing. Please don't include personal information.",
                ],
            },
            {
                heading: "Hosting",
                body: ["The site is hosted by Vercel and place data by Supabase."],
            },
        ],
    },
};

export const TERMS: Record<Locale, Doc> = {
    fr: {
        title: "Conditions d'utilisation",
        updated: "Mise à jour : 27 septembre 2026",
        sections: [
            {
                heading: "Le service",
                body: [
                    "NiceThings est un guide gratuit pour découvrir des lieux à Yaoundé. Les informations viennent de notre équipe, de la communauté et d'OpenStreetMap.",
                ],
            },
            {
                heading: "Des informations à vérifier",
                body: [
                    "Horaires, prix et contacts peuvent changer. Chaque fiche indique sa source et si elle a été vérifiée. En cas de doute, appelle le lieu avant de te déplacer.",
                    "Les durées de trajet sont des estimations : la circulation réelle peut les allonger.",
                ],
            },
            {
                heading: "Tes contributions",
                body: [
                    "En proposant un lieu ou une correction, tu confirmes que c'est exact à ta connaissance. On peut modifier ou refuser une contribution.",
                ],
            },
            {
                heading: "Données cartographiques",
                body: ["Données © contributeurs OpenStreetMap, disponibles sous licence ODbL."],
            },
        ],
    },
    en: {
        title: "Terms of use",
        updated: "Updated: 27 September 2026",
        sections: [
            {
                heading: "The service",
                body: [
                    "NiceThings is a free guide to discovering places in Yaoundé. Information comes from our team, the community and OpenStreetMap.",
                ],
            },
            {
                heading: "Information to double-check",
                body: [
                    "Opening hours, prices and contacts can change. Each listing shows its source and whether it has been checked. When in doubt, call the place before you go.",
                    "Travel times are estimates: real traffic can make trips longer.",
                ],
            },
            {
                heading: "Your contributions",
                body: [
                    "By suggesting a place or a correction, you confirm it is accurate to the best of your knowledge. We may edit or decline contributions.",
                ],
            },
            {
                heading: "Map data",
                body: ["Data © OpenStreetMap contributors, available under the ODbL licence."],
            },
        ],
    },
};
