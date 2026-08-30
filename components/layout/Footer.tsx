import Link from "next/link";
import BrandMark from "../branding/BrandMark";

export default function Footer() {
    return (
        <footer className="nt-footer">
            <div className="nt-container nt-footer-inner">
                <div className="nt-footer-brand">
                    <BrandMark size={34} />
                    <div><strong>NiceThings</strong><span>Discover something nice.</span></div>
                </div>
                <div className="nt-footer-links">
                    <Link href="/privacy">Privacy</Link>
                    <Link href="/terms">Terms</Link>
                    <Link href="/nearby">Around me</Link>
                    <Link href="/submit">Suggest a place</Link>
                </div>
                <p>Made for discovering Cameroon, one nice place at a time.</p>
            </div>
        </footer>
    );
}
