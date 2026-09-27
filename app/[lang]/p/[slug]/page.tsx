import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { BadgeCheck, ChevronRight, Database, ExternalLink, Globe, MapPin, Users } from "lucide-react";
import BackButton from "@/components/site/BackButton";
import HoursTable from "@/components/place/HoursTable";
import PlaceActions from "@/components/place/PlaceActions";
import PlaceCard from "@/components/place/PlaceCard";
import PlaceMap from "@/components/place/PlaceMap";
import ReportButton from "@/components/place/ReportButton";
import { PlaceThumb, PriceLabel, Rating } from "@/components/place/bits";
import { SITE_URL, fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { formatPrice, formatRelativeDays } from "@/lib/i18n/format";
import { SCHEMA_TYPES, cuisineLabel, firstPhone, formatPhone, isIndexable, knownFacts } from "@/lib/places/display";
import { distanceMeters } from "@/lib/places/geo";
import { CATEGORY_PLURALS, paths } from "@/lib/places/paths";
import { getAllPlaces, getPlace } from "@/lib/places/server";
import type { PlaceDetail } from "@/lib/places/types";
import { AMENITIES, CATEGORIES, GOOD_FOR, VIBES, tagLabel } from "@/lib/tags";

export const revalidate = 300;
export const dynamicParams = true;

// Pages are built on first visit, then served from cache.
export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; slug: string }> };

function describe(place: PlaceDetail, locale: Locale) {
    const t = getDictionary(locale);
    if (place.description) return place.description.slice(0, 158);
    return fill(t.spot.descriptionFallback, {
        name: place.name,
        category: tagLabel(CATEGORIES, place.category, locale),
        area: place.neighborhood ?? "Yaoundé",
    });
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, slug } = await params;
    if (!isLocale(lang)) return {};
    const place = await getPlace(slug);
    if (!place) return {};
    const t = getDictionary(lang);
    const category = tagLabel(CATEGORIES, place.category, lang);
    const title = `${place.name} · ${fill(t.spot.placeIn, { category, area: place.neighborhood ?? "Yaoundé" })}`;

    return {
        title,
        description: describe(place, lang),
        alternates: {
            canonical: paths.place(lang, slug),
            languages: { fr: paths.place("fr", slug), en: paths.place("en", slug), "x-default": paths.place("fr", slug) },
        },
        openGraph: { type: "website", title, description: describe(place, lang), url: paths.place(lang, slug) },
        robots: isIndexable(place) ? undefined : { index: false, follow: true },
    };
}

function jsonLd(place: PlaceDetail, locale: Locale, phone: string | null) {
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
            addressLocality: "Yaoundé",
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
        { name: t.city.title, url: `${SITE_URL}${paths.city(locale)}` },
        place.neighborhood && { name: place.neighborhood, url: `${SITE_URL}${paths.neighborhood(locale, place.neighborhood)}` },
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="border-t border-line py-6">
            <h2 className="nt-section-title mb-3">{title}</h2>
            {children}
        </section>
    );
}

