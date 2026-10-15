import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowDown, ArrowRight, AtSign, Camera, Gift, MapPinPlus, PenLine, Share2, Star } from "lucide-react";
import GiftInvites from "@/components/guest/GiftInvites";
import GuestKit from "@/components/guest/GuestKit";
import NotebookComposer from "@/components/guest/NotebookComposer";
import { cityBySlug } from "@/lib/cities";
import { themeOf } from "@/lib/guest-theme";
import { GIFTS, giverOf, guestOfInvitation, guestReach, invitationLook, type Reach } from "@/lib/guests";
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
    const look = await invitationLook(invitation).catch(() => ({ tier: invitation.tier, giver: null }));
    const honour = invitation.tier === "honour";
    const title = look.giver ? fill(t.honour.giftedBy, { name: look.giver.name }) : fill(honour ? t.honour.cardTitle : t.invitation.cardTitle, { name: invitation.name });
    const card = invitationShareImage(invitation.name, lang, look);
    return { title, description: honour ? t.honour.cardBody : t.invitation.cardBody, robots: { index: false, follow: false }, openGraph: { title, description: honour ? t.honour.cardBody : t.invitation.cardBody, images: [card] }, twitter: { card: "summary_large_image", images: [card.url] } };
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
    const honourGifts = [Star, AtSign, Gift, PenLine];
    const until = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "UTC" }).format(invitation.until);
    const mine = await guestOfInvitation(invitation).catch(() => null);
    const live = mine?.published ?? null;
    const reach: Reach | null = live ? await guestReach(live).catch(() => null) : null;
    const liveCity = live ? (cityBySlug(live.city)?.name ?? t.guestPage.country) : "";
    const liveUrl = live ? `${SITE_URL}${paths.guest(lang, live.slug)}` : "";
    const liveNumber = String(live?.number ?? 1).padStart(2, "0");
    // The rank, from the signed invitation; and who gave it, when a guest of honour did.
    const honour = invitation.tier === "honour";
    const theme = themeOf(invitation.tier);
    const giver = await giverOf(invitation).catch(() => null);
    const giftsLeft = live && honour ? Math.max(0, GIFTS - (live.giftsGiven ?? 0)) : 0;
    const shortAddress = live ? `${SITE_URL.replace(/^https:\/\/(www\.)?/, "")}/@${live.slug}` : "";
    return (
        <div className="pb-24">
            {/* ---------------- Their page is out: their own space ---------------- */}
            {live && (
                <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                    <div className={`relative overflow-hidden rounded-[2rem] px-6 py-12 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,22rem)] md:gap-12 md:px-12 md:py-16 ${theme.panel} ${theme.text}`}>
                        <span className={`pointer-events-none absolute inset-2.5 rounded-[1.6rem] border ${theme.frame}`} aria-hidden />
                        <div className="relative">
                            <p className={`flex items-center gap-2 text-[0.75rem] font-semibold tracking-[0.3em] uppercase ${honour ? "text-[#f3d77e]" : "text-[#d9bc8c]"}`}>
                                {honour && <Star size={13} className="fill-[#f3d77e]" />}
                                {honour ? t.honour.rank : t.guestKit.liveEyebrow}
                            </p>
                            <h1 className="nt-serif mt-4 text-[2.75rem] leading-[0.98] md:text-[4rem]">{fill(t.guestKit.liveTitle, { name: live.name })}</h1>
                            <p className={`mt-4 max-w-md text-[1.125rem] leading-relaxed ${theme.soft}`}>{honour ? `${t.honour.rank} · ${fill(t.guestPage.number, { number: liveNumber })}` : fill(t.guestKit.liveLead, { number: liveNumber })}</p>
                            {honour && (
                                <p className="mt-3 text-[1rem]">
                                    <span className="text-[#fbf6e9]/60">{t.honour.myAddress} : </span>
                                    <span className="nt-foil font-bold">{shortAddress}</span>
                                </p>
                            )}
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
                                        <div key={label} className={`p-4 md:p-5 ${theme.panel}`}>
                                            <dt className="sr-only">{label}</dt>
                                            <dd className={`nt-serif text-[2.75rem] leading-none ${theme.accent}`}>{formatNumber(value, lang)}</dd>
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
                                caption={fill(honour ? t.honour.captionText : t.guestKit.captionText, { number: liveNumber, city: liveCity, url: liveUrl })}
                            />
                        </div>
                    </div>
                </header>
            )}

            {/* ---------------- A guest of honour's three invitations to give ---------------- */}
            {live && honour && (
                <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
                    <GiftInvites code={code} left={giftsLeft} total={GIFTS} />
                </section>
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
                <div className={`relative overflow-hidden rounded-[2rem] px-6 py-14 text-center md:px-12 md:py-24 ${theme.panel} ${theme.text}`}>
                    <span className={`pointer-events-none absolute inset-2.5 rounded-[1.6rem] border ${theme.frame}`} aria-hidden />
                    {honour && <span className="pointer-events-none absolute inset-4 rounded-[1.35rem] border border-[#e2c065]/20" aria-hidden />}
                    <span className={`pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full ${theme.glow}`} aria-hidden />
                    {honour && <Star size={30} className="relative mx-auto mb-4 fill-[#f3d77e] text-[#f3d77e]" />}
                    <p className={`relative text-[0.75rem] font-semibold tracking-[0.3em] uppercase ${honour ? "text-[#f3d77e]" : "text-[#d9bc8c]"}`}>{honour ? t.honour.label : t.invitation.label}</p>
                    <span className={`relative mx-auto mt-5 block h-px w-16 ${honour ? "bg-[#e2c065]/70" : "bg-[#d9bc8c]/60"}`} aria-hidden />
                    <h1 className="nt-serif relative mt-7 text-[3.5rem] leading-[0.95] md:text-[4.5rem]">
                        {invitation.name},
                        <em className={`mt-2 block text-[2.25rem] leading-[1.05] md:text-[2.75rem] ${theme.accent}`}>
                            {giver ? fill(t.honour.giftedBy, { name: giver.name }) : honour ? t.honour.invites : t.invitation.invites}
                        </em>
                    </h1>
                    <p className={`relative mx-auto mt-7 max-w-xl text-[1.125rem] leading-relaxed ${theme.soft}`}>{tidy(honour ? t.honour.lead : t.invitation.lead)}</p>
                    <a href="#carnet" className={`nt-btn relative mt-9 ${theme.button}`}>
                        {t.invitation.begin}
                        <ArrowDown size={17} />
                    </a>
                    <p className={`relative mt-6 text-[0.75rem] font-medium tracking-[0.08em] ${honour ? "text-[#fbf6e9]/50" : "text-[#faf7f2]/50"}`}>{fill(t.invitation.until, { date: until })}</p>
                </div>
            </header>
            )}

            {/* ---------------- What a guest is given ---------------- */}
            {!live && (
            <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-20">
                <div className="nt-reveal max-w-2xl">
                    <p className="nt-eyebrow">{honour ? t.honour.giftsEyebrow : t.invitation.giftsEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{honour ? t.honour.giftsTitle : t.invitation.giftsTitle}</h2>
                </div>
                <ul className="nt-reveal mt-8 grid gap-px overflow-hidden rounded-[1.6rem] border border-line bg-line sm:grid-cols-2 lg:grid-cols-4">
                    {(honour ? t.honour.gifts : t.invitation.gifts).map((gift, index) => {
                        const Icon = (honour ? honourGifts : gifts)[index] ?? PenLine;
                        return (
                            <li key={gift.title} className="bg-bg p-6 md:p-7">
                                <Icon size={22} strokeWidth={1.7} className={honour ? "text-[#b4862a]" : "text-brand-600"} />
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
