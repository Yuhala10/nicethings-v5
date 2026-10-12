"use client";

import { Printer } from "lucide-react";

export default function PrintButton({ label }: { label: string }) {
    return (
        <button type="button" onClick={() => window.print()} className="nt-btn nt-btn-primary mt-6">
            <Printer size={17} />
            {label}
        </button>
    );
}
