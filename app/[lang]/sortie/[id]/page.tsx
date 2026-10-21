import type { Metadata } from "next";
import { notFound } from "next/navigation";
import OutingCard from "@/components/people/OutingCard";
import { PostOutingButton } from "@/components/people/OutingList";
import { displayName } from "@/components/people/Person";
import BackButton from "@/components/site/BackButton";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { paths } from "@/lib/places/paths";
import { UUID } from "@/lib/posts";
import { loadOutings } from "@/lib/people/outings";

// One outing, on its own page: what a shared link opens, with its first
// photo as the preview. Kept a minute; likes and comments are read live.

export const revalidate = 60;

type Props = { params: Promise<{ lang: string; id: string }> };

async function load(id: string) {
    if (!UUID.test(id)) return null;
    const [outing] = await loadOutings({ ids: [id] }).catch(() => []);
    return outing && outing.status === "PUBLISHED" ? outing : null;
}

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, id } = await params;
    if (!isLocale(lang)) return {};
    const outing = await load(id);
    if (!outing) return { robots: { index: false } };
    const title = fill(getDictionary(lang).people.outing.metaTitle, { name: displayName(outing.person), place: outing.place.name });
    const picture = outing.media[0].kind === "video" ? outing.media[0].poster : outing.media[0].url;
    return {
        title,
        description: outing.body ?? outing.place.name,
        alternates: { canonical: paths.outing(lang, id) },
        openGraph: { type: "article", title, description: outing.body ?? outing.place.name, images: picture ? [{ url: picture }] : undefined },
        twitter: { card: "summary_large_image" },
    };
}

export default async function OutingPage({ params }: Props) {
    const { lang, id } = await params;
    if (!isLocale(lang)) notFound();
    const outing = await load(id);
    if (!outing) notFound();
    const words = getDictionary(lang).people.outing;
    return (
        <div className="mx-auto max-w-xl px-4 pt-[max(env(safe-area-inset-top),0.75rem)] pb-28 md:px-6 md:pt-8">
            <BackButton className="mb-4 border border-line !bg-surface !shadow-none !backdrop-blur-none" />
            <OutingCard outing={outing} live />
            <div className="mt-6 flex justify-center">
                <PostOutingButton place={{ slug: outing.place.slug, name: outing.place.name, neighborhood: outing.place.neighborhood }} label={words.iWasHere} />
            </div>
        </div>
    );
}
