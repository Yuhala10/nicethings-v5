import type { Metadata } from "next";
import Image from "next/image";
import Link from "next/link";
import { draftMode } from "next/headers";
import { notFound } from "next/navigation";
import { ArrowRight, ArrowUpRight, MapPin, Navigation, Sparkles, Star } from "lucide-react";
import Talk from "@/components/people/Talk";
import Inline from "@/components/blog/Inline";
import PostCard from "@/components/blog/PostCard";
import GuestCard, { quoted, sealOf } from "@/components/guest/GuestCard";
import GuestHeart from "@/components/guest/GuestHeart";
import GuestShare from "@/components/guest/GuestShare";
import { hasAdminSession } from "@/lib/admin-auth";
import { getTalk } from "@/lib/people/talk";
import type { Post } from "@/lib/blog/server";
import { cityBySlug } from "@/lib/cities";
import { themeOf } from "@/lib/guest-theme";
import { getGuest, getGuests, guestPosts, picksOf, previewGuest, type Guest } from "@/lib/guests";
import { SITE_URL, fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { tidy } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import { getPlacesBySlugs } from "@/lib/places/server";
import type { PlaceSummary } from "@/lib/places/types";
import { guestShareImage } from "@/lib/share-image";

// A guest's page: "Yaoundé, vu par …". Made only of what the guest sent
// with their invitation (their photo, their account, their sentence, their
// places with their photos and words), and out only once the team has
// published one of their notebooks (lib/guests.ts). Visitors can give it a
// heart and leave a word in its guest book; the guest sees both on their
// own page, with how many people came. A guest of honour's page is green and
// gold (lib/guest-theme.ts), with their own short address.

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; slug: string }> };

// The team previews a page before it is out (draft mode, signed in).
async function load(slug: string): Promise<{ guest: Guest; posts: Post[]; preview: boolean } | null> {
    if (!/^[a-z0-9-]{1,60}$/.test(slug)) return null;
    if ((await draftMode()).isEnabled && (await hasAdminSession())) {
        const preview = await previewGuest(slug).catch(() => null);
        if (preview) return { ...preview, preview: true };
    }
    const guest = await getGuest(slug);
    return guest ? { guest, posts: await guestPosts(guest), preview: false } : null;
}

const cityOf = (guest: Guest, lang: Locale) => cityBySlug(guest.city)?.name ?? getDictionary(lang).guestPage.country;

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, slug } = await params;
    if (!isLocale(lang)) return {};
    const guest = await getGuest(slug).catch(() => null);
    if (!guest) return { robots: { index: false, follow: false } };
    const t = getDictionary(lang);
    const words = { city: cityOf(guest, lang), name: guest.name };
    const title = fill(t.guestPage.metaTitle, words);
    const description = guest.intro ? `${quoted(guest.intro, lang)} ${fill(t.guestPage.metaDescription, words)}` : fill(t.guestPage.metaDescription, words);
    const card = guestShareImage(guest, lang);
    const path = (locale: Locale) => paths.guest(locale, guest.slug);
    return {
        title: { absolute: title },
        description,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title, description, url: path(lang), type: "profile", images: [card] },
        twitter: { card: "summary_large_image", title, description, images: [card.url] },
    };
}

