import { redirect } from "next/navigation";
import { hasAdminSession } from "../../lib/admin-auth";
import AdminSessionBar from "../../components/admin/AdminSessionBar";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
    if (!(await hasAdminSession())) {
        redirect("/admin-login?next=/admin");
    }

    return (
        <>
            <AdminSessionBar />
            {children}
        </>
    );
}
