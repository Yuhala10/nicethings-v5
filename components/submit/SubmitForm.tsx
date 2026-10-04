"use client";

import { useState } from "react";
import Link from "next/link";
import { Check, Compass, Plus } from "lucide-react";
import { paths } from "@/lib/places/paths";
import { CITIES } from "@/lib/cities";
import { CATEGORIES } from "@/lib/tags";
import { useCurrentCity } from "../site/SiteChrome";
import { useLocale } from "../site/LocaleProvider";
import HereButton, { type Pin } from "./HereButton";
import SimilarPlaces from "./SimilarPlaces";

type Fields = {
    name: string;
    city: string;
    category: string;
    neighborhood: string;
    landmark: string;
    price: string;
    phone: string;
    why: string;
    website: string; // honeypot
};

const EMPTY: Fields = { name: "", city: "", category: "", neighborhood: "", landmark: "", price: "", phone: "", why: "", website: "" };

export default function SubmitForm() {
    const { locale, t } = useLocale();
    const currentCity = useCurrentCity();
    const [fields, setFields] = useState<Fields>(EMPTY);
    const city = fields.city || currentCity;
    const [pin, setPin] = useState<Pin | null>(null);
    const [duplicate, setDuplicate] = useState(false);
    const [refusal, setRefusal] = useState<{ slug?: string; name?: string; suggested?: boolean } | null>(null);
    const [errors, setErrors] = useState<Partial<Record<keyof Fields, string>>>({});
    const [state, setState] = useState<"idle" | "sending" | "sent" | "failed">("idle");

    const set = (key: keyof Fields) => (event: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
        setFields((current) => ({ ...current, [key]: event.target.value }));
        if (errors[key]) setErrors((current) => ({ ...current, [key]: undefined }));
    };

    // Standing at the place: its city and neighbourhood fill themselves in.
    const fillArea = (area: { city: string | null; neighborhood: string | null }) =>
        setFields((current) => ({
            ...current,
            city: area.city ?? current.city,
            neighborhood: current.neighborhood || area.neighborhood || "",
        }));

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

        if (duplicate) {
            document.getElementById("submit-name")?.focus();
            return;
        }
        setState("sending");
        setRefusal(null);
        try {
            const response = await fetch("/api/submissions", {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ ...fields, city, lat: pin?.lat, lng: pin?.lng }),
            });
            if (response.status === 409) {
                const body = await response.json().catch(() => ({}));
                setRefusal(body.duplicate ? { slug: body.duplicate.slug, name: body.duplicate.name } : { suggested: true });
                setState("idle");
                return;
            }
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
                            setPin(null);
                            setState("idle");
                        }}
                        className="nt-btn nt-btn-soft"
                    >
                        <Plus size={18} />
                        {t.submit.title}
                    </button>
                    <Link href={paths.map(locale)} className="nt-btn nt-btn-primary">
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
                <SimilarPlaces name={fields.name} city={city} neighborhood={fields.neighborhood} pin={pin} onDuplicate={setDuplicate} />
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
                    <label htmlFor="submit-city" className={label}>
                        {t.submit.city}
                    </label>
                    <select id="submit-city" value={city} onChange={set("city")} className="nt-input">
                        {CITIES.map((item) => (
                            <option key={item.slug} value={item.slug}>
                                {item.name}
                            </option>
                        ))}
                    </select>
                </div>
            </div>

            <section aria-labelledby="submit-where" className="grid gap-3">
                <h2 id="submit-where" className="text-sm font-semibold text-text">
                    {t.submit.where}
                </h2>
                <HereButton pin={pin} onPin={setPin} onArea={fillArea} category={fields.category} />
            </section>

            <div>
                <label htmlFor="submit-neighborhood" className={label}>
                    {t.submit.neighborhood}
                    {optional}
                </label>
                <input id="submit-neighborhood" value={fields.neighborhood} onChange={set("neighborhood")} maxLength={60} className="nt-input" />
            </div>

            <div>
                <label htmlFor="submit-landmark" className={label}>
                    {t.submit.landmark}
                    {optional}
                </label>
                <input id="submit-landmark" value={fields.landmark} onChange={set("landmark")} maxLength={200} className="nt-input" />
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

            {refusal && (
                <p role="alert" className="rounded-2xl bg-brand-500/10 px-4 py-3 text-sm font-semibold text-text">
                    {refusal.suggested ? (
                        t.submit.alreadySuggested
                    ) : (
                        <>
                            {t.submit.duplicateTitle} :{" "}
                            <Link href={paths.place(locale, refusal.slug!)} className="font-bold text-brand-600 underline">
                                {refusal.name}
                            </Link>
                        </>
                    )}
                </p>
            )}

            {state === "failed" && (
                <p role="alert" className="rounded-2xl bg-closed/10 px-4 py-3 text-sm font-semibold text-closed">
                    {t.common.error}
                </p>
            )}

            <button type="submit" disabled={state === "sending" || duplicate} className="nt-btn nt-btn-primary w-full disabled:opacity-60 sm:w-auto sm:justify-self-start">
                {state === "sending" ? t.submit.sending : t.submit.send}
            </button>
        </form>
    );
}
