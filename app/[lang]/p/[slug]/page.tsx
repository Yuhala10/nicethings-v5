import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import VerifiedTick from "@/components/place/VerifiedTick";
import { AtSign, ChevronRight, Clock3, Database, ExternalLink, Globe, MapPin, Navigation, Phone, Sparkles, Store, Users, Wallet, type LucideIcon } from "lucide-react";
import BackButton from "@/components/site/BackButton";
import HoursTable from "@/components/place/HoursTable";
import PostCard from "@/components/blog/PostCard";
import PlaceActions from "@/components/place/PlaceActions";
import PinCard from "@/components/place/PinCard";
import PlaceMap from "@/components/place/PlaceMap";
import ReportButton from "@/components/place/ReportButton";
import { OpenBadge, PlaceThumb, PriceLabel, Rating } from "@/components/place/bits";
import { HeroActions, StickyPlaceBar } from "@/components/place/PlaceHeroBits";
import { getPostsForPlace } from "@/lib/blog/server";
import { DEFAULT_CITY, cityBySlug } from "@/lib/cities";
import { SITE_URL, fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { formatPrice, formatRelativeDays, formatTime } from "@/lib/i18n/format";
import { SCHEMA_TYPES, categoryStyle, cuisineLabel, firstPhone, formatPhone, isIndexable, knownFacts, posterInk } from "@/lib/places/display";
import { availableCollections } from "@/lib/places/collections";
import { distanceMeters } from "@/lib/places/geo";
import { CATEGORY_PLURALS, paths } from "@/lib/places/paths";
import { getAllPlaces, getPlace } from "@/lib/places/server";
import { placeShareImage } from "@/lib/share-image";
import type { PlaceDetail } from "@/lib/places/types";
import { AMENITIES, CATEGORIES, GOOD_FOR, VIBES, tagLabel } from "@/lib/tags";

export const revalidate = 300;

// Open datasets places can come from (scripts/import_open_places.py).
const OPEN_DATA: Record<string, string> = { overture: "Overture Maps", foursquare: "Foursquare" };
export const dynamicParams = true;

// Pages are built on first visit, then served from cache.
export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; slug: string }> };

// "Bastos, Yaoundé" — or just the city when the neighbourhood is unknown.
function placeArea(place: PlaceDetail) {
    const city = (cityBySlug(place.city) ?? DEFAULT_CITY).name;
    return place.neighborhood ? `${place.neighborhood}, ${city}` : city;
}

function describe(place: PlaceDetail, locale: Locale) {
    const t = getDictionary(locale);
    if (place.description) return place.description.slice(0, 158);
    return fill(t.spot.descriptionFallback, {
        name: place.name,
        category: tagLabel(CATEGORIES, place.category, locale),
        area: placeArea(place),
    });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, slug } = await params;
    if (!isLocale(lang)) return {};
    const place = await getPlace(slug);
    if (!place) return {};
    const t = getDictionary(lang);
    const category = tagLabel(CATEGORIES, place.category, lang);
    const title = `${place.name} · ${fill(t.spot.placeIn, { category, area: placeArea(place) })}`;

    return {
        title,
        description: describe(place, lang),
        alternates: {
            canonical: paths.place(lang, slug),
            languages: { fr: paths.place("fr", slug), en: paths.place("en", slug), "x-default": paths.place("fr", slug) },
        },
        openGraph: { type: "website", title, description: describe(place, lang), url: paths.place(lang, slug), images: [placeShareImage(place, lang)] },
        twitter: { card: "summary_large_image", images: [placeShareImage(place, lang).url] },
        robots: isIndexable(place) ? undefined : { index: false, follow: true },
    };
}

