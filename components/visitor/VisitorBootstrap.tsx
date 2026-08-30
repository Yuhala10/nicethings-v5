"use client";

import { useEffect } from "react";
import { getSupabaseBrowserClient } from "../../lib/supabase/client";
import { getInitialLanguage } from "../../lib/i18n";
import { getStoredConsent } from "../../lib/consent";

const VISITOR_KEY = "nt_visitor_id";
const CONSENT_EVENT = "nicethings:consent";

function getOrCreateVisitorId() {
    const existing = window.localStorage.getItem(VISITOR_KEY);
    if (existing) return existing;
    const id = crypto.randomUUID();
    window.localStorage.setItem(VISITOR_KEY, id);
    return id;
}

async function ensureVisitor() {
    if (!getStoredConsent().privacy) return;

    const id = getOrCreateVisitorId();

    try {
        const supabase = getSupabaseBrowserClient();

        const {
            data: { user },
            error: userError,
        } = await supabase.auth.getUser();

        if (userError || !user) {
            return;
        }

        const { error } = await supabase
            .from("nt_visitors")
            .upsert(
                {
                    id: user.id,
                    preferred_language: getInitialLanguage(),
                },
                { onConflict: "id" }
            );

        if (error) {
            if (error.code !== "42501") {
                console.warn("NiceThings visitor bootstrap:", error);
            }
            return;
        }
    } catch (error) {
        console.warn("NiceThings visitor bootstrap failed:", error);
    }
}

export default function VisitorBootstrap() {
    useEffect(() => {
        void ensureVisitor();
        const handleConsent = () => void ensureVisitor();
        window.addEventListener(CONSENT_EVENT, handleConsent);
        return () => window.removeEventListener(CONSENT_EVENT, handleConsent);
    }, []);

    return null;
}
