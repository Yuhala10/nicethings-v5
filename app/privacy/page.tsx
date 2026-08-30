"use client";

import Link from "next/link";
import AppShell from "../../components/layout/AppShell";
import { useTranslation } from "../../lib/i18n/useTranslation";

export default function PrivacyPage() {
    const t = useTranslation();

    return (
        <AppShell>
            <main className="nt-legal-page">
                <div className="nt-container nt-legal-container">
                    <p className="nt-eyebrow"><span className="nt-eyebrow-dot" /> {t.common.privacy.toUpperCase()}</p>
                    <h1>{t.privacy?.title ?? "Your privacy, clearly explained."}</h1>
                    <p className="nt-legal-lead">{t.privacy?.lead ?? "NiceThings uses information to help you discover places, remember your choices, and improve the service. We keep location use purposeful and under your control."}</p>
                    <div className="nt-legal-grid">
                        <article><span>01</span><h2>{t.privacy?.section1 ?? "Location"}</h2><p>{t.privacy?.section1Body ?? "Your device location is requested when you use location-based features such as Around Me. The browser and your device control the underlying permission."}</p></article>
                        <article><span>02</span><h2>{t.privacy?.section2 ?? "Account & activity"}</h2><p>{t.privacy?.section2Body ?? "NiceThings may store saved places, reviews, arrivals and contributions so those features can work for you."}</p></article>
                        <article><span>03</span><h2>{t.privacy?.section3 ?? "Choices"}</h2><p>{t.privacy?.section3Body ?? "You can manage location permission from your device and revisit your NiceThings preferences from the app."}</p></article>
                        <article><span>04</span><h2>{t.privacy?.section4 ?? "Contact"}</h2><p>{t.privacy?.section4Body ?? "If you have a privacy question or need information about your data, contact the NiceThings team through the contact details provided in the deployed application."}</p></article>
                    </div>
                    <Link className="nt-legal-back" href="/">{t.common.back} to NiceThings</Link>
                </div>
            </main>
        </AppShell>
    );
}
