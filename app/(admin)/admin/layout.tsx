import { redirect } from "next/navigation";
import AdminShell from "@/components/admin/AdminShell";
import { adminLangPreference, hasAdminSession } from "@/lib/admin-auth";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    if (!(await hasAdminSession())) {
        redirect("/admin-login?next=/admin");
    }
    return <AdminShell lang={await adminLangPreference()}>{children}</AdminShell>;
}
