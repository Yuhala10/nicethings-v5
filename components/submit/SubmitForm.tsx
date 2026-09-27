"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Compass, LocateFixed, Plus } from "lucide-react";
import { paths } from "@/lib/places/paths";
import { CATEGORIES, YAOUNDE_NEIGHBORHOODS } from "@/lib/tags";
import { useLocale } from "../site/LocaleProvider";

type Fields = {
    name: string;
    category: string;
    neighborhood: string;
    landmark: string;
    price: string;
    phone: string;
    why: string;
    website: string; // honeypot
};

const EMPTY: Fields = { name: "", category: "", neighborhood: "", landmark: "", price: "", phone: "", why: "", website: "" };

export default function SubmitForm() {
    const { locale, t } = useLocale();
    const [fields, setFields] = useState<Fields>(EMPTY);
    const [position, setPosition] = useState<{ lat: number; lng: number } | null>(null);
    const [locating, setLocating] = useState(false);
    const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
    const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

    const set = (key: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFields((current) => ({ ...current, [key]: event.target.value }));
        if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
    };

    const locate = () => {
        if (!("geolocation" in navigator)) return;
        setLocating(true);
        navigator.geolocation.getCurrentPosition(
            (result) => {
                setPosition({ lat: result.coords.latitude, lng: result.coords.longitude });
                setLocating(false);
            },
            () => setLocating(false),
            { enableHighAccuracy: true, timeout: 12000 }
        );
    };

    const submit = async (event: React.FormEvent) => {
        event.preventDefault();
        const next: typeof errors = {};
        if (fields.name.trim().length < 2) next.name = t.submit.required;
        if (fields.price && !/^\d[\d\s]*$/.test(fields.price.trim())) next.price = t.submit.invalidPrice;
        if (fields.phone && !/^[+\d\s().-]{8,40}$/.test(fields.phone.trim())) next.phone = t.submit.invalidPhone;
        setErrors(next);
        if (Object.keys(next).length) {
            document.getElementById(`submit-${Object.keys(next)[0]}`)?.focus();
            return;
        }

        setState("sending");
        try {
            const response = await fetch("/api/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...fields, lat: position?.lat, lng: position?.lng }),
            });
            setState(response.ok ? "sent" : "failed");
        } catch {
            setState("failed");
        }
    };

    if (state === "sent") {
        return (
            <div className="rounded-3xl bg-surface-2 px-6 py-12 text-center">
                <div className="mx-auto mb-4 grid h-14 w-14 place-items-center rounded-full bg-open/15 text-open">
                    <Check size={26} />
                </div>
                <p className="mx-auto mb-6 max-w-sm font-semibold">{t.submit.thanks}</p>
                <div className="flex flex-wrap justify-center gap-2">
                    <button
                        type="button"
                        onClick={() => {
                            setFields(EMPTY);
                            setPosition(null);
                            setState("idle");
                        }}
                        className="nt-btn nt-btn-soft"
                    >
                        <Plus size={18} />
                        {t.submit.title}
                    </button>
                    <Link href={paths.explore(locale)} className="nt-btn nt-btn-primary">
                        <Compass size={18} />
                        {t.saved.explore}
                    </Link>
                </div>
            </div>
        );
    }

    const label = "mb-1.5 block text-sm font-semibold text-text";
    const optional = <span className="font-normal text-muted"> ({t.common.optional})</span>;
    const errorText = (key: keyof Fields) =>
        errors[key] && (
            <p id={`submit-${key}-error`} className="mt-1 text-sm font-semibold text-closed">
                {errors[key]}
            </p>
        );

    return (
        <form onSubmit={submit} noValidate className="grid gap-5">
            <div>
                <label htmlFor="submit-name" className={label}>
                    {t.submit.name}
                </label>
                <input
                    id="submit-name"
                    value={fields.name}
                    onChange={set("name")}
                    maxLength={120}
                    required
                    autoComplete="off"
                    aria-invalid={Boolean(errors.name)}
                    aria-describedby={errors.name ? "submit-name-error" : undefined}
                    className="nt-input"
                />
                {errorText("name")}
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <label htmlFor="submit-category" className={label}>
                        {t.submit.category}
                    </label>
                    <select id="submit-category" value={fields.category} onChange={set("category")} className="nt-input">
                        <option value="">—</option>
                        {Object.entries(CATEGORIES).map(([key, value]) => (
                            <option key={key} value={key}>
                                {value[locale]}
                            </option>
                        ))}
                    </select>
                </div>
                <div>
                    <label htmlFor="submit-neighborhood" className={label}>
                        {t.submit.neighborhood}
                    </label>
                    <select id="submit-neighborhood" value={fields.neighborhood} onChange={set("neighborhood")} className="nt-input">
                        <option value="">—</option>
                        {YAOUNDE_NEIGHBORHOODS.map((area) => (
                            <option key={area.name} value={area.name}>
                                {area.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <div>
                <label htmlFor="submit-landmark" className={label}>
                    {t.submit.landmark}
                    {optional}
                </label>
                <input id="submit-landmark" value={fields.landmark} onChange={set("landmark")} maxLength={200} className="nt-input" />
                <button
                    type="button"
                    onClick={locate}
                    disabled={locating}
                    className={`mt-2 inline-flex items-center gap-1.5 text-sm font-bold ${position ? "text-open" : "text-brand-600"}`}
                >
                    {position ? <Check size={16} /> : <LocateFixed size={16} className={locating ? "animate-pulse" : ""} />}
                    {position ? t.submit.locationAdded : t.submit.useLocation}
                </button>
            </div>

            <div className="grid gap-5 sm:grid-cols-2">
                <div>
                    <label htmlFor="submit-price" className={label}>
                        {t.submit.price}
                        {optional}
                    </label>
                    <input
                        id="submit-price"
                        value={fields.price}
                        onChange={set("price")}
                        inputMode="numeric"
                        maxLength={9}
                        aria-invalid={Boolean(errors.price)}
                        className="nt-input"
                    />
                    {errorText("price")}
                </div>
                <div>
                    <label htmlFor="submit-phone" className={label}>
                        {t.submit.phone}
                        {optional}
                    </label>
                    <input
                        id="submit-phone"
                        value={fields.phone}
                        onChange={set("phone")}
                        type="tel"
                        inputMode="tel"
                        maxLength={40}
                        aria-invalid={Boolean(errors.phone)}
                        className="nt-input"
                    />
                    {errorText("phone")}
                </div>
            </div>

            <div>
                <label htmlFor="submit-why" className={label}>
                    {t.submit.why}
                    {optional}
                </label>
                <textarea id="submit-why" value={fields.why} onChange={set("why")} maxLength={900} className="nt-input" />
            </div>

            {/* Honeypot: hidden from people, irresistible to bots. */}
            <div aria-hidden className="absolute -left-[9999px]">
                <input tabIndex={-1} autoComplete="off" value={fields.website} onChange={set("website")} name="website" />
            </div>

            {state === "failed" && (
                <p role="alert" className="rounded-2xl bg-closed/10 px-4 py-3 text-sm font-semibold text-closed">
                    {t.common.error}
                </p>
            )}

            <button type="submit" disabled={state === "sending"} className="nt-btn nt-btn-primary w-full disabled:opacity-60 sm:w-auto sm:justify-self-start">
                {state === "sending" ? t.submit.sending : t.submit.send}
            </button>
        </form>
    );
}
