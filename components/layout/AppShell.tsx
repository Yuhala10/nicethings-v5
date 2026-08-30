import type { ReactNode } from "react";

import Header from "./Header";
import BottomNav from "./BottomNav";
import Footer from "./Footer";

type AppShellProps = {
    children: ReactNode;
};

export default function AppShell({
    children,
}: AppShellProps) {
    return (
        <div className="nt-app">
            <Header />

            {children}

            <Footer />
            <BottomNav />
        </div>
    );
}