function jsonLd(place: PlaceDetail, locale: Locale, phone: string | null, cityName: string) {
    const t = getDictionary(locale);
    const url = `${SITE_URL}${paths.place(locale, place.slug)}`;
    const days = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];
    const business: Record<string, unknown> = {
        "@context": "https://schema.org",
        "@type": SCHEMA_TYPES[place.category] ?? "LocalBusiness",
        name: place.name,
        url,
        geo: { "@type": "GeoCoordinates", latitude: place.lat, longitude: place.lng },
        address: {
            "@type": "PostalAddress",
            streetAddress: place.address ?? undefined,
            addressLocality: cityName,
            addressRegion: place.neighborhood ?? undefined,
            addressCountry: "CM",
        },
        telephone: phone ?? undefined,
        image: place.photos.map((photo) => photo.url),
        servesCuisine: place.cuisine ?? undefined,
        priceRange: place.priceMin ? `${formatPrice(place.priceMin, locale)}+` : undefined,
        sameAs: [place.website, place.instagram].filter(Boolean),
    };
    if (place.hours.opens && place.hours.closes) {
        business.openingHoursSpecification = {
            "@type": "OpeningHoursSpecification",
            dayOfWeek: place.hours.days.map((day) => `https://schema.org/${days[["monday", "tuesday", "wednesday", "thursday", "friday", "saturday", "sunday"].indexOf(day)]}`),
            opens: place.hours.opens,
            closes: place.hours.closes,
        };
    }
    if (place.reviewCount > 0) {
        business.aggregateRating = { "@type": "AggregateRating", ratingValue: place.rating, reviewCount: place.reviewCount };
    }

    const crumbs = [
        { name: cityName, url: `${SITE_URL}${paths.city(locale, place.city)}` },
        place.neighborhood && { name: place.neighborhood, url: `${SITE_URL}${paths.neighborhood(locale, place.city, place.neighborhood)}` },
        { name: place.name, url },
    ].filter(Boolean) as { name: string; url: string }[];

    const breadcrumb = {
        "@context": "https://schema.org",
        "@type": "BreadcrumbList",
        itemListElement: crumbs.map((crumb, index) => ({
            "@type": "ListItem",
            position: index + 1,
            name: crumb.name,
            item: crumb.url,
        })),
    };
    return [business, breadcrumb];
}

// One editorial block of the place page: a small caps label over a hairline.
function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mt-10 border-t border-line pt-6">
            <h2 className="nt-eyebrow mb-4">{title}</h2>
            {children}
        </section>
    );
}

// One fact in the practical-info card: icon, label, value; tappable when
// it leads somewhere (call, website).
function InfoRow({
    icon: Icon,
    label,
    href,
    external = false,
    children,
}: {
    icon: LucideIcon;
    label: string;
    href?: string;
    external?: boolean;
    children: React.ReactNode;
}) {
    const content = (
        <>
            <Icon size={18} strokeWidth={1.8} className="mt-0.5 shrink-0 text-muted" />
            <span className="min-w-0 flex-1 text-[0.92rem]">
                <span className="mb-0.5 block text-[0.78rem] text-muted">{label}</span>
                {children}
            </span>
            {href && <ChevronRight size={17} className="mt-3 shrink-0 text-muted" />}
        </>
    );
    const className = "flex items-start gap-3.5 py-4";
    if (!href) return <div className={className}>{content}</div>;
    return (
        <a href={href} className={`${className} transition-opacity hover:opacity-75`} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
            {content}
        </a>
    );
}

function TagList({ values, vocabulary, locale }: { values: string[]; vocabulary: Parameters<typeof tagLabel>[0]; locale: Locale }) {
    return (
        <ul className="flex flex-wrap gap-2">
            {values.map((value) => (
                <li key={value} className="rounded-full border border-line-strong px-3.5 py-1.5 text-[0.88rem] font-medium text-text-2">
                    {tagLabel(vocabulary, value, locale)}
                </li>
            ))}
        </ul>
    );
}

// A description in two parts: its opening line (shown under the name) and
// the rest ("Why go"). One-line descriptions stay whole under "Why go".
function splitDescription(description: string | null) {
    if (!description) return { lead: null, rest: null };
    const parts = description.trim().split(/(?<=[.!?])\s+|\n+/);
    const lead = parts[0]?.trim() ?? "";
    const rest = description.trim().slice(description.trim().indexOf(lead) + lead.length).trim();
    if (!rest || lead.length > 170) return { lead: null, rest: description.trim() };
    return { lead, rest };
}

