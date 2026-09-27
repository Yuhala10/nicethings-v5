"use client";

import { LogOut, ShieldCheck } from "lucide-react";
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
                <button type="button" onClick={logout} disabled={loading}>
                    <LogOut size={14} /> {loading ? "Signing out…" : "Sign out"}
                </button>
            </div>
        </div>
    );
}
