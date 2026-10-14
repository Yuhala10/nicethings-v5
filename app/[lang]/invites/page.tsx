import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { Camera, MapPin, PenLine } from "lucide-react";
import PostCard from "@/components/blog/PostCard";
import GuestCard from "@/components/guest/GuestCard";
import RequestInvitation from "@/components/guest/RequestInvitation";
import { isGuest } from "@/lib/blog/guest";
import { getPosts } from "@/lib/blog/server";
import { getGuests, refOf } from "@/lib/guests";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { tidy } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";

// "Les invités": the people NiceThings invited to show their city, each on
// their own page (app/[lang]/invites/[slug]), in the order they came out.
// Below them, the door: asking for an invitation. And for someone already
// invited, how their notebook comes to the site.

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    const path = (locale: Locale) => paths.guests(locale);
    return {
        title: t.guest.metaTitle,
        description: t.guest.metaDescription,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title: t.guest.metaTitle, description: t.guest.metaDescription, url: path(lang) },
    };
}

export default async function GuestsPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const guests = await getGuests().catch(() => []);
    // Notebooks signed by a guest who has no page (written by the team on their behalf).
    const withPage = new Set(guests.map((guest) => guest.ref));
    const loose = (await getPosts().catch(() => [])).filter((post) => isGuest(post) && !withPage.has(refOf(post) ?? ""));
    const steps = [MapPin, Camera, PenLine];

    return (
        <div className="pb-24">
            <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-contrast px-6 py-12 text-on-contrast md:px-12 md:py-20">
                    <p className="text-[0.75rem] font-semibold tracking-[0.16em] uppercase opacity-60">{t.guestPage.homeEyebrow}</p>
                    <h1 className="nt-serif mt-3 max-w-[14ch] text-[2.75rem] leading-[0.98] md:text-[4.5rem]">{t.guestPage.homeTitle}</h1>
                    <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed opacity-80">{tidy(t.guestPage.homeLead)}</p>
                </div>
            </header>

            {/* ---------------- The guests ---------------- */}
            {guests.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
                    <ul className="grid gap-x-4 gap-y-10 sm:grid-cols-2 lg:grid-cols-3">
                        {guests.map((guest, index) => (
                            <li key={guest.ref} className="nt-reveal">
                                <GuestCard guest={guest} locale={lang} priority={index < 2} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
            {loose.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
                    <p className="nt-eyebrow">{t.guest.pageEyebrow}</p>
                    <div className="nt-masonry nt-settle mt-6 columns-2 md:columns-4">
                        {loose.map((post) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={lang} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ---------------- Asking for an invitation ---------------- */}
            <section id="demande" className="scroll-mt-20 mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-24">
                <div className="nt-invitation relative overflow-hidden rounded-[2rem] bg-[#15110e] px-6 py-12 text-[#faf7f2] md:px-12 md:py-16">
                    <span className="pointer-events-none absolute inset-2.5 rounded-[1.6rem] border border-[#d9bc8c]/35" aria-hidden />
                    <div className="relative mx-auto max-w-2xl">
                        {guests.length === 0 && <p className="nt-serif mb-8 text-center text-[1.5rem] leading-[1.25] text-[#faf7f2]/85 italic">{tidy(t.guestPage.teaserBody)}</p>}
                        <p className="text-center text-[0.75rem] font-semibold tracking-[0.3em] text-[#d9bc8c] uppercase">{t.guestRequest.eyebrow}</p>
                        <h2 className="nt-serif mt-3 text-center text-[2.75rem] leading-[1] md:text-[3.5rem]">{t.guestRequest.title}</h2>
                        <p className="mx-auto mt-4 mb-10 max-w-xl text-center text-[1.125rem] leading-relaxed text-[#faf7f2]/75">{tidy(t.guestRequest.lead)}</p>
                        <RequestInvitation />
                    </div>
                </div>
            </section>

            {/* ---------------- For someone already invited ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-24">
                <div className="nt-reveal max-w-2xl">
                    <p className="nt-eyebrow">{t.guest.howEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.guest.howTitle}</h2>
                    <p className="mt-3 text-[1rem] leading-relaxed text-muted">{t.guest.howLead}</p>
                </div>
                <ol className="nt-reveal mt-8 grid gap-px overflow-hidden rounded-[1.6rem] border border-line bg-line md:grid-cols-3">
                    {t.guest.steps.map((step, index) => {
                        const Icon = steps[index] ?? PenLine;
                        return (
                            <li key={step.title} className="bg-bg p-6 md:p-8">
                                <span className="flex items-center gap-3 text-brand-600">
                                    <span className="nt-serif text-[1.5rem] leading-none">{index + 1}</span>
                                    <Icon size={20} strokeWidth={1.7} />
                                </span>
                                <p className="nt-serif mt-5 text-[1.5rem] leading-tight">{step.title}</p>
                                <p className="mt-2 text-[1rem] leading-relaxed text-muted">{step.body}</p>
                            </li>
                        );
                    })}
                </ol>
                <p className="nt-reveal mt-4 max-w-2xl rounded-[1.6rem] bg-surface-2 p-6 text-[1rem] leading-relaxed text-text-2 md:p-8">{t.guest.rule}</p>
            </section>
        </div>
    );
}
