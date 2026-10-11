import { adminLangPreference } from "@/lib/admin-auth";
import LoginScreen from "./LoginScreen";

// The sign-in screen, sent in the visitor's language from the start.
export default async function AdminLoginPage() {
    return <LoginScreen lang={await adminLangPreference()} />;
}
