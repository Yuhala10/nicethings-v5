"use client";

import { Eye, EyeOff } from "lucide-react";
import { useRef, useState } from "react";
import { PIN_LENGTH } from "@/lib/people/rules";

// Six boxes for a PIN. One real field lies over them (invisible), so the
// phone shows its digit keyboard and paste works; the boxes show dots, or
// the digits on request.
export default function PinInput({
    value,
    onChange,
    label,
    autoFocus = false,
    showLabel,
    hideLabel,
    onComplete,
    invalid = false,
}: {
    value: string;
    onChange: (value: string) => void;
    label: string;
    autoFocus?: boolean;
    showLabel: string;
    hideLabel: string;
    onComplete?: (value: string) => void;
    invalid?: boolean;
}) {
    const field = useRef<HTMLInputElement>(null);
    const [focused, setFocused] = useState(false);
    const [visible, setVisible] = useState(false);

    return (
        <div>
            <div className="mb-2 flex items-center justify-between">
                <span className="text-[0.875rem] font-semibold">{label}</span>
                <button type="button" onClick={() => setVisible((current) => !current)} className="nt-tap inline-flex items-center gap-1 text-[0.75rem] font-semibold text-muted">
                    {visible ? <EyeOff size={14} /> : <Eye size={14} />}
                    {visible ? hideLabel : showLabel}
                </button>
            </div>
            <div className="relative" onClick={() => field.current?.focus()}>
                <div className={`grid grid-cols-6 gap-2 ${invalid ? "nt-shake" : ""}`} aria-hidden>
                    {Array.from({ length: PIN_LENGTH }, (_, index) => {
                        const digit = value[index];
                        return (
                            <span key={index} className="nt-pin-box" data-on={focused && index === Math.min(value.length, PIN_LENGTH - 1)} data-filled={Boolean(digit)} style={invalid ? { borderColor: "var(--color-closed)" } : undefined}>
                                {digit ? (visible ? digit : "•") : ""}
                            </span>
                        );
                    })}
                </div>
                <input
                    ref={field}
                    aria-label={label}
                    value={value}
                    autoFocus={autoFocus}
                    inputMode="numeric"
                    pattern="[0-9]*"
                    autoComplete="off"
                    maxLength={PIN_LENGTH}
                    onFocus={() => setFocused(true)}
                    onBlur={() => setFocused(false)}
                    onChange={(event) => {
                        const next = event.target.value.replace(/\D/g, "").slice(0, PIN_LENGTH);
                        onChange(next);
                        if (next.length === PIN_LENGTH) onComplete?.(next);
                    }}
                    className="absolute inset-0 h-full w-full cursor-pointer opacity-0"
                    style={{ caretColor: "transparent" }}
                />
            </div>
        </div>
    );
}
