import type { Locale } from "./i18n/config";

// Plain-language legal pages. They describe what the app actually does;
// update them whenever data handling changes.

type Doc = { title: string; updated: string; sections: { heading: string; body: string[] }[] };

export const PRIVACY: Record<Locale, Doc> = {
    fr: {
        title: "Confidentialité",
        updated: "Mise à jour : 4 octobre 2026",
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
                    "Pour calculer un itinéraire et te guider, ta position et la destination sont envoyées au service d'itinéraires OSRM d'OpenStreetMap (serveurs FOSSGIS). Pendant le guidage, ta position est suivie dans ton navigateur ; les consignes vocales sont lues par ton téléphone. Les fonds de carte viennent d'OpenFreeMap, qui reçoit ton adresse IP comme tout site web.",
                ],
            },
            {
                heading: "Ce que tu nous envoies",
                body: [
                    "Quand tu proposes un lieu ou signales une erreur, on enregistre ce que tu écris (et ta position si tu l'ajoutes) pour vérifier et mettre à jour la fiche. N'y mets pas d'informations personnelles.",
                    "Les mots tapés dans la recherche sont enregistrés de façon anonyme (sans lien avec toi ni ta position) pour savoir quels lieux ajouter.",
                ],
            },
            {
                heading: "Mesure d'audience",
                body: [
                    "Pour savoir combien de personnes utilisent NiceThings et lesquelles reviennent, on compte les pages vues : la page, la ville, la langue, le type d'appareil (téléphone ou ordinateur) et le site d'où tu arrives.",
                    "Ton navigateur garde un identifiant tiré au hasard, qui sert seulement à reconnaître un retour. Il ne contient ni ton nom, ni ton numéro, ni ta position, et ton adresse IP n'est pas enregistrée dans ces statistiques. Effacer les données du site le remet à zéro, et le réglage « Ne pas me pister » de ton navigateur arrête ce comptage.",
                ],
            },
            {
                heading: "Espace pro (propriétaires)",
                body: [
                    "Pour revendiquer un établissement, tu te connectes avec ton compte Google : on reçoit ton nom, ton adresse e-mail et ta photo de profil, rien d'autre. On enregistre aussi ce que tu nous donnes pour la demande (nom, numéro, lien de ta page) et l'historique des étapes.",
                    "Les preuves envoyées (photos, documents de l'entreprise, pièce d'identité) sont stockées dans un espace privé que seule l'équipe NiceThings peut ouvrir, avec des liens valables une minute. Elles sont supprimées 30 jours après la décision. Pour repérer les fraudes, on garde une empreinte chiffrée (non réversible) de ta connexion, pas ton adresse IP.",
                    "Chaque modification faite sur une fiche est enregistrée avec son auteur, pour pouvoir l'annuler en cas d'abus.",
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
        updated: "Updated: 4 October 2026",
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
                    "To calculate directions and guide you, your position and the destination are sent to OpenStreetMap's OSRM routing service (FOSSGIS servers). During guidance your position is followed in your browser; spoken instructions are read by your phone. Map tiles come from OpenFreeMap, which sees your IP address like any website.",
                ],
            },
            {
                heading: "What you send us",
                body: [
                    "When you suggest a place or report an error, we store what you write (and your position if you add it) to check and update the listing. Please don't include personal information.",
                    "Words typed in search are stored anonymously (not linked to you or your position) so we know which places to add.",
                ],
            },
            {
                heading: "Audience measurement",
                body: [
                    "To know how many people use NiceThings and how many come back, we count page views: the page, the city, the language, the type of device (phone or computer) and the site you arrive from.",
                    "Your browser keeps a random identifier, used only to recognise a return visit. It holds no name, phone number or position, and your IP address is not stored in these statistics. Clearing the site's data resets it, and your browser's “Do Not Track” setting stops this counting.",
                ],
            },
            {
                heading: "Business space (owners)",
                body: [
                    "To claim a business, you sign in with your Google account: we receive your name, email address and profile picture, nothing else. We also store what you give us for the claim (name, number, link to your page) and the history of its steps.",
                    "Proof you send (photos, business documents, ID) is kept in a private space only the NiceThings team can open, through links that last one minute. It is deleted 30 days after the decision. To spot fraud we keep an encrypted, irreversible fingerprint of your connection, not your IP address.",
                    "Every change made to a listing is recorded with its author, so it can be undone in case of abuse.",
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
        updated: "Mise à jour : 28 septembre 2026",
        sections: [
            {
                heading: "Le service",
                body: [
                    "NiceThings est un guide gratuit pour découvrir des lieux dans les villes du Cameroun. Les informations viennent de notre équipe, de la communauté et d'OpenStreetMap.",
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
                body: ["Données © contributeurs OpenStreetMap (licence ODbL), Overture Maps Foundation (licence CDLA Permissive 2.0) et Foursquare Open Source Places (licence Apache 2.0)."],
            },
        ],
    },
    en: {
        title: "Terms of use",
        updated: "Updated: 28 September 2026",
        sections: [
            {
                heading: "The service",
                body: [
                    "NiceThings is a free guide to discovering places in Cameroon's cities. Information comes from our team, the community and OpenStreetMap.",
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
                body: ["Data © OpenStreetMap contributors (ODbL licence), Overture Maps Foundation (CDLA Permissive 2.0) and Foursquare Open Source Places (Apache 2.0)."],
            },
        ],
    },
};
