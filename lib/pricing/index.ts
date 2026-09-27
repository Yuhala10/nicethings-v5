export const PRICING = {
    mode: "FREE" as const,

    currency: "XAF",

    paymentsEnabled: false,

    accessPassEnabled: false,

    message:
        "NiceThings is free to use.",
};

export function isFreeMode() {
    return true;
}

export function isPaymentsEnabled() {
    return false;
}