export default async function GuestPage({ params }: Props) {
    const { lang, slug } = await params;
    if (!isLocale(lang)) notFound();
    const found = await load(slug);
    if (!found) notFound();
    const { guest, posts, preview } = found;
    const t = getDictionary(lang);
    const city = cityOf(guest, lang);
    const picks = picksOf(posts, guest);
    const listed = await getPlacesBySlugs(picks.flatMap((pick) => (pick.slug ? [pick.slug] : []))).catch(() => [] as PlaceSummary[]);
    const places = new Map(listed.map((place) => [place.slug, place] as const));
    const others = (await getGuests().catch(() => [])).filter((other) => other.ref !== guest.ref).slice(0, 6);
    // (Guests of honour come first in that list: getGuests sorts them so.)
    const number = sealOf(guest, lang);
    const theme = themeOf(guest.tier);
    const honour = guest.tier === "honour";
    const all = await getGuests().catch(() => []);
    const giver = guest.invitedBy ? (all.find((other) => other.ref === guest.invitedBy) ?? null) : null;
    const address = `${SITE_URL.replace(/^https:\/\/(www\.)?/, "")}/@${guest.slug}`;
    const day = new Intl.DateTimeFormat(lang === "fr" ? "fr-FR" : "en-GB", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Douala" });
    const facts = [fill(picks.length === 1 ? t.guestPage.placesOne : t.guestPage.placesMany, { count: picks.length }), guest.since ? fill(t.guestPage.since, { date: day.format(new Date(guest.since)) }) : null].filter(Boolean).join(" · ");

    // The guest book: kind words under any of their notebooks, oldest first;
    // a new word goes under the latest one.
    const latest = preview ? null : guest.notebooks[0];
    const book = latest ? await getTalk("article", guest.notebooks.map((post) => post.id)) : null;
    const signed = book?.filter((comment) => !comment.pending).length ?? 0;

    const url = `${SITE_URL}${paths.guest(lang, guest.slug)}`;
    const jsonLd = {
        "@context": "https://schema.org",
        "@type": "ProfilePage",
        name: fill(t.guestPage.metaTitle, { city, name: guest.name }),
        url,
        mainEntity: { "@type": "Person", name: guest.name, ...(guest.link && { sameAs: [guest.link] }), ...(guest.portrait && { image: guest.portrait }) },
    };

    return (
        <div className="pb-24">
            {!preview && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd).replace(/</g, "\\u003c") }} />}

            {/* ---------------- Their cover: who they are ---------------- */}
            <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                {preview && <p className="mb-3 rounded-[1rem] bg-amber-50 px-4 py-3 text-[0.875rem] font-semibold text-[#8a5a00]">{t.guestPage.preview}</p>}
                <div className={`relative overflow-hidden rounded-[2rem] px-6 pt-10 pb-9 md:grid md:grid-cols-[minmax(0,1fr)_minmax(0,21rem)] md:items-center md:gap-14 md:px-14 md:py-16 ${theme.panel} ${theme.text}`}>
                    <span className={`pointer-events-none absolute inset-2.5 rounded-[1.6rem] border ${theme.frame}`} aria-hidden />
                    {honour && <span className="pointer-events-none absolute inset-4 rounded-[1.35rem] border border-[#e2c065]/20" aria-hidden />}
                    <span className={`pointer-events-none absolute -top-40 -right-40 h-96 w-96 rounded-full ${theme.glow}`} aria-hidden />

                    {/* Their photo, framed like an arch; in gold leaf for a guest of honour. */}
                    <div className="relative mx-auto w-[min(68vw,17rem)] md:order-2 md:w-full">
                        <div className={`relative aspect-[3/4] overflow-hidden rounded-t-[999px] rounded-b-[1.6rem] p-1.5 ${honour ? "nt-foil-bg" : `border ${theme.ring} ${theme.portraitBack}`}`}>
                            <div className={`relative h-full w-full overflow-hidden rounded-t-[999px] rounded-b-[1.3rem] ${theme.portraitBack}`}>
                                {guest.cover ? (
                                    <Image src={guest.cover} alt={guest.name} fill priority sizes="(min-width: 768px) 21rem, 68vw" className="object-cover" />
                                ) : (
                                    <span className={`nt-serif absolute inset-0 grid place-items-center text-[9rem] ${theme.accent}`} aria-hidden>
                                        {guest.name.trim().charAt(0).toUpperCase()}
                                    </span>
                                )}
                            </div>
                        </div>
                        {number && (
                            <span className={`absolute -bottom-3 left-1/2 inline-flex -translate-x-1/2 items-center gap-1.5 rounded-full border px-4 py-1.5 text-[0.75rem] font-bold tracking-[0.16em] whitespace-nowrap uppercase ${theme.seal}`}>
                                {honour && <Star size={12} className="fill-[#f3d77e]" />}
                                {number}
                            </span>
                        )}
                    </div>

                    <div className="relative mt-9 text-center md:order-1 md:mt-0 md:text-left">
                        <p className={`text-[0.75rem] font-semibold tracking-[0.3em] uppercase ${honour ? "text-[#f3d77e]" : "text-[#d9bc8c]"}`}>{t.guestPage.presents}</p>
                        <h1 className="nt-serif mt-4 leading-[0.98]">
                            <span className={`block text-[2.25rem] md:text-[3.5rem] ${theme.accent}`}>{fill(t.guestPage.cityLine, { city })}</span>
                            <span className="mt-1 block text-[2.75rem] md:text-[4.5rem]">{fill(t.guestPage.byLine, { name: guest.name })}</span>
                        </h1>
                        {guest.handle &&
                            (guest.link ? (
                                <a href={guest.link} target="_blank" rel="noopener noreferrer" className={`nt-tap mt-3 inline-flex min-h-11 items-center gap-1 text-[1rem] font-semibold underline-offset-4 hover:underline ${theme.soft}`}>
                                    {guest.handle}
                                    <ArrowUpRight size={15} />
                                </a>
                            ) : (
                                <p className={`mt-3 text-[1rem] font-semibold ${theme.soft}`}>{guest.handle}</p>
                            ))}
                        {guest.intro && <p className={`nt-serif mx-auto mt-5 max-w-md text-[1.5rem] leading-[1.25] italic md:mx-0 ${theme.soft}`}>{quoted(guest.intro, lang)}</p>}
                        <p className={`mt-5 text-[0.75rem] font-medium tracking-[0.08em] uppercase ${honour ? "text-[#f3d77e]/80" : "text-[#faf7f2]/50"}`}>
                            {honour ? t.honour.rank : t.guest.seal}
                            {giver ? ` · ${fill(t.honour.giftedNote, { name: giver.name })}` : ""}
                        </p>
                        {/* A guest of honour's own short address, made for a bio. */}
                        {honour && !preview && (
                            <p className="mt-2 text-[0.875rem]">
                                <span className="text-[#fbf6e9]/55">{t.honour.address} </span>
                                <span className="nt-foil font-bold">{address}</span>
                            </p>
                        )}
                        {!preview && (
                            <div className="mt-7 flex flex-wrap items-center justify-center gap-2.5 md:justify-start">
                                <GuestHeart slug={guest.slug} initial={guest.hearts} />
                                <GuestShare title={fill(t.guestPage.metaTitle, { city, name: guest.name })} url={url} preview={guestShareImage(guest, lang).url} label={t.guestPage.share} />
                            </div>
                        )}
                        <p className="mt-6 text-[0.875rem] text-[#faf7f2]/55">{facts}</p>
                    </div>
                </div>
            </header>

            {/* ---------------- Their places ---------------- */}
            <section className="mx-auto max-w-3xl px-4 pt-16 md:px-6 md:pt-24">
                <p className="nt-eyebrow">{t.guestPage.picksEyebrow}</p>
                <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{fill(t.guestPage.picksTitle, { name: guest.name })}</h2>
                <ol className="mt-10 grid gap-16 md:gap-20">
                    {picks.map((pick, index) => {
                        const place = pick.slug ? places.get(pick.slug) : undefined;
                        const area = place ? [place.neighborhood, cityBySlug(place.city)?.name].filter(Boolean).join(", ") : null;
                        return (
                            <li key={`${pick.slug ?? pick.name}-${index}`} className="nt-reveal">
                                <div className="flex items-start gap-4">
                                    <span className="nt-serif text-[3.5rem] leading-[0.85] text-brand-600">{String(index + 1).padStart(2, "0")}</span>
                                    <div className="min-w-0 pt-1">
                                        <h3 className="nt-serif text-[2.25rem] leading-[1.02]">{place?.name ?? pick.name}</h3>
                                        {area && (
                                            <p className="mt-1 flex items-center gap-1 text-[0.875rem] text-muted">
                                                <MapPin size={14} className="shrink-0" />
                                                {area}
                                            </p>
                                        )}
                                    </div>
                                </div>
                                {pick.photos.length > 0 && (
                                    <div className={`mt-5 grid gap-2 ${pick.photos.length > 1 ? "grid-cols-2" : ""}`}>
                                        {pick.photos.map((photo, photoIndex) => (
                                            <div key={photo} className={`relative overflow-hidden rounded-[1.6rem] bg-surface-2 ${photoIndex === 0 ? `aspect-[4/5] ${pick.photos.length > 1 ? "col-span-2 sm:aspect-[16/11]" : "sm:aspect-[16/11]"}` : "aspect-square"}`}>
                                                <Image src={photo} alt={`${place?.name ?? pick.name}, ${fill(t.guestPage.byLine, { name: guest.name })}`} fill sizes="(min-width: 768px) 46rem, 100vw" className="object-cover" />
                                            </div>
                                        ))}
                                    </div>
                                )}
                                {pick.words && (
                                    <blockquote className="mt-5 border-l-2 border-[#d9bc8c] pl-5">
                                        <p className="nt-serif text-[1.5rem] leading-[1.3] whitespace-pre-line italic">
                                            <Inline text={tidy(pick.words)} />
                                        </p>
                                        <footer className="mt-2 text-[0.875rem] font-semibold text-muted">— {guest.name}</footer>
                                    </blockquote>
                                )}
                                {place ? (
                                    <div className="mt-6 flex gap-2">
                                        <Link href={paths.place(lang, place.slug)} className="nt-btn nt-btn-soft h-12 flex-1 text-[0.875rem]">
                                            <ArrowUpRight size={17} />
                                            {t.blog.openPlace}
                                        </Link>
                                        <Link href={paths.directions(lang, place.slug)} className="nt-btn nt-btn-primary h-12 flex-1 text-[0.875rem]">
                                            <Navigation size={16} />
                                            {t.blog.directions}
                                        </Link>
                                    </div>
                                ) : (
                                    <p className="mt-5 inline-flex items-center gap-2 rounded-full bg-surface-2 px-4 py-2 text-[0.875rem] font-semibold text-text-2">
                                        <Sparkles size={15} className="text-brand-600" />
                                        {t.guestPage.soon}
                                    </p>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* ---------------- Their notebooks ---------------- */}
            {!preview && guest.notebooks.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                    <p className="nt-eyebrow">{t.guestPage.notebooksEyebrow}</p>
                    <div className="nt-masonry mt-6 columns-2 md:columns-4">
                        {guest.notebooks.map((post) => (
                            <div key={post.id}>
                                <PostCard post={post} locale={lang} />
                            </div>
                        ))}
                    </div>
                </section>
            )}

            {/* ---------------- Their guest book ---------------- */}
            {latest && book && (
                <section className="mx-auto max-w-3xl px-4 pt-20 md:px-6 md:pt-28">
                    <p className="nt-eyebrow">{signed ? fill(signed === 1 ? t.comments.countOne : t.comments.countMany, { count: signed }) : t.guestPage.wordsEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[2.75rem]">{fill(t.guestPage.wordsTitle, { name: guest.name })}</h2>
                    <p className="mt-3 mb-7 max-w-2xl text-[1rem] leading-relaxed text-text-2">{signed ? t.guestPage.wordsLead : fill(t.guestPage.wordsEmpty, { name: guest.name })}</p>
                    <Talk target="article" ids={guest.notebooks.map((post) => post.id)} postTo={latest.id} initial={book} />
                </section>
            )}

            {/* ---------------- The other guests ---------------- */}
            {others.length > 0 && (
                <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                    <p className="nt-eyebrow">{t.guestPage.othersEyebrow}</p>
                    <ul className="nt-scroll-x mt-6 -mx-4 gap-4 px-4 pb-2 md:mx-0 md:grid md:grid-cols-3 md:px-0">
                        {others.map((other) => (
                            <li key={other.ref} className="w-[68vw] max-w-[18rem] shrink-0 md:w-auto md:max-w-none">
                                <GuestCard guest={other} locale={lang} />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {/* ---------------- And you? ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-20 md:px-6 md:pt-28">
                <Link href={`${paths.guests(lang)}#demande`} className="nt-pressable group relative block overflow-hidden rounded-[2rem] bg-[#15110e] p-7 text-[#faf7f2] md:p-12">
                    <span className="pointer-events-none absolute inset-2.5 rounded-[1.6rem] border border-[#d9bc8c]/35" aria-hidden />
                    <span className="relative block text-[0.75rem] font-semibold tracking-[0.3em] text-[#d9bc8c] uppercase">{t.guestPage.joinEyebrow}</span>
                    <span className="nt-serif relative mt-3 block max-w-[16ch] text-[2.25rem] leading-[1.02] md:text-[3.5rem]">{t.guestPage.joinTitle}</span>
                    <span className="relative mt-4 block max-w-xl text-[1rem] leading-relaxed text-[#faf7f2]/75">{tidy(t.guestPage.joinBody)}</span>
                    <span className="relative mt-7 inline-flex min-h-12 items-center gap-2 rounded-full bg-[#faf7f2] px-6 text-[1rem] font-bold text-[#15110e]">
                        {t.guestPage.joinCta}
                        <ArrowRight size={17} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                </Link>
            </section>
        </div>
    );
}
