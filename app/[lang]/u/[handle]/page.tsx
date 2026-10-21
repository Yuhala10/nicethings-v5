import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Heart, MapPin, Play } from "lucide-react";
import PinCard from "@/components/place/PinCard";
import { RatingChip, displayName } from "@/components/people/Person";
import OutingList from "@/components/people/OutingList";
import ProfileActions from "@/components/people/ProfileActions";
import ProfileHeader from "@/components/people/ProfileHeader";
import BackButton from "@/components/site/BackButton";
import { cityBySlug } from "@/lib/cities";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { formatPrice, formatRelativeDays } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import { personShareImage } from "@/lib/people/card";
import { cardVersion } from "@/lib/people/card-version";
import { getProfilePage } from "@/lib/people/pages";
import { normalizeHandle } from "@/lib/people/rules";

// Someone's page: who they are, their top 3, their reviews and their photos.
// Built on first visit, then kept two minutes (or until they change it).

export const revalidate = 120;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; handle: string }> };

async function load(raw: string) {
    const handle = normalizeHandle(decodeURIComponent(raw));
    return handle ? await getProfilePage(handle).catch(() => null) : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, handle } = await params;
    if (!isLocale(lang)) return {};
    const page = await load(handle);
    if (!page) return { robots: { index: false } };
    const words = getDictionary(lang).people;
    const title = fill(words.profile.metaTitle, { name: displayName(page.person), handle: page.person.handle });
    const description = fill(words.profile.metaDescription, {
        level: words.levels[page.person.level],
        reviews: page.stats.reviews,
        area: [page.person.area, cityBySlug(page.person.city)?.name].filter(Boolean).join(", ") || "Cameroun",
    });
    return {
        title,
        description,
        alternates: { canonical: paths.person(lang, page.person.handle) },
        openGraph: { type: "profile", title, description, url: paths.person(lang, page.person.handle), images: [personShareImage(page, lang)] },
        twitter: { card: "summary_large_image", images: [personShareImage(page, lang).url] },
        // A profile with nothing written yet is not worth a search result.
        robots: page.stats.reviews > 0 ? undefined : { index: false, follow: true },
    };
}

export default async function PersonPage({ params }: Props) {
    const { lang, handle } = await params;
    if (!isLocale(lang)) notFound();
    const page = await load(handle);
    if (!page) notFound();
    const t = getDictionary(lang);
    const words = t.people;
    const { person } = page;

    return (
        <div className="mx-auto max-w-3xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-24 md:px-6 md:pt-8">
            <BackButton className="mb-4 border border-line !bg-surface !shadow-none !backdrop-blur-none" />

            <ProfileHeader person={person} bio={page.bio} createdAt={page.createdAt} stats={page.stats} series={page.series} locale={lang}>
                <ProfileActions id={person.id} handle={person.handle} name={displayName(person)} version={cardVersion(page)} />
            </ProfileHeader>

            {page.top.length > 0 && (
                <section className="mt-12">
                    <h2 className="nt-section-title mb-5">{words.profile.top}</h2>
                    <ul className="nt-rail -mx-4 md:mx-0 md:grid md:grid-cols-3 md:gap-4 md:px-0">
                        {page.top.map((place, index) => (
                            <li key={place.slug} className="relative">
                                <span className="nt-serif absolute -top-3 left-2 z-10 text-[2.75rem] leading-none text-brand-600 drop-shadow">{index + 1}</span>
                                <PinCard place={place} shape="portrait" />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="mt-12">
                <h2 className="nt-section-title mb-5">{words.outing.theirs}</h2>
                <OutingList source={{ handle: person.handle }} grid empty={<p className="text-[1rem] text-muted">{words.outing.none}</p>} />
            </section>

            <section className="mt-12">
                <h2 className="nt-section-title mb-5">
                    {words.profile.reviews} · {page.reviews.length}
                </h2>
                {page.reviews.length ? (
                    <ul className="flex flex-col gap-3">
                        {page.reviews.map((review) => (
                            <li key={review.id} className="rounded-[1.25rem] border border-line bg-surface p-4">
                                <Link href={`${paths.place(lang, review.place.slug)}#avis`} className="group flex items-center gap-2">
                                    <MapPin size={15} className="shrink-0 text-brand-600" />
                                    <span className="min-w-0 truncate text-[1rem] font-semibold group-hover:underline">{review.place.name}</span>
                                    {review.place.neighborhood && <span className="shrink-0 text-[0.75rem] text-muted">{review.place.neighborhood}</span>}
                                </Link>
                                <div className="mt-2.5 flex flex-wrap items-center gap-2">
                                    <RatingChip rating={review.rating} locale={lang} />
                                    {review.tags.slice(0, 4).map((tag) => (
                                        <span key={tag} className="inline-flex h-7 items-center rounded-full border border-line-strong px-2.5 text-[0.75rem] font-semibold text-text-2">
                                            {words.tags[tag as keyof typeof words.tags]}
                                        </span>
                                    ))}
                                </div>
                                {review.body && <p className="mt-2.5 text-[1rem] leading-[1.65] whitespace-pre-line text-text-2">{review.body}</p>}
                                <p className="mt-2 text-[0.75rem] text-muted">
                                    {[
                                        formatRelativeDays(review.createdAt, lang),
                                        review.pricePaid ? fill(words.reviews.paidLabel, { price: formatPrice(review.pricePaid, lang) }) : null,
                                        review.company ? words.companies[review.company as keyof typeof words.companies] : null,
                                        review.helpful ? `${review.helpful} ${words.reviews.helpful.toLowerCase()}` : null,
                                    ]
                                        .filter(Boolean)
                                        .join(" · ")}
                                </p>
                            </li>
                        ))}
                    </ul>
                ) : (
                    <p className="text-[1rem] text-muted">{words.profile.empty}</p>
                )}
            </section>

            {page.photos.length > 0 && (
                <section className="mt-12">
                    <h2 className="nt-section-title mb-5">
                        {words.profile.photos} · {page.photos.length}
                    </h2>
                    <ul className="grid grid-cols-2 gap-3 md:grid-cols-3 md:gap-4">
                        {page.photos.map((photo) => (
                            <li key={photo.id} className="rounded-[1.35rem] border border-line bg-surface p-1.5 shadow-[var(--nt-shadow)]">
                                <Link href={paths.place(lang, photo.place.slug)} className="group relative block aspect-[4/5] overflow-hidden rounded-[1rem] bg-surface-2">
                                    { }
                                    <img src={photo.poster ?? photo.url} alt={photo.caption ?? photo.place.name} loading="lazy" decoding="async" className="h-full w-full object-cover transition duration-500 group-hover:scale-[1.04]" />
                                    <span className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/70 to-transparent px-2 pt-6 pb-1.5 text-[0.75rem] font-semibold text-white">
                                        <span className="block truncate">{photo.place.name}</span>
                                    </span>
                                    {photo.kind === "video" && <Play size={14} fill="currentColor" className="absolute top-2 left-2 text-white" />}
                                    {photo.likes > 0 && (
                                        <span className="absolute top-2 right-2 inline-flex items-center gap-1 rounded-full bg-black/45 px-2 py-0.5 text-[0.75rem] font-semibold text-white">
                                            <Heart size={11} className="fill-white" />
                                            {photo.likes}
                                        </span>
                                    )}
                                </Link>
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </div>
    );
}
