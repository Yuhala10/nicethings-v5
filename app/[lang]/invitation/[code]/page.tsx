import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowRight, Camera, MapPinPlus, PenLine, Share2 } from "lucide-react";
import GuestKit from "@/components/guest/GuestKit";
import NotebookComposer from "@/components/guest/NotebookComposer";
import { cityBySlug } from "@/lib/cities";
import { guestOfInvitation, guestReach, type Reach } from "@/lib/guests";
import { SITE_URL, fill, getDictionary, isLocale } from "@/lib/i18n";
import { formatNumber, tidy } from "@/lib/i18n/format";
import { readInvitation } from "@/lib/invitations";
import { paths } from "@/lib/places/paths";
import { guestShareImage, guestStoryImage, invitationShareImage } from "@/lib/share-image";

// A personal invitation, opened by the person it was made for
// (lib/invitations.ts). The page greets them by name, says what being a
// guest of NiceThings gives them, and holds their notebook space. Once their
// page is out (lib/guests.ts), the same link becomes their own space: what
// their page is doing, and what they need to share it. Never offered to
// search engines: the link is theirs.

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, code } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    const invitation = readInvitation(decodeURIComponent(code));
    if (!invitation) return { title: t.invitation.expiredTitle, robots: { index: false, follow: false } };
    const title = fill(t.invitation.cardTitle, { name: invitation.name });
    const card = invitationShareImage(invitation.name, lang);
    return { title, description: t.invitation.cardBody, robots: { index: false, follow: false }, openGraph: { title, description: t.invitation.cardBody, images: [card] }, twitter: { card: "summary_large_image", images: [card.url] } };
}

