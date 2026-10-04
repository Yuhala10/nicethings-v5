"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import { AdminLangProvider, LangSwitch, useTr } from "@/components/admin/i18n";
import styles from "./login.module.css";

// Team sign-in: one PIN, checked on the server (never in the browser),
// with a brute-force guard. Returns to the admin page you were heading to.
function Login() {
    const tr = useTr();
    const router = useRouter();
    const params = useSearchParams();
    const requested = params.get("next") ?? "";
    const next = /^\/admin(\/[a-z0-9/_-]*)?(\?.*)?$/i.test(requested) ? requested : "/admin";

    const [pin, setPin] = useState("");
    const [showPin, setShowPin] = useState(false);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);

    async function submit(event: FormEvent) {
        event.preventDefault();
        if (!pin.trim() || loading) return;
        setLoading(true);
        setError(null);
        try {
            const response = await fetch("/api/admin/login", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ pin }),
            });
            const body = await response.json().catch(() => null);
            if (response.status === 401) throw new Error(tr("Code PIN incorrect.", "Wrong PIN."));
            if (response.status === 429) throw new Error(tr("Trop d'essais. Réessaie dans 15 minutes.", "Too many attempts. Try again in 15 minutes."));
            if (!response.ok || !body?.ok) throw new Error(body?.message ?? tr("Connexion impossible. Réessaie.", "Couldn't sign in. Try again."));
            router.replace(next);
            router.refresh();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : tr("Connexion impossible. Réessaie.", "Couldn't sign in. Try again."));
            setLoading(false);
        }
    }

    return (
        <main className={styles.page}>
            <div style={{ width: "100%", maxWidth: 400 }}>
                <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: 12 }}>
                    <LangSwitch />
                </div>
                <form className={styles.card} onSubmit={submit}>
                    <div className={styles.brand}>
                        <span className={styles.mark}>
                            <ShieldCheck size={24} />
                        </span>
                        <span>
                            <span className={styles.brandName}>NiceThings</span>
                            <span className={styles.brandSub} style={{ display: "block" }}>
                                {tr("Espace équipe", "Team console")}
                            </span>
                        </span>
                    </div>

                    <h1 className={styles.title}>{tr("Connexion", "Sign in")}</h1>
                    <p className={styles.lead}>{tr("Entre le code PIN de l'équipe pour gérer les lieux, les photos et les signalements.", "Enter the team PIN to manage places, photos and reports.")}</p>

                    <label className={styles.label} htmlFor="admin-pin">
                        {tr("Code PIN", "PIN")}
                    </label>
                    <div className={styles.field}>
                        <KeyRound size={19} className={styles.fieldIcon} />
                        <input
                            id="admin-pin"
                            className={styles.input}
                            type={showPin ? "text" : "password"}
                            inputMode="numeric"
                            autoComplete="current-password"
                            autoFocus
                            value={pin}
                            onChange={(event) => setPin(event.target.value)}
                            placeholder="••••••"
                            aria-invalid={Boolean(error)}
                        />
                        <button type="button" className={styles.eye} onClick={() => setShowPin(!showPin)} aria-label={showPin ? tr("Masquer le code", "Hide PIN") : tr("Afficher le code", "Show PIN")}>
                            {showPin ? <EyeOff size={19} /> : <Eye size={19} />}
                        </button>
                    </div>

                    {error && (
                        <p className={styles.error} role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" className={styles.submit} disabled={!pin.trim() || loading}>
                        {loading ? tr("Vérification…", "Checking…") : tr("Entrer", "Enter")}
                        {!loading && <ArrowRight size={19} />}
                    </button>

                    <p className={styles.foot}>{tr("Le code est vérifié sur le serveur, jamais dans le navigateur.", "The PIN is checked on the server, never in the browser.")}</p>
                </form>
                <Link href="/" className={styles.back}>
                    ← {tr("Retour au site", "Back to the site")}
                </Link>
            </div>
        </main>
    );
}

export default function AdminLoginPage() {
    return (
        <AdminLangProvider>
            <Suspense>
                <Login />
            </Suspense>
        </AdminLangProvider>
    );
}
