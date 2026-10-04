// Labels used across the team console, as [French, English] for tr().
export const REPORT_REASONS: Record<string, [string, string]> = {
    closed: ["Fermé définitivement", "Closed for good"],
    price: ["Prix changés", "Prices changed"],
    hours: ["Horaires faux", "Wrong hours"],
    location: ["Mauvaise position", "Wrong location"],
    other: ["Autre", "Other"],
};

export const SOURCE_LABELS: Record<string, [string, string]> = {
    osm: ["OpenStreetMap", "OpenStreetMap"],
    field: ["Équipe", "Team"],
    submission: ["Proposition", "Suggestion"],
    overture: ["Overture Maps", "Overture Maps"],
    foursquare: ["Foursquare", "Foursquare"],
};
