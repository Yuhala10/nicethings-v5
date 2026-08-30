"use client";

import { FormEvent, useState } from "react";
import { ArrowRight, Eye, EyeOff, LockKeyhole, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import BrandMark from "../../components/branding/BrandMark";

export default function AdminLoginPage() {
    const router = useRouter();
    const next = "/admin";
    const [pin, setPin] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(event: FormEvent<HTMLFormElement>) {
        event.preventDefault();
        if (loading || !pin.trim()) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });
            const result = await response.json().catch(() => ({}));
            if (!response.ok) throw new Error(result.message || "Unable to sign in.");
            router.replace(next);
            router.refresh();
        } catch (err) {
            setError(err instanceof Error ? err.message : "Unable to sign in.");
            setPin("");
        } finally {
            setLoading(false);
        }
    }

    return (
        <main className="nt-admin-login-page">
            <div className="nt-admin-login-glow" />
            <section className="nt-admin-login-card" aria-labelledby="admin-login-title">
                <div className="nt-admin-login-brand">
                    <BrandMark size={58} />
                    <div><span>NICE THINGS</span><strong>Admin Console</strong></div>
                </div>
                <div className="nt-admin-login-icon"><ShieldCheck size={22} /></div>
                <p className="nt-admin-eyebrow">PRIVATE ACCESS</p>
                <h1 id="admin-login-title">Welcome back.</h1>
                <p className="nt-admin-login-copy">Enter the private admin PIN to manage NiceThings safely.</p>
                <form onSubmit={submit} className="nt-admin-login-form">
                    <label htmlFor="admin-pin">Admin PIN</label>
                    <div className="nt-admin-pin-field">
                        <LockKeyhole size={18} />
                        <input id="admin-pin" value={pin} onChange={(e) => setPin(e.target.value)} type={showPin ? "text" : "password"} inputMode="numeric" autoComplete="current-password" placeholder="Enter your secret PIN" autoFocus />
                        <button type="button" aria-label={showPin ? "Hide PIN" : "Show PIN"} onClick={() => setShowPin((v) => !v)}>{showPin ? <EyeOff size={18} /> : <Eye size={18} />}</button>
                    </div>
                    {error && <div className="nt-admin-login-error" role="alert">{error}</div>}
                    <button className="nt-admin-login-submit" type="submit" disabled={loading || !pin.trim()}>
                        <span>{loading ? "Checking access…" : "Enter Admin"}</span><ArrowRight size={18} />
                    </button>
                </form>
                <p className="nt-admin-login-note">Your PIN is checked on the server and is never exposed to the browser.</p>
            </section>
        </main>
    );
}
