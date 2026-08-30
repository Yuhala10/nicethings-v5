export type ConsentState = {
    privacy: boolean;
    cookies: boolean;
    location: boolean;
};

const STORAGE_KEY =
    "nicethings-consent";

const DEFAULT_CONSENT: ConsentState = {
    privacy: false,
    cookies: false,
    location: false,
};

export function getStoredConsent(): ConsentState {
    if (
        typeof window === "undefined"
    ) {
        return DEFAULT_CONSENT;
    }

    try {
        const stored =
            window.localStorage.getItem(
                STORAGE_KEY
            );

        if (!stored) {
            return DEFAULT_CONSENT;
        }

        const parsed =
            JSON.parse(stored);

        return {
            privacy:
                parsed?.privacy === true,

            cookies:
                parsed?.cookies === true,

            location:
                parsed?.location === true,
        };
    } catch {
        return DEFAULT_CONSENT;
    }
}

export function saveConsent(
    consent: ConsentState
) {
    if (
        typeof window === "undefined"
    ) {
        return;
    }

    window.localStorage.setItem(
        STORAGE_KEY,
        JSON.stringify(consent)
    );
}

export function acceptAllConsent() {
    saveConsent({
        privacy: true,
        cookies: true,
        location: true,
    });
}

export function grantLocationConsent() {
    const current =
        getStoredConsent();

    saveConsent({
        ...current,
        location: true,
    });
}

export function hasLocationConsent() {
    return getStoredConsent()
        .location;
}