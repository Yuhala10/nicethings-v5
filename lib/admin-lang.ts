// The team console's language, shared by the server (which renders the page
// in the right language from the start) and the browser (which remembers
// the choice).

export type AdminLang = "fr" | "en";

export const ADMIN_LANG_COOKIE = "nt_admin_lang";

// The saved choice when there is one; otherwise English for a phone or
// computer set to English, French for everyone else.
export function pickAdminLang(saved: string | null | undefined, deviceLanguage: string | null | undefined): AdminLang {
    if (saved === "fr" || saved === "en") return saved;
    return (deviceLanguage ?? "").trim().toLowerCase().startsWith("en") ? "en" : "fr";
}
