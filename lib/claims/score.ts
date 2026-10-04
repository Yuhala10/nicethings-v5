import { samePhone } from "./secrets";

// How much we trust a claim, computed from its proofs and from warning
// signs. The team always decides, but approval is only possible with at
// least one strong proof (a code received on the listing's phone, papers
// checked by the team, or a visit in person) and a score of 50 or more.

export type ClaimFile = { kind: "storefront" | "business" | "id" | "other"; path: string; type: string; at: string };

export type ClaimFacts = {
    phone: string;
    user_email: string | null;
    listing_phone: string | null;
    phone_verified_at: string | null;
    onsite_distance_m: number | null;
    onsite_accuracy: number | null;
    documents: ClaimFile[];
    documents_checked_at: string | null;
    social_url: string | null;
    social_verified_at: string | null;
    field_visit_at: string | null;
};

export type ClaimContext = {
    placeWebsite: string | null;
    placeSource: string | null; // where the listing came from (field, osm, submission)
    otherOwners: number; // people already managing this place
    recentClaims: number; // claims by this account in the last 30 days
    sharedDevice: number; // other accounts seen on the same connection + browser
    rejectedBefore: boolean; // this account was already refused for this place
};

export type Check = { key: string; label: string; en: string; points: number; strong?: boolean };

export type Assessment = { score: number; checks: Check[]; flags: Check[]; strongProof: boolean; canApprove: boolean; blocker: string | null; blockerEn: string | null };

function domain(value: string | null) {
    if (!value) return null;
    try {
        return new URL(value.startsWith("http") ? value : `https://${value}`).hostname.replace(/^www\./, "").toLowerCase();
    } catch {
        return null;
    }
}

const FREE_MAIL = /^(gmail|yahoo|hotmail|outlook|live|icloud|aol|proton(mail)?|yandex|gmx)\./;

export function assess(claim: ClaimFacts, context: ClaimContext): Assessment {
    const checks: Check[] = [];
    const flags: Check[] = [];

    if (claim.field_visit_at) checks.push({ key: "field", label: "Visite de l'équipe sur place", en: "Team visit on site", points: 60, strong: true });
    if (claim.phone_verified_at) checks.push({ key: "phone", label: "Code reçu sur le numéro de la fiche", en: "Code received on the listing's number", points: 45, strong: true });
    if (claim.documents_checked_at) checks.push({ key: "papers", label: "Pièces vérifiées par l'équipe", en: "Files checked by the team", points: 35, strong: true });
    else if (claim.documents.some((file) => file.kind === "business" || file.kind === "id")) checks.push({ key: "papers-sent", label: "Documents envoyés (à vérifier)", en: "Documents sent (to check)", points: 5 });
    if (claim.social_verified_at) checks.push({ key: "social", label: "Code vu sur la page officielle", en: "Code seen on the official page", points: 20 });
    if (claim.documents.some((file) => file.kind === "storefront")) checks.push({ key: "storefront", label: "Photo de la devanture avec le code", en: "Storefront photo with the code", points: 10 });

    if (claim.onsite_distance_m !== null && (claim.onsite_accuracy ?? 999) <= 50) {
        if (claim.onsite_distance_m <= 50) checks.push({ key: "onsite", label: "Sur place lors de la demande", en: "On site when claiming", points: 10 });
        else if (claim.onsite_distance_m <= 150) checks.push({ key: "onsite", label: "Tout près du lieu lors de la demande", en: "Very close when claiming", points: 5 });
    }
    if (claim.listing_phone && samePhone(claim.phone, claim.listing_phone)) checks.push({ key: "same-phone", label: "Son numéro est celui de la fiche", en: "Their number is the listing's number", points: 10 });

    const mailDomain = claim.user_email?.split("@")[1]?.toLowerCase() ?? null;
    const siteDomain = domain(context.placeWebsite);
    if (mailDomain && siteDomain && !FREE_MAIL.test(mailDomain) && (mailDomain === siteDomain || mailDomain.endsWith(`.${siteDomain}`))) {
        checks.push({ key: "mail-domain", label: "E-mail au nom de domaine du site officiel", en: "Email on the official website's domain", points: 10 });
    }

    if (context.otherOwners > 0) flags.push({ key: "owned", label: "Déjà géré par un autre compte : visite terrain obligatoire", en: "Already managed by another account: site visit required", points: -30 });
    if (context.recentClaims >= 3) flags.push({ key: "many", label: `Ce compte a revendiqué ${context.recentClaims} lieux en 30 jours`, en: `This account claimed ${context.recentClaims} places in 30 days`, points: -20 });
    if (context.sharedDevice > 0) flags.push({ key: "device", label: `Même appareil et connexion que ${context.sharedDevice} autre(s) compte(s)`, en: `Same device and connection as ${context.sharedDevice} other account(s)`, points: -25 });
    if (claim.onsite_distance_m !== null && claim.onsite_distance_m > 5000) {
        flags.push({ key: "far", label: `À ${Math.round(claim.onsite_distance_m / 1000)} km du lieu lors du test de position`, en: `${Math.round(claim.onsite_distance_m / 1000)} km from the place during the location check`, points: -15 });
    }
    if (context.placeSource === "submission" && claim.listing_phone) flags.push({ key: "phone-origin", label: "Le numéro de la fiche a été proposé par un visiteur : prudence", en: "The listing's number was suggested by a visitor: be careful", points: -10 });
    if (context.rejectedBefore) flags.push({ key: "rejected", label: "Déjà refusé pour ce lieu", en: "Already declined for this place", points: -15 });

    const score = Math.max(0, Math.min(100, [...checks, ...flags].reduce((sum, item) => sum + item.points, 0)));
    const strongProof = checks.some((check) => check.strong);
    const reason = !strongProof ? "strong" : context.otherOwners > 0 && !claim.field_visit_at ? "owned" : score < 50 ? "score" : null;
    const BLOCKERS = {
        strong: [
            "Il faut au moins une preuve forte : code reçu sur le numéro de la fiche, pièces vérifiées ou visite sur place.",
            "At least one strong proof is needed: code received on the listing's number, files checked, or a site visit.",
        ],
        owned: ["Le lieu a déjà un propriétaire : une visite sur place est obligatoire.", "The place already has an owner: a site visit is required."],
        score: ["Score de confiance insuffisant (50 minimum).", "Trust score too low (50 minimum)."],
    } as const;

    return {
        score,
        checks,
        flags,
        strongProof,
        canApprove: reason === null,
        blocker: reason ? BLOCKERS[reason][0] : null,
        blockerEn: reason ? BLOCKERS[reason][1] : null,
    };
}
