import type { ReactNode } from "react";
import { redirect } from "next/navigation";

import { hasAdminSession } from "../../lib/admin-auth";
import AdminSessionBar from "../../components/admin/AdminSessionBar";

export default async function AdminLayout({
    children,
}: {
    children: ReactNode;
}) {
    if (!(await hasAdminSession())) {
        redirect("/admin-login?next=/admin");
    }

    return (
        <div className="nt-admin-shell">
            <AdminSessionBar />

            <div className="nt-admin-shell-content">
                {children}
            </div>
        </div>
    );
}