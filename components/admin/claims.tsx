// Small pieces shared by the claim screens of the team console. Labels are
// [French, English] for tr().

export function ScoreBadge({ score, large = false }: { score: number; large?: boolean }) {
    const tone = score >= 60 ? "bg-green-50 text-good" : score >= 35 ? "bg-amber-50 text-warn" : "bg-red-50 text-bad";
    return (
        <span className={`inline-flex items-center justify-center rounded-full font-extrabold tabular-nums ${tone} ${large ? "h-14 min-w-14 px-3 text-2xl" : "h-7 min-w-11 px-2 text-xs"}`}>
            {score}
        </span>
    );
}

export const EVENT_LABELS: Record<string, [string, string]> = {
    started: ["Demande commencée", "Claim started"],
    details_updated: ["Infos modifiées", "Details updated"],
    onsite_checked: ["Test de position", "Location check"],
    phone_code_requested: ["Code demandé au numéro de la fiche", "Code requested to the listing's number"],
    phone_code_failed: ["Code erroné", "Wrong code"],
    phone_verified: ["Numéro confirmé par le code", "Number confirmed by the code"],
    file_added: ["Fichier ajouté", "File added"],
    file_removed: ["Fichier retiré", "File removed"],
    submitted: ["Demande envoyée", "Claim sent"],
    resubmitted: ["Demande renvoyée avec des compléments", "Claim sent again with additions"],
    withdrawn: ["Demande retirée par le demandeur", "Withdrawn by the claimant"],
    code_sent: ["Code envoyé par l'équipe", "Code sent by the team"],
    papers: ["Pièces examinées", "Files reviewed"],
    social: ["Page officielle examinée", "Official page reviewed"],
    field_visit: ["Visite sur place", "Site visit"],
    note: ["Note interne", "Internal note"],
    needs_info: ["Infos demandées au demandeur", "More info requested"],
    approve: ["Validée : accès propriétaire donné", "Approved: owner access granted"],
    approved_with_override: ["Validée en passant outre les règles", "Approved by overriding the rules"],
    reject: ["Refusée", "Declined"],
    revoke: ["Accès propriétaire retiré", "Owner access removed"],
    proofs_purged: ["Fichiers supprimés (30 jours après la décision)", "Files deleted (30 days after the decision)"],
};

export const FILE_LABELS: Record<string, [string, string]> = {
    storefront: ["Devanture avec le code", "Storefront with the code"],
    business: ["Document de l'entreprise", "Business document"],
    id: ["Pièce d'identité", "ID document"],
    other: ["Autre", "Other"],
};
