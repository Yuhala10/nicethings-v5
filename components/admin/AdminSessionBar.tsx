"use client";

import Link from "next/link";
import { Camera, LogOut, ShieldCheck } from "lucide-react";
import { useRouter } from "next/navigation";
import { useState } from "react";

export default function AdminSessionBar() {
    const router = useRouter();
    const [loading, setLoading] = useState(false);

    async function logout() {
        if (loading) return;
        setLoading(true);
        try {
            await fetch("/api/admin/logout", { method: "POST" });
        } finally {
            router.replace("/admin-login");
            router.refresh();
        }
    }

    return (
        <div className="nt-admin-session-bar">
            <div className="nt-admin-session-inner">
                <span><ShieldCheck size={14} /> Secure admin session</span>
                <Link href="/admin/terrain" className="nt-admin-terrain-link">
                    <Camera size={14} /> Terrain : photos, prix, horaires
                </Link>
                <button type="button" onClick={logout} disabled={loading}>
                    <LogOut size={14} /> {loading ? "Signing out…" : "Sign out"}
                </button>
            </div>
        </div>
    );
}
