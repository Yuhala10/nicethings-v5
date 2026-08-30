"use client";

import Link from "next/link";
import BrandMark from "../branding/BrandMark";
import { useTranslation } from "../../lib/i18n/useTranslation";

export default function Footer() {
    const t = useTranslation();

    return (
        <footer className="nt-footer">
            <div className="nt-container nt-footer-inner">
                <div className="nt-footer-brand">
                    <BrandMark size={34} />
                    <div><strong>{t.common.appName}</strong><span>{t.home.tagline}</span></div>
                </div>
                <div className="nt-footer-links">
                    <Link href="/privacy">{t.common.privacy}</Link>
                    <Link href="/terms">{t.common.terms}</Link>
                    <Link href="/nearby">{t.common.nearby}</Link>
                    <Link href="/submit">{t.common.submit}</Link>
                </div>
                <p>{t.home.tagline}</p>
            </div>
        </footer>
    );
}
