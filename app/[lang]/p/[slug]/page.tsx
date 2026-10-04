import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ViewTransition } from "react";
import VerifiedTick from "@/components/place/VerifiedTick";
import { AtSign, ChevronRight, Clock3, Database, ExternalLink, Globe, MapPin, Navigation, Phone, Store, Users, Wallet, type LucideIcon } from "lucide-react";
import BackButton from "@/components/site/BackButton";
import HoursTable from "@/components/place/HoursTable";
import PostCard from "@/components/blog/PostCard";
import PlaceActions from "@/components/place/PlaceActions";
import PlaceCard from "@/components/place/PlaceCard";
import PlaceMap from "@/components/place/PlaceMap";
import ReportButton from "@/components/place/ReportButton";
import { OpenBadge, PlaceThumb, PriceLabel, Rating } from "@/components/place/bits";
import { HeroActions, StickyPlaceBar } from "@/components/place/PlaceHeroBits";
import { getPostsForPlace } from "@/lib/blog/server";
import { DEFAULT_CITY, cityBySlug } from "@/lib/cities";
import { SITE_URL, fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { formatPrice, formatRelativeDays } from "@/lib/i18n/format";
import { SCHEMA_TYPES, categoryStyle, cuisineLabel, firstPhone, formatPhone, isIndexable, knownFacts } from "@/lib/places/display";
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

function Section({ title, children }: { title: string; children: React.ReactNode }) {
    return (
        <section className="mt-9">
            <h2 className="nt-section-title mb-3">{title}</h2>
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
            <span className="grid h-10 w-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600 dark:bg-brand-700/25 dark:text-brand-200">
                <Icon size={19} />
            </span>
            <span className="min-w-0 flex-1 text-sm">
                <span className="nt-eyebrow mb-1 block">{label}</span>
                {children}
            </span>
            {href && <ChevronRight size={18} className="mt-2.5 shrink-0 text-muted" />}
        </>
    );
    const className = "flex items-start gap-3.5 px-4 py-4";
    if (!href) return <div className={className}>{content}</div>;
    return (
        <a href={href} className={`${className} transition hover:bg-surface-2`} {...(external ? { target: "_blank", rel: "noopener noreferrer nofollow" } : {})}>
            {content}
        </a>
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
    const preview = placeShareImage(place, lang).url;
    const area = place.neighborhood;
    const cityName = (cityBySlug(place.city) ?? DEFAULT_CITY).name;
    const style = categoryStyle(place.category);

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

    const articles = await getPostsForPlace(place.slug);
    const hasHours = Boolean(place.hours.opens && place.hours.closes);
    const hasPrice = Boolean(place.priceMin || place.priceMax);
    const updatedAgo = formatRelativeDays(place.updatedAt, lang);

    return (
        <article className="pb-4">
            <script
                type="application/ld+json"
                dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd(place, lang, phone, cityName)).replace(/</g, "\\u003c") }}
            />
            <StickyPlaceBar slug={place.slug} name={place.name} />

            {/* Hero: the photo when there is one, otherwise the category's
                own artwork — bold colour, the name set large. */}
            <header className="relative isolate overflow-hidden text-white">
                <ViewTransition name={`place-${place.slug}`}>
                    {place.photos.length > 0 ? (
                        <div className="absolute inset-0 -z-20">
                            <PlaceThumb
                                cover={place.photos[0].url}
                                category={place.category}
                                name={place.photos[0].alt ?? place.name}
                                sizes="100vw"
                                priority
                                className="h-full w-full"
                            />
                        </div>
                    ) : (
                        <div className="nt-art absolute inset-0 -z-20" style={{ "--tone": style.tone } as React.CSSProperties}>
                            <style.icon
                                size={320}
                                strokeWidth={0.8}
                                className="absolute -right-16 -bottom-20 rotate-[-12deg] opacity-[0.16] md:right-[8%]"
                                aria-hidden
                            />
                        </div>
                    )}
                </ViewTransition>
                <div className="absolute inset-0 -z-10 bg-gradient-to-t from-black/75 via-black/25 to-black/10" />

                <div className="mx-auto max-w-3xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-7 md:px-6 md:pt-8 md:pb-10">
                    <div className="flex items-center justify-between">
                        <BackButton className="border border-white/20 !bg-black/25 text-white backdrop-blur-md" />
                        <HeroActions slug={place.slug} name={place.name} preview={preview} />
                    </div>

                    <div className="pt-24 md:pt-36">
                        <nav aria-label="Breadcrumb" className="mb-3 flex flex-wrap items-center gap-1 text-[0.8rem] font-semibold text-white/70">
                            <Link href={paths.city(lang, place.city)} className="hover:text-white">
                                {cityName}
                            </Link>
                            {area && (
                                <>
                                    <ChevronRight size={13} />
                                    <Link href={paths.neighborhood(lang, place.city, area)} className="hover:text-white">
                                        {area}
                                    </Link>
                                    <ChevronRight size={13} />
                                    <Link href={paths.neighborhoodCategory(lang, place.city, area, place.category)} className="hover:text-white">
                                        {CATEGORY_PLURALS[place.category as keyof typeof CATEGORY_PLURALS]?.[lang] ?? category}
                                    </Link>
                                </>
                            )}
                        </nav>
                        {/* One line: a long name ends with "…", the tick always stays beside it. */}
                        <h1
                            title={place.name}
                            className={`flex min-w-0 items-center gap-2 leading-[1.08] font-extrabold tracking-[-0.03em] drop-shadow-sm md:gap-3 ${
                                place.name.length > 26 ? "text-[1.65rem] md:text-5xl" : place.name.length > 16 ? "text-[2rem] md:text-6xl" : "text-[2.3rem] md:text-6xl"
                            }`}
                        >
                            <span className="min-w-0 truncate">{place.name}</span>
                            {place.verified && <VerifiedTick size={28} className="drop-shadow md:h-11 md:w-11" label={t.trust.verifiedTitle} />}
                        </h1>
                        <p className="mt-2 text-[1rem] font-medium text-white/85">
                            {place.cuisine ? `${category} · ${cuisineLabel(place.cuisine, lang, 3)}` : category}
                            {` · ${[area, cityName].filter(Boolean).join(", ")}`}
                        </p>
                        <div className="mt-4 flex flex-wrap items-center gap-2 [&>*:empty]:hidden">
                            <span className="rounded-full bg-white/95 px-3 py-1.5 text-[#17120e] shadow-card empty:hidden">
                                <OpenBadge hours={place.hours} compact />
                            </span>
                            {hasPrice && (
                                <span className="rounded-full bg-white/95 px-3 py-1.5 text-[#17120e] shadow-card">
                                    <PriceLabel min={place.priceMin} max={place.priceMax} className="text-xs !text-[#17120e]" />
                                </span>
                            )}
                            {place.reviewCount > 0 && (
                                <span className="rounded-full bg-white/95 px-3 py-1.5 text-[#17120e] shadow-card">
                                    <Rating rating={place.rating} count={place.reviewCount} />
                                </span>
                            )}
                        </div>
                    </div>
                </div>
            </header>

            <div className="mx-auto max-w-3xl px-4 pt-5 md:px-6">
                <PlaceActions slug={place.slug} name={place.name} phone={phone} whatsapp={whatsapp} preview={preview} />

                {/* Practical info: one calm card, one row per fact. */}
                <section className="mt-8">
                    <h2 className="nt-section-title mb-3">{t.spot.details}</h2>
                    <div className="divide-y divide-line overflow-hidden rounded-[1.6rem] border border-line bg-surface shadow-card">
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
                                        className="inline-flex w-fit items-center gap-1.5 text-sm font-bold text-brand-600 hover:underline"
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
                    </div>
                </section>

                {place.description && (
                    <Section title={t.spot.about}>
                        <p className="text-[1.02rem] leading-relaxed whitespace-pre-line text-text-2">{place.description}</p>
                    </Section>
                )}

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
                <section className="mt-9">
                    <div className="rounded-[1.6rem] bg-surface-2 p-5">
                        <div className="mb-1.5 flex items-center gap-2 font-bold">
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
                        <p className="text-sm text-text-2">
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

                {/* Owners claim their listing from here (or it shows they already do). */}
                {place.claimed ? (
                    <p className="mt-4 flex items-center gap-2 rounded-2xl bg-open/10 px-4 py-3 text-sm font-bold text-open">
                        <Store size={17} />
                        {t.pro.managed}
                    </p>
                ) : (
                    <Link
                        href={paths.claim(lang, place.slug)}
                        className="group mt-4 flex items-center gap-4 rounded-[1.4rem] border border-dashed border-line-strong p-4 transition hover:border-brand-500"
                        rel="nofollow"
                    >
                        <span className="nt-sunset grid h-11 w-11 shrink-0 place-items-center rounded-2xl text-white">
                            <Store size={20} />
                        </span>
                        <span className="min-w-0 flex-1">
                            <span className="block font-display font-extrabold">{t.pro.claimCta}</span>
                            <span className="block text-sm text-text-2">{t.pro.claimCtaBody}</span>
                        </span>
                        <ChevronRight size={20} className="shrink-0 text-muted transition group-hover:translate-x-0.5 group-hover:text-brand-600" />
                    </Link>
                )}

                <Section title={t.spot.onMap}>
                    <div className="relative h-60 overflow-hidden rounded-[1.4rem] shadow-card">
                        <PlaceMap id={place.id} lat={place.lat} lng={place.lng} category={place.category} className="absolute inset-0" />
                        <Link
                            href={paths.directions(lang, place.slug)}
                            className="nt-btn nt-btn-primary absolute right-3 bottom-3 h-11 px-4 text-sm"
                        >
                            <Navigation size={16} />
                            {t.spot.directions}
                        </Link>
                    </div>
                </Section>

                {articles.length > 0 && (
                    <section className="mt-10">
                        <h2 className="nt-section-title mb-3">{t.blog.inArticles}</h2>
                        <div className="nt-scroll-x -mx-4 gap-4 px-4 md:mx-0 md:px-0">
                            {articles.map((post) => (
                                <div key={post.id} className="w-[13.5rem] shrink-0">
                                    <PostCard post={post} locale={lang} />
                                </div>
                            ))}
                        </div>
                    </section>
                )}

                {nearby.length > 0 && (
                    <section className="mt-10">
                        <h2 className="nt-section-title mb-3">{t.spot.nearby}</h2>
                        <div className="nt-scroll-x -mx-4 gap-3 px-4 md:mx-0 md:px-0">
                            {nearby.map(({ place: item, distance }) => (
                                <PlaceCard key={item.id} place={item} distance={distance} />
                            ))}
                        </div>
                    </section>
                )}

                {similar.length > 0 && (
                    <section className="mt-10">
                        <h2 className="nt-section-title mb-3">{t.spot.similar}</h2>
                        <div className="nt-scroll-x -mx-4 gap-3 px-4 md:mx-0 md:px-0">
                            {similar.map(({ place: item }) => (
                                <PlaceCard key={item.id} place={item} />
                            ))}
                        </div>
                    </section>
                )}
            </div>
        </article>
    );
}
