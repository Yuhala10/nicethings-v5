import type { Locale } from "./i18n/config";

// Plain-language legal pages. They describe what the app actually does;
// update them whenever data handling changes.

type Doc = { title: string; updated: string; sections: { heading: string; body: string[] }[] };

export const PRIVACY: Record<Locale, Doc> = {
    fr: {
        title: "Confidentialité",
        updated: "Mise à jour : 19 octobre 2026",
        sections: [
            {
                heading: "En bref",
                body: [
                    "NiceThings s'utilise sans compte ; un profil est facultatif. On ne vend aucune donnée et il n'y a pas de publicité ciblée.",
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
                heading: "Ton profil (facultatif)",
                body: [
                    "Si tu crées un profil, on garde ton @nom, le prénom et les mots que tu choisis d'afficher, ta ville et ton quartier, ton avatar ou ta photo, et tes trois lieux préférés. Tout cela est public sur ta page.",
                    "Ton code PIN et ton code de secours ne sont jamais gardés tels quels : seulement une empreinte chiffrée, impossible à relire. Chaque téléphone connecté reçoit un cookie dont on garde l'empreinte, avec le type d'appareil et la date de dernière visite. Pour bloquer ceux qui essaient des PIN au hasard, chaque essai est noté avec une empreinte chiffrée de ta connexion (pas ton adresse IP), effacée après deux jours.",
                    "Ta photo est redessinée par nos serveurs en 400 × 400 pixels, ce qui efface les informations cachées dans le fichier, comme l'endroit où elle a été prise.",
                    "Tes avis, commentaires, j'aime et « validé » sont publiés avec ton @nom et ta tête. Tes favoris sont gardés avec ton profil pour te suivre d'un téléphone à l'autre.",
                    "Depuis « Moi », tu modifies tout, tu te déconnectes de tous tes téléphones, et tu peux supprimer ton profil : il disparaît avec tes avis, commentaires et j'aime ; les photos des murs restent, sans ton nom.",
                    "Si tu demandes le badge vérifié, on garde ce que tu nous envoies (qui tu es, le lien, ton mot) pour l'examiner. Le badge et ce qu'il dit de toi (« Créateur de contenu »…) sont publics sur ton profil.",
                    "Tes sorties (photos ou vidéo, le lieu, l'ambiance, le prix, ton mot) sont publiées avec ton @nom ; celles d'un nouveau membre sont d'abord vues par l'équipe. Qui tu suis et qui te suit se voit en nombre sur ton profil. Supprimer une sortie efface aussi ses fichiers.",
                    "Les chemins que tu écris (« Dis au taxi », le chemin en mots) et les nouvelles en direct que tu donnes (ouvert, ça bouge, coupure…) sont publiés avec ton @nom ; une nouvelle en direct s'efface de la fiche après quelques heures. Ton activité (qui a validé, répondu, aimé) n'est visible que par toi. Si tu actives ses notifications, on garde ce que ton navigateur remet pour t'écrire, rattaché à ton profil, jusqu'à ce que tu les coupes.",
                ],
            },
            {
                heading: "Mesure d'audience",
                body: [
                    "Pour savoir combien de personnes utilisent NiceThings et lesquelles reviennent, on compte les pages vues : la page, la ville, la langue, le type d'appareil (téléphone ou ordinateur) et le site d'où tu arrives.",
                    "Ton navigateur garde un identifiant tiré au hasard, qui sert seulement à reconnaître un retour. Il ne contient ni ton nom, ni ton numéro, ni ta position, et ton adresse IP n'est pas enregistrée dans ces statistiques. Effacer les données du site le remet à zéro, et le réglage « Ne pas me pister » de ton navigateur arrête ce comptage.",
                    "Quand le guidage t'amène devant un lieu et que tu confirmes qu'il est bien là, on enregistre seulement ce fait : le lieu, le moment et l'identifiant tiré au hasard de ton navigateur. Ta position sert à vérifier que tu es sur place, puis n'est pas gardée. Une seule exception : si tu as dû chercher le lieu, ou si son point sur la carte n'était qu'approximatif, on garde l'endroit où tu l'as trouvé, pour corriger la carte. Cet endroit est noté pour le lieu, sans ton identifiant.",
                    "Si tu actives les alertes météo, on garde ce que ton navigateur nous remet pour pouvoir t'envoyer une notification (une adresse chez le service de notifications de ton téléphone et deux clés), ta ville et ta langue. Ni ton identifiant, ni ta position. Tu les arrêtes d'un geste au même endroit, et cette adresse est alors effacée.",
                    "Quand tu ajoutes une photo ou une vidéo à un lieu, on garde le fichier, le mot que tu y joins et l'identifiant tiré au hasard de ton navigateur. Elle n'est publiée qu'après vérification par l'équipe, et tu peux nous demander de la retirer. Un cœur sur une publication est enregistré avec ton profil.",
                    "Les commentaires sous les articles, les photos et les avis se font avec un profil (voir plus haut). Un commentaire qui contient un lien ou un numéro est lu par l'équipe avant d'apparaître.",
                    "Quand tu demandes une invitation, on garde ce que tu écris dans le formulaire (ton nom, ton compte, ta ville, ce que tu aimes) pour te répondre : rien n'en est publié. Un invité choisit lui-même ce qui va sur sa page (sa photo, son compte, sa phrase) et peut demander qu'elle soit corrigée ou retirée. Un coup de cœur garde seulement l'identifiant anonyme de ton navigateur.",
                    "Quand tu touches « Appeler » ou « WhatsApp » sur la fiche d'un lieu, on compte ce geste (le lieu, le moment, et l'identifiant tiré au hasard de ton navigateur ou ton profil) pour montrer au propriétaire combien de clients NiceThings lui envoie. Il ne voit qu'un nombre, jamais qui. Le message pré-écrit (« Je vous ai trouvé sur NiceThings ») part de ton WhatsApp, et tu peux le changer avant de l'envoyer.",
                    "Quand tu crées ou ouvres un vote « On se voit où ? », on garde les lieux proposés, le choix de chacun, le prénom si tu en donnes un, et ce même identifiant. Ceux qui ont le lien du vote voient les choix et les prénoms.",
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
        updated: "Updated: 19 October 2026",
        sections: [
            {
                heading: "In short",
                body: ["NiceThings works without an account; a profile is optional. We don't sell any data and there is no targeted advertising."],
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
                heading: "Your profile (optional)",
                body: [
                    "If you create a profile, we keep your @name, the first name and words you choose to show, your city and neighbourhood, your avatar or photo, and your three favourite places. All of it is public on your page.",
                    "Your PIN and rescue code are never kept as they are: only an encrypted fingerprint that cannot be read back. Each signed-in phone gets a cookie whose fingerprint we keep, with the kind of device and the date of the last visit. To stop people trying PINs at random, each try is noted with an encrypted fingerprint of your connection (not your IP address), erased after two days.",
                    "Your photo is redrawn by our servers at 400 × 400 pixels, which erases what a file can hide, such as where it was taken.",
                    "Your reviews, comments, likes and “validated” are published with your @name and face. Your saved places are kept with your profile so they follow you from one phone to another.",
                    "From “Me”, you change everything, sign out of all your phones, and can delete your profile: it disappears with your reviews, comments and likes; photos on walls stay, without your name.",
                    "If you request the verified badge, we keep what you send us (who you are, the link, your words) to review it. The badge and what it says about you (“Content creator”…) are public on your profile.",
                    "Your outings (photos or video, the place, the vibe, the price, your words) are published with your @name; a new member's are first seen by the team. Who you follow and who follows you show as numbers on your profile. Deleting an outing also erases its files.",
                    "The ways you write (“Tell the taxi”, the way in words) and the live news you give (open, lively, power cut…) are published with your @name; a live news leaves the page after a few hours. Your activity (who validated, replied, liked) is visible to you alone. If you turn on its notifications, we keep what your browser hands us to write to you, tied to your profile, until you turn them off.",
                ],
            },
            {
                heading: "Audience measurement",
                body: [
                    "To know how many people use NiceThings and how many come back, we count page views: the page, the city, the language, the type of device (phone or computer) and the site you arrive from.",
                    "Your browser keeps a random identifier, used only to recognise a return visit. It holds no name, phone number or position, and your IP address is not stored in these statistics. Clearing the site's data resets it, and your browser's “Do Not Track” setting stops this counting.",
                    "When the guidance brings you to a place and you confirm it is really there, we record only that fact: the place, the time and your browser's random identifier. Your position is used to check that you are on the spot, then it is not kept. One exception: if you had to look for the place, or if its point on the map was only approximate, we keep the spot where you found it, to correct the map. That spot is noted for the place, without your identifier.",
                    "If you switch on weather alerts, we keep what your browser hands us so that we can send you a notification (an address at your phone's notification service and two keys), your city and your language. Neither your identifier nor your position. You stop them with one tap in the same place, and that address is then erased.",
                    "When you add a photo or a video to a place, we keep the file, the words you add and your browser's random identifier. It is published only after the team has checked it, and you can ask us to take it down. A heart on a post is recorded with your profile.",
                    "Comments under articles, photos and reviews are made with a profile (see above). A comment containing a link or a phone number is read by the team before it shows.",
                    "When you ask for an invitation, we keep what you write in the form (your name, your account, your city, what you love) to answer you: none of it is published. A guest chooses what goes on their page (their photo, their account, their sentence) and can ask for it to be corrected or taken down. A heart only keeps your browser's anonymous identifier.",
                    "When you tap “Call” or “WhatsApp” on a place's page, we count that tap (the place, the time, and your browser's random identifier or your profile) to show its owner how many customers NiceThings sends them. They see a number, never who. The pre-written message (“I found you on NiceThings”) leaves from your WhatsApp, and you can change it before sending.",
                    "When you create or open a “Where shall we meet?” vote, we keep the places proposed, each person’s choice, the first name if you give one, and that same identifier. Those who have the link to the vote see the choices and the first names.",
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
        updated: "Mise à jour : 19 octobre 2026",
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
                    "Ce que tu publies avec ton profil (avis, commentaires, photos) doit venir de ce que tu as vécu, sans insultes, sans données personnelles d'autrui et sans publicité. Pas de faux avis, ni pour un lieu ni contre lui. L'équipe peut masquer ou supprimer un message, et suspendre un profil qui ne respecte pas ces règles.",
                    "Ton @nom ne doit pas se faire passer pour quelqu'un d'autre, une marque ou NiceThings.",
                ],
            },
            {
                heading: "Données cartographiques",
                body: [
                    "Données © contributeurs OpenStreetMap (licence ODbL), Overture Maps Foundation (licence CDLA Permissive 2.0) et Foursquare Open Source Places (licence Apache 2.0).",
                    "Voix du guidage : enregistrée avec Piper. Voix française « siwis » (jeu de données SIWIS, université d'Édimbourg, licence CC BY 4.0) ; voix anglaise « cori » (enregistrements LibriVox, domaine public).",
                ],
            },
        ],
    },
    en: {
        title: "Terms of use",
        updated: "Updated: 19 October 2026",
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
                    "What you publish with your profile (reviews, comments, photos) must come from what you lived, with no insults, no one else's personal data and no advertising. No fake reviews, for a place or against it. The team may hide or delete a message, and suspend a profile that breaks these rules.",
                    "Your @name must not pass itself off as someone else, a brand or NiceThings.",
                ],
            },
            {
                heading: "Map data",
                body: [
                    "Data © OpenStreetMap contributors (ODbL licence), Overture Maps Foundation (CDLA Permissive 2.0) and Foursquare Open Source Places (Apache 2.0).",
                    "Guidance voice: recorded with Piper. French voice “siwis” (SIWIS dataset, University of Edinburgh, CC BY 4.0 licence); English voice “cori” (LibriVox recordings, public domain).",
                ],
            },
        ],
    },
};
