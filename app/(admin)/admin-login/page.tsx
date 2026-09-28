"use client";

import { Suspense, useState, type FormEvent } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { ArrowRight, Eye, EyeOff, KeyRound, ShieldCheck } from "lucide-react";
import styles from "./login.module.css";

// Team sign-in: one PIN, checked on the server (never in the browser),
// with a brute-force guard. Returns to the admin page you were heading to.
function Login() {
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
            if (response.status === 401) throw new Error("Code PIN incorrect.");
            if (response.status === 429) throw new Error("Trop d'essais. Réessaie dans 15 minutes.");
            if (!response.ok || !body?.ok) throw new Error(body?.message ?? "Connexion impossible. Réessaie.");
            router.replace(next);
            router.refresh();
        } catch (caught) {
            setError(caught instanceof Error ? caught.message : "Connexion impossible. Réessaie.");
            setLoading(false);
        }
    }

    return (
        <main className={styles.page}>
            <div style={{ width: "100%", maxWidth: 400 }}>
                <form className={styles.card} onSubmit={submit}>
                    <div className={styles.brand}>
                        <span className={styles.mark}>
                            <ShieldCheck size={24} />
                        </span>
                        <span>
                            <span className={styles.brandName}>NiceThings</span>
                            <span className={styles.brandSub} style={{ display: "block" }}>
                                Espace équipe
                            </span>
                        </span>
                    </div>

                    <h1 className={styles.title}>Connexion</h1>
                    <p className={styles.lead}>Entre le code PIN de l&apos;équipe pour gérer les lieux, les photos et les signalements.</p>

                    <label className={styles.label} htmlFor="admin-pin">
                        Code PIN
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
                        <button
                            type="button"
                            className={styles.eye}
                            onClick={() => setShowPin(!showPin)}
                            aria-label={showPin ? "Masquer le code" : "Afficher le code"}
                        >
                            {showPin ? <EyeOff size={19} /> : <Eye size={19} />}
                        </button>
                    </div>

                    {error && (
                        <p className={styles.error} role="alert">
                            {error}
                        </p>
                    )}

                    <button type="submit" className={styles.submit} disabled={!pin.trim() || loading}>
                        {loading ? "Vérification…" : "Entrer"}
                        {!loading && <ArrowRight size={19} />}
                    </button>

                    <p className={styles.foot}>Le code est vérifié sur le serveur, jamais dans le navigateur.</p>
                </form>
                <Link href="/" className={styles.back}>
                    ← Retour au site
                </Link>
            </div>
        </main>
    );
}

export default function AdminLoginPage() {
    return (
        <Suspense>
            <Login />
        </Suspense>
    );
}
