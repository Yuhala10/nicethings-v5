// "Mode retour au pays": a visitor who is back home for a while can keep the
// page made for them one tap away on the home screen. The choice lives in
// their own browser, nowhere else. It is switched on from the "De retour au
// pays" page, or by arriving through the arrivals poster ("?ref=aeroport").

const KEY = "nt_return_mode";
const CHANGED = "nt:return-mode";

export function returnModeOn() {
    try {
        return localStorage.getItem(KEY) === "1";
    } catch {
        return false; // no storage: the mode simply does not stick
    }
}

export function setReturnMode(on: boolean) {
    try {
        if (on) localStorage.setItem(KEY, "1");
        else localStorage.removeItem(KEY);
    } catch {
        // Not kept: nothing else depends on it.
    }
    window.dispatchEvent(new Event(CHANGED));
}

// Calls `listener` whenever the mode is switched, on this page or another tab.
export function watchReturnMode(listener: () => void) {
    window.addEventListener(CHANGED, listener);
    window.addEventListener("storage", listener);
    return () => {
        window.removeEventListener(CHANGED, listener);
        window.removeEventListener("storage", listener);
    };
}

// Arrived from the arrivals poster.
export function cameFromArrivals() {
    return new URLSearchParams(window.location.search).get("ref") === "aeroport";
}
