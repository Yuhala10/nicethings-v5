"use client";

import Link from "next/link";
import AppShell from "../../components/layout/AppShell";
import { useTranslation } from "../../lib/i18n/useTranslation";

export default function TermsPage() {
    const t = useTranslation();

    return (
        <AppShell>
            <main className="nt-legal-page">
                <div className="nt-container nt-legal-container">
                    <p className="nt-eyebrow"><span className="nt-eyebrow-dot" /> {t.common.terms.toUpperCase()}</p>
                    <h1>{t.terms?.title ?? "Simple rules for a better discovery community."}</h1>
                    <p className="nt-legal-lead">{t.terms?.lead ?? "Use NiceThings to discover and share places responsibly. Information contributed by the community should be accurate, respectful and useful."}</p>
                    <div className="nt-legal-grid">
                        <article><span>01</span><h2>{t.terms?.section1 ?? "Accurate contributions"}</h2><p>{t.terms?.section1Body ?? "Only submit information you reasonably believe is accurate. Do not deliberately publish misleading or harmful information."}</p></article>
                        <article><span>02</span><h2>{t.terms?.section2 ?? "Respectful reviews"}</h2><p>{t.terms?.section2Body ?? "Reviews should describe genuine experiences and avoid harassment, personal information or abusive content."}</p></article>
                        <article><span>03</span><h2>{t.terms?.section3 ?? "Place information"}</h2><p>{t.terms?.section3Body ?? "Opening hours, prices and locations can change. NiceThings may review, update or remove information when necessary."}</p></article>
                        <article><span>04</span><h2>{t.terms?.section4 ?? "Moderation"}</h2><p>{t.terms?.section4Body ?? "NiceThings may moderate submissions, reports and reviews to protect the quality and safety of the directory."}</p></article>
                    </div>
                    <Link className="nt-legal-back" href="/">{t.common.back} to NiceThings</Link>
                </div>
            </main>
        </AppShell>
    );
}