// The line under the name: the place's own opening words when it has
// some, otherwise plain facts we know (what, where, when). Never invented.
function tagline(place: PlaceDetail, locale: Locale, cityName: string) {
    const t = getDictionary(locale);
    const { lead } = splitDescription(place.description);
    if (lead) return lead;
    const kind = (place.category === "Restaurant" && cuisineLabel(place.cuisine, locale, 1)) || tagLabel(CATEGORIES, place.category, locale);
    const parts = [fill(t.spot.taglineIn, { kind, area: [place.neighborhood, cityName].filter(Boolean).join(", ") })];
    const { opens, closes, days } = place.hours;
    if (opens && closes && days.length) {
        parts.push(
            opens === "00:00" && (closes === "00:00" || closes >= "23:59")
                ? t.spot.taglineAllDay
                : fill(t.spot.taglineHours, {
                      opens: formatTime(opens, locale),
                      closes: formatTime(closes, locale),
                      days: days.length === 7 ? t.spot.daily : "",
                  })
        );
    }
    return parts.join(" ");
}

export default async function PlacePage({ params }: Props) {
    const { lang, slug } = await params;
    if (!isLocale(lang)) notFound();
    const place = await getPlace(slug);
    if (!place) notFound();

    const t = getDictionary(lang);
    const category = tagLabel(CATEGORIES, place.category, lang);
    const phone = firstPhone(place.phone);
    const whatsapp = firstPhone(place.whatsapp);
    const preview = placeShareImage(place, lang).url;
    const area = place.neighborhood;
    const cityName = (cityBySlug(place.city) ?? DEFAULT_CITY).name;
    const style = categoryStyle(place.category);
    const kind = (place.category === "Restaurant" && cuisineLabel(place.cuisine, lang, 3)) || category;

    // Nearby and similar places come from the cached catalogue.
    const all = await getAllPlaces();
    const others = all
        .filter((item) => item.id !== place.id)
        .map((item) => ({ place: item, distance: distanceMeters(place, item) }));
    const nearby = others
        .filter(({ distance }) => distance < 1500)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 8);
    const nearbyIds = new Set(nearby.map(({ place: item }) => item.id));
    const similar = others
        .filter(({ place: item, distance }) => item.category === place.category && distance < 5000 && !nearbyIds.has(item.id))
        .sort((a, b) => knownFacts(b.place) - knownFacts(a.place) || a.distance - b.distance)
        .slice(0, 8);

    // The city's editorial collections this place belongs to.
    const collections = availableCollections(all.filter((item) => item.city === place.city))
        .map(({ collection }) => collection)
        .filter((collection) => collection.test(place));

    const about = splitDescription(place.description).rest;
    const articles = await getPostsForPlace(place.slug);
    const hasHours = Boolean(place.hours.opens && place.hours.closes);
    const hasPrice = Boolean(place.priceMin || place.priceMax);
    const updatedAgo = formatRelativeDays(place.updatedAt, lang);
    const nameSize =
        place.name.length > 26 ? "text-[1.95rem] md:text-[3rem]" : place.name.length > 16 ? "text-[2.35rem] md:text-[3.8rem]" : "text-[2.8rem] md:text-[4.4rem]";

    return (
        <article className="pb-4">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(place, lang, phone, cityName)).replace(/</g, "\\u003c") }}
            />
            <StickyPlaceBar slug={place.slug} name={place.name} />

            {/* Top bar: back, share, keep. */}
            <div className="mx-auto flex max-w-3xl items-center justify-between px-4 pt-[max(env(safe-area-inset-top),0.75rem)] md:px-6 md:pt-8">
                <BackButton className="border border-line !bg-surface !shadow-none !backdrop-blur-none" />
                <HeroActions slug={place.slug} name={place.name} preview={preview} />
            </div>

            {/* Name, place in the city, the line that sums it up. */}
            <header className="mx-auto max-w-3xl px-4 pt-7 md:px-6 md:pt-10">
                <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-[0.8rem] text-muted">
                    <Link href={paths.city(lang, place.city)} className="transition-colors hover:text-text">
                        {cityName}
                    </Link>
                    {area && (
                        <>
                            <ChevronRight size={13} className="opacity-60" />
                            <Link href={paths.neighborhood(lang, place.city, area)} className="transition-colors hover:text-text">
                                {area}
                            </Link>
                            <ChevronRight size={13} className="opacity-60" />
                            <Link href={paths.neighborhoodCategory(lang, place.city, area, place.category)} className="transition-colors hover:text-text">
                                {CATEGORY_PLURALS[place.category as keyof typeof CATEGORY_PLURALS]?.[lang] ?? category}
                            </Link>
                        </>
                    )}
                </nav>
                {/* One line: a long name ends with "…", the tick always stays beside it. */}
                <h1 title={place.name} className={`nt-serif flex min-w-0 items-center gap-2.5 leading-[1.05] md:gap-3 ${nameSize}`}>
                    <span className="min-w-0 truncate pb-[0.08em]">{place.name}</span>
                    {place.verified && <VerifiedTick size={26} className="md:h-9 md:w-9" label={t.trust.verifiedTitle} />}
                </h1>
                <p className="mt-3 max-w-2xl text-[1.04rem] leading-relaxed text-text-2">{tagline(place, lang, cityName)}</p>
                <div className="mt-4 flex flex-wrap items-center gap-x-5 gap-y-2 [&>*:empty]:hidden">
                    <OpenBadge hours={place.hours} />
                    {hasPrice && <PriceLabel min={place.priceMin} max={place.priceMax} className="text-[0.85rem]" />}
                    {place.reviewCount > 0 && <Rating rating={place.rating} count={place.reviewCount} />}
                </div>
            </header>

            {/* The picture, or the place's printed poster. */}
            <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6 md:pt-8">
                <ViewTransition name={`place-${place.slug}`}>
                    {place.photos.length > 0 ? (
                        <div className="relative aspect-[4/3] overflow-hidden rounded-[1.25rem] bg-surface-2 md:aspect-[16/10]">
                            <PlaceThumb
                                cover={place.photos[0].url}
                                category={place.category}
                                name={place.photos[0].alt ?? place.name}
                                sizes="(min-width: 768px) 720px, 100vw"
                                priority
                                className="h-full w-full"
                            />
                            {place.photos.length > 1 && (
                                <span className="absolute right-3 bottom-3 rounded-full bg-black/50 px-2.5 py-1 text-[0.72rem] font-semibold text-white backdrop-blur-md">
                                    1 / {place.photos.length}
                                </span>
                            )}
                        </div>
                    ) : (
                        <div
                            className="nt-poster relative aspect-[2/1] overflow-hidden rounded-[1.25rem] md:aspect-[5/2]"
                            style={{ "--poster": `linear-gradient(165deg, color-mix(in oklab, ${posterInk(place.slug)} 84%, #f6efe4) 0%, ${posterInk(place.slug)} 75%)` } as React.CSSProperties}
                            aria-hidden
                        >
                            <style.icon size={240} strokeWidth={0.8} className="absolute -right-10 -bottom-14 rotate-[-10deg] opacity-[0.13]" />
                            <div className="absolute bottom-0 left-0 p-5 md:p-7">
                                <p className="text-[0.66rem] font-semibold tracking-[0.16em] text-[#f6efe4]/65 uppercase">{kind}</p>
                                <p className="nt-serif mt-1 text-[1.9rem] italic md:text-[2.6rem]">{area ?? cityName}</p>
                            </div>
                        </div>
                    )}
                </ViewTransition>
            </div>

            <div className="mx-auto max-w-3xl px-4 pt-6 md:px-6">
                <PlaceActions slug={place.slug} name={place.name} phone={phone} whatsapp={whatsapp} preview={preview} />

                {place.vibes.length > 0 && (
                    <Section title={t.spot.vibes}>
                        <p className="nt-serif text-[1.9rem] leading-tight text-text md:text-[2.3rem]">
                            {place.vibes.map((value) => tagLabel(VIBES, value, lang)).join(" · ")}
                        </p>
                    </Section>
                )}

                {place.goodFor.length > 0 && (
                    <Section title={t.spot.goodFor}>
                        <TagList values={place.goodFor} vocabulary={GOOD_FOR} locale={lang} />
                    </Section>
                )}

                {about && (
                    <Section title={t.spot.about}>
                        <p className="text-[1.04rem] leading-[1.75] whitespace-pre-line text-text-2">{about}</p>
                    </Section>
                )}

                {/* Practical info: one fact per row. */}
                <Section title={t.spot.practical}>
                    <div className="-my-4 divide-y divide-line">
                        <InfoRow icon={Clock3} label={t.spot.hours}>
                            {hasHours ? (
                                <HoursTable hours={place.hours} />
                            ) : (
                                <div className="flex flex-col gap-1">
                                    <span className="text-muted">{t.spot.hoursUnknown}</span>
                                    <ReportButton
                                        slug={place.slug}
                                        initialReason="hours"
                                        label={t.spot.hoursHelp}
                                        className="inline-flex w-fit items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
                                    />
                                </div>
                            )}
                        </InfoRow>
                        <InfoRow icon={Wallet} label={t.spot.price}>
                            <PriceLabel min={place.priceMin} max={place.priceMax} showUnknown />
                        </InfoRow>
                        <InfoRow icon={MapPin} label={t.spot.address}>
                            <span className="text-text">{[place.address, area, cityName].filter(Boolean).join(", ")}</span>
                            {place.landmark && (
                                <span className="mt-1 block text-muted">
                                    {t.spot.howToFind} : {place.landmark}
                                </span>
                            )}
                        </InfoRow>
                        {phone && (
                            <InfoRow icon={Phone} label={t.spot.call} href={`tel:${phone}`}>
                                <span className="font-semibold text-text">{formatPhone(phone)}</span>
                            </InfoRow>
                        )}
                        {place.website && (
                            <InfoRow
                                icon={Globe}
                                label={t.spot.website}
                                href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
                                external
                            >
                                <span className="font-semibold text-text">{place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}</span>
                            </InfoRow>
                        )}
                        {place.instagram && (
                            <InfoRow
                                icon={AtSign}
                                label={t.spot.instagram}
                                href={`https://instagram.com/${place.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`}
                                external
                            >
                                <span className="font-semibold text-text">@{place.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "").replace(/\/$/, "")}</span>
                            </InfoRow>
                        )}
                        {place.amenities.length > 0 && (
                            <InfoRow icon={Sparkles} label={t.spot.amenities}>
                                <span className="text-text">{place.amenities.map((value) => tagLabel(AMENITIES, value, lang)).join(" · ")}</span>
                            </InfoRow>
                        )}
                    </div>
                </Section>

                {/* The map comes after the decision: where it is, then go. */}
                <Section title={t.spot.onMap}>
                    <div className="relative h-64 overflow-hidden rounded-[1.25rem] border border-line md:h-72">
                        <PlaceMap id={place.id} lat={place.lat} lng={place.lng} category={place.category} className="absolute inset-0" />
                        <Link href={paths.directions(lang, place.slug)} className="nt-btn nt-btn-primary absolute right-3 bottom-3 h-11 px-4 text-sm">
                            <Navigation size={16} />
                            {t.spot.directions}
                        </Link>
                    </div>
                </Section>

                {place.menu.length > 0 && (
                    <Section title={t.spot.menu}>
                        <ul className="divide-y divide-line">
                            {place.menu.map((item) => (
                                <li key={item.name} className="flex justify-between gap-4 py-3 text-[0.92rem]">
                                    <span>
                                        <span className="font-semibold">{item.name}</span>
                                        {item.popular && (
                                            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[0.7rem] font-semibold text-brand-700 dark:bg-brand-700/25 dark:text-brand-200">
                                                {t.spot.popular}
                                            </span>
                                        )}
                                        {item.description && <span className="block text-muted">{item.description}</span>}
                                    </span>
                                    <span className="shrink-0 font-semibold">{formatPrice(item.price, lang)}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {place.reviews.length > 0 && (
                    <Section title={`${t.reviews.title} · ${place.reviewCount}`}>
                        <ul className="flex flex-col gap-3">
                            {place.reviews
                                .filter((review) => review.comment)
                                .map((review) => (
                                    <li key={review.id} className="rounded-[1.1rem] bg-surface-2 p-4 text-[0.92rem]">
                                        <div className="mb-1 flex justify-between text-xs font-semibold">
                                            <span>{"★".repeat(review.rating)}</span>
                                            <span className="text-muted">{formatRelativeDays(review.createdAt, lang)}</span>
                                        </div>
                                        <p className="text-text-2">{review.comment}</p>
                                    </li>
                                ))}
                        </ul>
                    </Section>
                )}

                {collections.length > 0 && (
                    <Section title={t.spot.inCollections}>
                        <ul className="flex flex-wrap gap-2">
                            {collections.map((collection) => (
                                <li key={collection.key}>
                                    <Link href={paths.collection(lang, place.city, collection)} className="nt-chip">
                                        {fill(collection.title[lang], { city: cityName })}
                                        <ChevronRight size={14} className="text-muted" />
                                    </Link>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {/* Where this information comes from, said plainly. */}
                <section className="mt-10 rounded-[1.25rem] bg-surface-2 p-5">
                    <div className="mb-1.5 flex items-center gap-2 font-semibold">
                        {place.verified ? (
                            <VerifiedTick size={20} />
                        ) : place.source === "submission" ? (
                            <Users size={18} className="text-muted" />
                        ) : (
                            <Database size={18} className="text-muted" />
                        )}
                        {place.verified
                            ? t.trust.verifiedTitle
                            : place.source === "osm"
                              ? t.trust.osmTitle
                              : place.source === "submission"
                                ? t.trust.submissionTitle
                                : OPEN_DATA[place.source]
                                  ? fill(t.trust.openDataTitle, { source: OPEN_DATA[place.source] })
                                  : t.trust.unverified}
                    </div>
                    <p className="text-sm leading-relaxed text-text-2">
                        {place.verified
                            ? fill(t.trust.verifiedBody, {
                                  ago: formatRelativeDays(place.lastVerifiedAt ?? place.updatedAt, lang),
                              })
                            : place.source === "osm"
                              ? t.trust.osmBody
                              : place.source === "submission"
                                ? t.trust.submissionBody
                                : OPEN_DATA[place.source]
                                  ? fill(t.trust.openDataBody, { source: OPEN_DATA[place.source] })
                                  : t.trust.helpUs}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                        <ReportButton
                            slug={place.slug}
                            label={t.trust.suggestEdit}
                            className="inline-flex items-center gap-1.5 text-sm font-semibold text-brand-600 hover:underline"
                        />
                        {place.source === "osm" && place.sourceRef && (
                            <a
                                href={`https://www.openstreetmap.org/${place.sourceRef}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="inline-flex items-center gap-1 text-sm text-muted hover:text-text"
                            >
                                {t.trust.viewSource}
                                <ExternalLink size={13} />
                            </a>
                        )}
                    </div>
                    <p className="mt-3 text-xs text-muted">{fill(t.trust.updated, { ago: updatedAgo })}</p>
                </section>

                {/* Owners claim their listing from here (or it shows they already do). */}
                {place.claimed ? (
                    <p className="mt-3 flex items-center gap-2 rounded-[1.1rem] bg-open/10 px-4 py-3 text-sm font-semibold text-open">
                        <Store size={17} />
                        {t.pro.managed}
                    </p>
                ) : (
                    <Link
                        href={paths.claim(lang, place.slug)}
                        className="group mt-3 flex items-center gap-4 rounded-[1.25rem] border border-dashed border-line-strong p-4 transition hover:border-text-2"
                        rel="nofollow"
                    >
                        <Store size={20} strokeWidth={1.7} className="shrink-0 text-brand-600" />
                        <span className="min-w-0 flex-1">
                            <span className="block font-semibold">{t.pro.claimCta}</span>
                            <span className="block text-sm text-muted">{t.pro.claimCtaBody}</span>
                        </span>
                        <ChevronRight size={19} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-text" />
                    </Link>
                )}

                {articles.length > 0 && (
                    <section className="mt-14">
                        <h2 className="nt-section-title mb-5">{t.blog.inArticles}</h2>
                        <div className="nt-scroll-x -mx-4 gap-4 px-4 md:mx-0 md:px-0">
                            {articles.map((post) => (
                                <div key={post.id} className="w-[13.5rem] shrink-0">
                                    <PostCard post={post} locale={lang} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}
            </div>

            {nearby.length > 0 && (
                <section className="mx-auto mt-14 max-w-3xl md:px-6">
                    <h2 className="nt-section-title mb-5 px-4 md:px-0">{t.spot.nearby}</h2>
                    <ul className="nt-rail">
                        {nearby.map(({ place: item, distance }) => (
                            <li key={item.id}>
                                <PinCard place={item} distance={distance} shape="portrait" />
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            {similar.length > 0 && (
                <section className="mx-auto mt-14 max-w-3xl md:px-6">
                    <h2 className="nt-section-title mb-5 px-4 md:px-0">{t.spot.similar}</h2>
                    <ul className="nt-rail">
                        {similar.map(({ place: item }) => (
                            <li key={item.id}>
                                <PinCard place={item} shape="portrait" />
                            </li>
                        ))}
                    </ul>
                </section>
            )}
        </article>
    );
}