export default async function InvitationPage({ params }: Props) {
    const { lang, code: raw } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const code = decodeURIComponent(raw);
    const invitation = readInvitation(code);

    if (!invitation) {
        return (
            <div className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] pb-24 md:px-6 md:pt-10">
                <div className="rounded-[2rem] bg-contrast px-6 py-14 text-on-contrast md:px-12 md:py-20">
                    <p className="text-[0.75rem] font-semibold tracking-[0.16em] uppercase opacity-60">{t.invitation.label}</p>
                    <h1 className="nt-serif mt-3 max-w-[14ch] text-[2.75rem] leading-[0.98] md:text-[4.5rem]">{t.invitation.expiredTitle}</h1>
                    <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed opacity-80">{t.invitation.expiredBody}</p>
                    <Link href={paths.guests(lang)} className="nt-btn mt-8 border border-white/25 text-white hover:bg-white/10">
                        {t.guest.pageEyebrow}
                        <ArrowRight size={16} />
                    </Link>
                </div>
            </div>
        );
    }

    const gifts = [PenLine, MapPinPlus, Camera, Share2];
    const until = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(invitation.until);
    const mine = await guestOfInvitation(invitation).catch(() => null);
    const live = mine?.published ?? null;
    const reach: Reach | null = live ? await guestReach(live).catch(() => null) : null;
    const liveCity = live ? (cityBySlug(live.city)?.name ?? t.guestPage.country) : "";
    const liveUrl = live ? `${SITE_URL}${paths.guest(lang, live.slug)}` : "";
    const liveNumber = String(live?.number ?? 1).padStart(2, "0");
    return (
        <div className="pb-24">
            {/* ---------------- Their page is out: their own space ---------------- */}
            {live && (
                <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                    <div className="nt-invitation relative overflow-hidden rounded-[2rem] bg-[#15110e] px-6 py-12 text-[#faf7f2] md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-12 md:px-12 md:py-16">
                        <span className="pointer-events-none absolute inset-2.5 rounded-[1.6rem] border border-[#d9bc8c]/35" aria-hidden />
                        <div className="relative">
                            <p className="text-[0.75rem] font-semibold tracking-[0.3em] text-[#d9bc8c] uppercase">{t.guestKit.liveEyebrow}</p>
                            <h1 className="nt-serif mt-4 text-[2.75rem] leading-[0.98] md:text-[4rem]">{fill(t.guestKit.liveTitle, { name: live.name })}</h1>
                            <p className="mt-4 max-w-md text-[1.125rem] leading-relaxed text-[#faf7f2]/75">{fill(t.guestKit.liveLead, { number: liveNumber })}</p>
                            {reach && (
                                <dl className="mt-8 grid grid-cols-2 gap-px overflow-hidden rounded-[1.4rem] border border-white/10 bg-white/10">
                                    {(
                                        [
                                            [reach.visitors, t.guestKit.statVisitors],
                                            [reach.opened, t.guestKit.statOpened],
                                            [reach.hearts, t.guestKit.statHearts],
                                            [reach.words, t.guestKit.statWords],
                                        ] as [number, string][]
                                    ).map(([value, label]) => (
                                        <div key={label} className="bg-[#15110e] p-4 md:p-5">
                                            <dt className="sr-only">{label}</dt>
                                            <dd className="nt-serif text-[2.75rem] leading-none text-[#d9bc8c]">{formatNumber(value, lang)}</dd>
                                            <dd className="mt-2 text-[0.875rem] leading-snug text-[#faf7f2]/70">{label}</dd>
                                        </div>
                                    ))}
                                </dl>
                            )}
                            <p className="mt-3 text-[0.75rem] leading-relaxed text-[#faf7f2]/50">
                                {reach && reach.visitors + reach.hearts + reach.words === 0 ? `${t.guestKit.statsHint} ` : ""}
                                {t.guestKit.statsNote}
                            </p>
                        </div>
                        <div className="relative mt-10 md:mt-0">
                            <GuestKit
                                title={fill(t.guestPage.metaTitle, { city: liveCity, name: live.name })}
                                path={paths.guest(lang, live.slug)}
                                url={liveUrl}
                                preview={guestShareImage(live, lang).url}
                                story={guestStoryImage(live, lang)}
                                slug={live.slug}
                                caption={fill(t.guestKit.captionText, { number: liveNumber, city: liveCity, url: liveUrl })}
                            />
                        </div>
                    </div>
                </header>
            )}

            {/* ---------------- Sent, being read ---------------- */}
            {!live && mine && (
                <div className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                    <div className="rounded-[1.6rem] border border-[#d9bc8c]/60 bg-[#faf6ee] p-6 text-[#15110e] md:p-8 dark:bg-[#211a14] dark:text-[#faf7f2]">
                        <p className="text-[0.75rem] font-semibold tracking-[0.3em] text-[#a8824a] uppercase">{t.guestKit.reviewEyebrow}</p>
                        <p className="nt-serif mt-2 text-[2rem] leading-[1.05]">{t.guestKit.reviewTitle}</p>
                        <p className="mt-2 max-w-xl text-[1rem] leading-relaxed opacity-75">{tidy(t.guestKit.reviewBody)}</p>
                    </div>
                </div>
            )}

            {/* ---------------- The invitation itself ---------------- */}
            {!live && (
            <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                <div className="nt-invitation relative overflow-hidden rounded-[2rem] bg-[#15110e] px-6 py-14 text-center text-[#faf7f2] md:px-12 md:py-24">
                    <p className="text-[0.75rem] font-semibold tracking-[0.3em] text-[#d9bc8c] uppercase">{t.invitation.label}</p>
                    <span className="mx-auto mt-5 block h-px w-16 bg-[#d9bc8c]/60" aria-hidden />
                    <h1 className="nt-serif mt-7 text-[3.5rem] leading-[0.95] md:text-[4.5rem]">
                        {invitation.name},
                        <em className="mt-2 block text-[2.25rem] leading-[1.05] text-[#d9bc8c] md:text-[2.75rem]">{t.invitation.invites}</em>
                    </h1>
                    <p className="mx-auto mt-7 max-w-xl text-[1.125rem] leading-relaxed text-[#faf7f2]/80">{tidy(t.invitation.lead)}</p>
                    <a href="#carnet" className="nt-btn mt-9 bg-[#faf7f2] text-[#15110e] hover:bg-white">
                        {t.invitation.begin}
                        <ArrowDown size={17} />
                    </a>
                    <p className="mt-6 text-[0.75rem] font-medium tracking-[0.08em] text-[#faf7f2]/50">{fill(t.invitation.until, { date: until })}</p>
                </div>
            </header>
            )}

            {/* ---------------- What a guest is given ---------------- */}
            {!live && (
            <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
                <div className="nt-reveal max-w-2xl">
                    <p className="nt-eyebrow">{t.invitation.giftsEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.invitation.giftsTitle}</h2>
                </div>
                <ul className="nt-reveal mt-8 grid gap-px overflow-hidden rounded-[1.6rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
                    {t.invitation.gifts.map((gift, index) => {
                        const Icon = gifts[index] ?? PenLine;
                        return (
                            <li key={gift.title} className="bg-bg p-6 md:p-7">
                                <Icon size={22} strokeWidth={1.7} className="text-brand-600" />
                                <p className="nt-serif mt-5 text-[1.5rem] leading-tight">{gift.title}</p>
                                <p className="mt-2 text-[1rem] leading-relaxed text-muted">{tidy(gift.body)}</p>
                            </li>
                        );
                    })}
                </ul>
            </section>
            )}

            {/* ---------------- Their notebook ---------------- */}
            <section id="carnet" className="scroll-mt-20 mx-auto max-w-6xl px-4 pt-16 md:px-6 md:pt-24">
                <div className="mx-auto max-w-2xl">
                    <p className="nt-eyebrow">{t.invitation.composeEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{live ? t.guestKit.another : t.invitation.composeTitle}</h2>
                    <p className="mt-3 mb-8 text-[1rem] leading-relaxed text-muted">{tidy(t.invitation.composeLead)}</p>
                </div>
                <NotebookComposer
                    code={code}
                    guest={invitation.name}
                    card={mine ? { handle: mine.card.handle ?? "", link: mine.card.link ?? "", intro: mine.card.intro ?? "", portrait: mine.card.portrait_url ?? "" } : null}
                />
            </section>
        </div>
    );
}
