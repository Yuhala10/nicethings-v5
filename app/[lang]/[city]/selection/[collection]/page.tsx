import type { Metadata } from "next";
import { notFound, permanentRedirect } from "next/navigation";
import GuideView, { LinkChips } from "@/components/guide/GuideView";
import { CITIES, cityBySlug } from "@/lib/cities";
import { fill, getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { MIN_COLLECTION, availableCollections, collectionBySlug, placesIn } from "@/lib/places/collections";
import { paths } from "@/lib/places/paths";
import { getAllPlaces } from "@/lib/places/server";

// An editorial collection for one city: /fr/yaounde/selection/ouvert-tard.
// Built from a plain rule over the data (lib/places/collections), and only
// served when enough places pass it, so there are never thin pages.

export const revalidate = 300;
export const dynamicParams = true;

export function generateStaticParams() {
    return [];
}

type Props = { params: Promise<{ lang: string; city: string; collection: string }> };

async function load(citySlug: string, slug: string) {
    const city = cityBySlug(citySlug);
    const collection = collectionBySlug(slug);
    if (!city || !collection) return null;
    const all = await getAllPlaces();
    const inCity = all.filter((place) => place.city === city.slug);
    const places = placesIn(collection, inCity);
    if (places.length < MIN_COLLECTION) return null;
    return { city, collection, all, inCity, places };
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, city, collection } = await params;
    if (!isLocale(lang)) return {};
    const data = await load(city, collection);
    if (!data) return {};
    const title = fill(data.collection.title[lang], { city: data.city.name });
    const description = fill(data.collection.intro[lang], { count: data.places.length, city: data.city.name });
    const path = (l: Locale) => paths.collection(l, data.city.slug, data.collection);
    return {
        title,
        description,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title, description, url: path(lang) },
    };
}

export default async function CollectionPage({ params }: Props) {
    const { lang, city: citySlug, collection: slug } = await params;
    if (!isLocale(lang)) notFound();
    const data = await load(citySlug, slug);
    if (!data) notFound();
    const { city, collection, all, inCity, places } = data;

    // A slug from the other language: send to this language's address.
    if (collection.slug[lang] !== slug) permanentRedirect(paths.collection(lang, city.slug, collection));

    const t = getDictionary(lang);
    const title = fill(collection.title[lang], { city: city.name });

    // The same collection in other cities, for people comparing towns.
    const elsewhere = CITIES.filter((other) => other.slug !== city.slug)
        .map((other) => ({ city: other, count: all.filter((place) => place.city === other.slug && collection.test(place)).length }))
        .filter(({ count }) => count >= MIN_COLLECTION)
        .sort((a, b) => b.count - a.count);

    return (
        <GuideView
            locale={lang}
            city={city.slug}
            eyebrow={`${t.city.collections} · ${city.name}`}
            title={title}
            intro={fill(collection.intro[lang], { count: places.length, city: city.name })}
            crumbs={[
                { label: city.name, href: paths.city(lang, city.slug) },
                { label: t.city.collections, href: paths.collections(lang, city.slug) },
                { label: collection.name[lang] },
            ]}
            places={places}
            presorted
            mapQuery=""
        >
            <LinkChips
                title={fill(t.city.moreCollections, { city: city.name })}
                links={availableCollections(inCity)
                    .filter(({ collection: other }) => other.key !== collection.key)
                    .map(({ collection: other, count }) => ({ href: paths.collection(lang, city.slug, other), label: other.name[lang], count }))}
            />
            <LinkChips
                title={fill(t.city.sameElsewhere, { name: collection.name[lang] })}
                links={elsewhere.map(({ city: other, count }) => ({ href: paths.collection(lang, other.slug, collection), label: other.name, count }))}
            />
        </GuideView>
    );
}
