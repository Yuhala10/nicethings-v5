// The console's server messages in both languages. The server answers in
// whichever language a route was written in; the console shows them in the
// language picked by the team member. Unknown messages are shown as sent.

const PAIRS: [string, string][] = [
    ["Action inconnue.", "Unknown action."],
    ["Session équipe requise.", "Admin session required."],
    ["Le code PIN n'est pas configuré sur le serveur.", "Admin PIN is not configured on the server."],
    ["Ajoute une photo de couverture avant de publier.", "Add a cover photo before publishing."],
    ["Article introuvable.", "Article not found."],
    ["Ce fichier n'est pas une image lisible.", "This file isn't a readable image."],
    ["Demande introuvable ou déjà traitée.", "Request not found or already handled."],
    ["Demande introuvable.", "Claim not found."],
    ["Envoi invalide.", "Invalid upload."],
    ["Code PIN incorrect.", "Incorrect admin PIN."],
    ["Indique la raison du refus (elle sera montrée au demandeur).", "Give the reason for declining (the claimant will see it)."],
    ["Indique pourquoi l'accès est retiré.", "Say why access is being removed."],
    ["Introuvable.", "Not found."],
    ["Requête invalide.", "Invalid request."],
    ["Statut invalide.", "Invalid status."],
    ["L'article est encore trop court pour être publié.", "The article is still too short to publish."],
    ["Rien à modifier.", "Nothing to update."],
    ["Photo trop lourde (6 Mo max).", "Photo too large (6 MB max)."],
    ["Photo trop lourde (8 Mo max).", "Photo too large (8 MB max)."],
    ["Seule une demande envoyée peut être validée.", "Only a sent claim can be approved."],
    ["Trop d'essais. Réessaie dans 15 minutes.", "Too many attempts. Try again in 15 minutes."],
    ["Ressource inconnue.", "Unknown resource."],
    ["Utilise une photo JPEG, PNG ou WebP.", "Use a JPEG, PNG or WebP photo."],
    ["Écris ce qu'il manque au demandeur.", "Write what the claimant is missing."],
    ["Le nom est obligatoire.", "The name is required."],
    ["La base de données n'a pas répondu. Réessaie.", "The database request failed. Please try again."],
    [
        "Il faut au moins une preuve forte : code reçu sur le numéro de la fiche, pièces vérifiées ou visite sur place.",
        "At least one strong proof is needed: code received on the listing's number, files checked, or a site visit.",
    ],
    ["Le lieu a déjà un propriétaire : une visite sur place est obligatoire.", "The place already has an owner: a site visit is required."],
    ["Score de confiance insuffisant (50 minimum).", "Trust score too low (50 minimum)."],
    ["Conditions non remplies.", "Conditions not met."],
];

const LOOKUP = new Map<string, [string, string]>();
for (const pair of PAIRS) {
    LOOKUP.set(pair[0], pair);
    LOOKUP.set(pair[1], pair);
}

export function translateAdminMessage(message: string, lang: "fr" | "en") {
    const pair = LOOKUP.get(message.trim());
    return pair ? pair[lang === "en" ? 1 : 0] : message;
}