function TagList({ values, vocabulary, locale }: { values: string[]; vocabulary: Parameters<typeof tagLabel>[0]; locale: Locale }) {
    return (
        <ul className="flex flex-wrap gap-2">
            {values.map((value) => (
                <li key={value} className="rounded-full bg-surface-2 px-3 py-1.5 text-sm font-semibold text-text-2">
                    {tagLabel(vocabulary, value, locale)}
                </li>
            ))}
        </ul>
    );
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
    const area = place.neighborhood;

    // Nearby and similar places come from the cached catalogue.
    const all = await getAllPlaces();
    const others = all
        .filter((item) => item.id !== place.id)
        .map((item) => ({ place: item, distance: distanceMeters(place, item) }));
    const nearby = others
        .filter(({ distance }) => distance < 1500)
        .sort((a, b) => a.distance - b.distance)
        .slice(0, 10);
    const nearbyIds = new Set(nearby.map(({ place: item }) => item.id));
    const similar = others
        .filter(({ place: item, distance }) => item.category === place.category && distance < 5000 && !nearbyIds.has(item.id))
        .sort((a, b) => knownFacts(b.place) - knownFacts(a.place) || a.distance - b.distance)
        .slice(0, 10);

    const hasHours = Boolean(place.hours.opens && place.hours.closes);
    const hasPrice = Boolean(place.priceMin || place.priceMax);
    const updatedAgo = formatRelativeDays(place.updatedAt, lang);

    return (
        <article className="mx-auto max-w-3xl md:px-6 md:pt-6">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(place, lang, phone)).replace(/</g, "\\u003c") }}
            />

            {/* Hero: the photo when we have one, otherwise the map — the one
                picture we can always show honestly. */}
            <div className="relative">
                {place.photos.length > 0 ? (
                    <div className="nt-scroll-x snap-x snap-mandatory md:gap-2 md:rounded-[1.5rem]">
                        {place.photos.map((photo, index) => (
                            <PlaceThumb
                                key={photo.url}
                                cover={photo.url}
                                category={place.category}
                                name={photo.alt ?? place.name}
                                sizes="(min-width: 768px) 720px, 100vw"
                                priority={index === 0}
                                className="aspect-[4/3] w-full shrink-0 snap-center md:aspect-[16/9] md:rounded-[1.5rem]"
                            />
                        ))}
                    </div>
                ) : (
                    <div className="relative h-[15rem] overflow-hidden md:h-[18rem] md:rounded-[1.5rem]">
                        <PlaceMap id={place.id} lat={place.lat} lng={place.lng} className="absolute inset-0" />
                    </div>
                )}
                <div className="absolute inset-x-0 top-0 flex justify-between p-3 pt-[max(env(safe-area-inset-top),0.75rem)] md:hidden">
                    <BackButton />
                </div>
            </div>

            <div className="px-4 md:px-0">
                <nav aria-label="Breadcrumb" className="mt-4 flex flex-wrap items-center gap-1 text-[0.8rem] font-semibold text-muted">
                    <Link href={paths.city(lang)} className="hover:text-text">
                        {t.city.title}
                    </Link>
                    {area && (
                        <>
                            <ChevronRight size={13} />
                            <Link href={paths.neighborhood(lang, area)} className="hover:text-text">
                                {area}
                            </Link>
                            <ChevronRight size={13} />
                            <Link href={paths.neighborhoodCategory(lang, area, place.category)} className="hover:text-text">
                                {CATEGORY_PLURALS[place.category as keyof typeof CATEGORY_PLURALS]?.[lang] ?? category}
                            </Link>
                        </>
                    )}
                </nav>

                <header className="mt-2 mb-5">
                    <h1 className="text-[1.75rem] leading-[1.15] font-extrabold md:text-4xl">
                        {place.name}
                        {place.verified && (
                            <BadgeCheck
                                size={24}
                                className="ml-2 inline-block fill-brand-500 align-[-0.1em] text-surface"
                                aria-label={t.trust.verifiedTitle}
                            />
                        )}
                    </h1>
                    <p className="mt-1.5 text-[0.95rem] text-muted">
                        {place.cuisine ? `${category} · ${cuisineLabel(place.cuisine, lang, 3)}` : category}
                        {area ? ` · ${area}` : ""}
                    </p>
                    <div className="mt-3 flex flex-wrap items-center gap-x-4 gap-y-1.5">
                        <Rating rating={place.rating} count={place.reviewCount} />
                        <PriceLabel min={place.priceMin} max={place.priceMax} className="text-sm" />
                    </div>
                </header>

                <PlaceActions slug={place.slug} name={place.name} phone={phone} whatsapp={whatsapp} />

                {place.description && (
                    <Section title={t.spot.about}>
                        <p className="leading-relaxed whitespace-pre-line text-text-2">{place.description}</p>
                    </Section>
                )}

                <Section title={t.spot.details}>
                    <dl className="grid gap-5">
                        <div>
                            <dt className="nt-eyebrow mb-1.5">{t.spot.hours}</dt>
                            <dd>
                                {hasHours ? (
                                    <HoursTable hours={place.hours} />
                                ) : (
                                    <div className="flex flex-wrap items-center justify-between gap-2 text-sm">
                                        <span className="text-muted">{t.spot.hoursUnknown}</span>
                                        <ReportButton
                                            slug={place.slug}
                                            initialReason="hours"
                                            label={t.spot.hoursHelp}
                                            className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline"
                                        />
                                    </div>
                                )}
                            </dd>
                        </div>

                        <div>
                            <dt className="nt-eyebrow mb-1.5">{t.spot.price}</dt>
                            <dd className="text-sm">
                                <PriceLabel min={place.priceMin} max={place.priceMax} showUnknown />
                            </dd>
                        </div>

                        {(place.address || place.landmark || area) && (
                            <div>
                                <dt className="nt-eyebrow mb-1.5">{t.spot.address}</dt>
                                <dd className="flex gap-2 text-sm text-text-2">
                                    <MapPin size={16} className="mt-0.5 shrink-0 text-brand-500" />
                                    <span>
                                        {[place.address, area, "Yaoundé"].filter(Boolean).join(", ")}
                                        {place.landmark && (
                                            <span className="mt-1 block text-muted">
                                                {t.spot.howToFind} : {place.landmark}
                                            </span>
                                        )}
                                    </span>
                                </dd>
                            </div>
                        )}

                        {(phone || place.website || place.instagram) && (
                            <div>
                                <dt className="nt-eyebrow mb-1.5">{t.spot.contact}</dt>
                                <dd className="flex flex-col gap-2 text-sm font-semibold">
                                    {phone && (
                                        <a href={`tel:${phone}`} className="text-text-2 hover:text-brand-600">
                                            {formatPhone(phone)}
                                        </a>
                                    )}
                                    {place.website && (
                                        <a
                                            href={place.website.startsWith("http") ? place.website : `https://${place.website}`}
                                            target="_blank"
                                            rel="noopener noreferrer nofollow"
                                            className="inline-flex items-center gap-1.5 text-text-2 hover:text-brand-600"
                                        >
                                            <Globe size={15} />
                                            {place.website.replace(/^https?:\/\/(www\.)?/, "").replace(/\/$/, "")}
                                        </a>
                                    )}
                                    {place.instagram && (
                                        <a
                                            href={`https://instagram.com/${place.instagram.replace(/^@/, "").replace(/^https?:\/\/(www\.)?instagram\.com\//, "")}`}
                                            target="_blank"
                                            rel="noopener noreferrer nofollow"
                                            className="text-text-2 hover:text-brand-600"
                                        >
                                            {t.spot.instagram}
                                        </a>
                                    )}
                                </dd>
                            </div>
                        )}
                    </dl>
                </Section>

                {place.vibes.length > 0 && (
                    <Section title={t.spot.vibes}>
                        <TagList values={place.vibes} vocabulary={VIBES} locale={lang} />
                    </Section>
                )}
                {place.goodFor.length > 0 && (
                    <Section title={t.spot.goodFor}>
                        <TagList values={place.goodFor} vocabulary={GOOD_FOR} locale={lang} />
                    </Section>
                )}
                {place.amenities.length > 0 && (
                    <Section title={t.spot.amenities}>
                        <TagList values={place.amenities} vocabulary={AMENITIES} locale={lang} />
                    </Section>
                )}

                {place.menu.length > 0 && (
                    <Section title={t.spot.menu}>
                        <ul className="divide-y divide-line">
                            {place.menu.map((item) => (
                                <li key={item.name} className="flex justify-between gap-4 py-2.5 text-sm">
                                    <span>
                                        <span className="font-semibold">{item.name}</span>
                                        {item.popular && (
                                            <span className="ml-2 rounded-full bg-brand-50 px-2 py-0.5 text-[0.7rem] font-bold text-brand-700">
                                                {t.spot.popular}
                                            </span>
                                        )}
                                        {item.description && <span className="block text-muted">{item.description}</span>}
                                    </span>
                                    <span className="shrink-0 font-bold">{formatPrice(item.price, lang)}</span>
                                </li>
                            ))}
                        </ul>
                    </Section>
                )}

                {place.reviews.length > 0 && (
                    <Section title={`${t.reviews.title} · ${place.reviewCount}`}>
                        <ul className="flex flex-col gap-4">
                            {place.reviews
                                .filter((review) => review.comment)
                                .map((review) => (
                                    <li key={review.id} className="rounded-2xl bg-surface-2 p-4 text-sm">
                                        <div className="mb-1 flex justify-between text-xs font-bold">
                                            <span>{"★".repeat(review.rating)}</span>
                                            <span className="text-muted">{formatRelativeDays(review.createdAt, lang)}</span>
                                        </div>
                                        <p className="text-text-2">{review.comment}</p>
                                    </li>
                                ))}
                        </ul>
                    </Section>
                )}

                {/* Where this information comes from, said plainly. */}
                <section className="border-t border-line py-6">
                    <div className="rounded-2xl bg-surface-2 p-4">
                        <div className="mb-1.5 flex items-center gap-2 font-bold">
                            {place.verified ? (
                                <BadgeCheck size={18} className="fill-brand-500 text-surface" />
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
                                    : t.trust.unverified}
                        </div>
                        <p className="text-sm text-text-2">
                            {place.verified
                                ? fill(t.trust.verifiedBody, {
                                      ago: formatRelativeDays(place.lastVerifiedAt ?? place.updatedAt, lang),
                                  })
                                : place.source === "osm"
                                  ? t.trust.osmBody
                                  : place.source === "submission"
                                    ? t.trust.submissionBody
                                    : t.trust.helpUs}
                        </p>
                        <div className="mt-3 flex flex-wrap items-center gap-x-5 gap-y-2">
                            <ReportButton
                                slug={place.slug}
                                label={t.trust.suggestEdit}
                                className="inline-flex items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline"
                            />
                            {place.source === "osm" && place.sourceRef && (
                                <a
                                    href={`https://www.openstreetmap.org/${place.sourceRef}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="inline-flex items-center gap-1 text-sm font-semibold text-muted hover:text-text"
                                >
                                    {t.trust.viewSource}
                                    <ExternalLink size={13} />
                                </a>
                            )}
                        </div>
                        <p className="mt-3 text-xs text-muted">{fill(t.trust.updated, { ago: updatedAgo })}</p>
                    </div>
                </section>

                {place.photos.length > 0 && (
                    <Section title={t.spot.onMap}>
                        <div className="relative h-56 overflow-hidden rounded-2xl">
                            <PlaceMap id={place.id} lat={place.lat} lng={place.lng} className="absolute inset-0" />
                        </div>
                    </Section>
                )}
            </div>

            {nearby.length > 0 && (
                <section className="border-t border-line py-6 md:mx-0">
                    <h2 className="nt-section-title mb-3 px-4 md:px-0">{t.spot.nearby}</h2>
                    <div className="nt-scroll-x gap-3 px-4 md:px-0">
                        {nearby.map(({ place: item, distance }) => (
                            <PlaceCard key={item.id} place={item} distance={distance} />
                        ))}
                    </div>
                </section>
            )}

            {similar.length > 0 && (
                <section className="border-t border-line py-6">
                    <h2 className="nt-section-title mb-3 px-4 md:px-0">{t.spot.similar}</h2>
                    <div className="nt-scroll-x gap-3 px-4 md:px-0">
                        {similar.map(({ place: item }) => (
                            <PlaceCard key={item.id} place={item} />
                        ))}
                    </div>
                </section>
            )}
        </article>
    );
}
