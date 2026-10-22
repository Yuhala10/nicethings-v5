import type { Metadata } from "next";
import { notFound } from "next/navigation";
import ArtistForm from "@/components/people/ArtistForm";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { tidy } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";
import { loadLibrary } from "@/lib/songs";

// "Ton son sur NiceThings": Cameroonian artists put their songs in the
// library members choose from for their outings. Their name and link go
// with every outing and every video downloaded and shared from it.

export const revalidate = 300;

type Props = { params: Promise<{ lang: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const words = getDictionary(lang).people.songs;
    const path = (locale: Locale) => paths.artists(locale);
    return {
        title: words.metaTitle,
        description: words.metaDescription,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title: words.metaTitle, description: words.metaDescription, url: path(lang) },
    };
}

export default async function ArtistsPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const words = t.people.songs;
    // Songs sent by their artists, already in the list.
    const theirs = ((await loadLibrary().catch(() => null)) ?? []).filter((song) => song.credit === null).slice(0, 12);

    return (
        <div className="pb-28">
            <header className="mx-auto max-w-3xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-[#15110e] px-6 py-12 text-white md:px-12 md:py-16">
                    <div className="pointer-events-none absolute -top-24 -right-20 h-72 w-72 rounded-full bg-[radial-gradient(circle,rgba(249,115,22,0.55),transparent_70%)]" aria-hidden />
                    <p className="relative text-[0.75rem] font-semibold tracking-[0.16em] uppercase opacity-70">🎤 {words.eyebrow}</p>
                    <h1 className="nt-serif relative mt-3 max-w-[14ch] text-[2.75rem] leading-[0.98] md:text-[3.5rem]">{words.title}</h1>
                    <p className="relative mt-5 max-w-xl text-[1.125rem] leading-relaxed opacity-85">{tidy(words.lead)}</p>
                </div>
            </header>

            <section className="mx-auto max-w-3xl px-4 pt-10 md:px-6">
                <ol className="grid gap-3 md:grid-cols-3">
                    {words.steps.map(([step, text], index) => (
                        <li key={step} className="rounded-[1.4rem] border border-line bg-surface p-5">
                            <span className="nt-serif text-[2.25rem] leading-none text-brand-600">{index + 1}</span>
                            <p className="mt-3 text-[1rem] font-bold">{step}</p>
                            <p className="mt-1.5 text-[0.875rem] leading-relaxed text-muted">{tidy(text)}</p>
                        </li>
                    ))}
                </ol>
                <p className="mt-4 text-[0.875rem] text-muted">{tidy(words.free)}</p>
            </section>

            {theirs.length > 0 && (
                <section className="mx-auto max-w-3xl px-4 pt-10 md:px-6">
                    <h2 className="text-[1.125rem] font-bold">{words.already}</h2>
                    <ul className="mt-3 flex flex-wrap gap-2">
                        {theirs.map((song) => (
                            <li key={song.id} className="rounded-full border border-line bg-surface px-3.5 py-2 text-[0.875rem]">
                                🎵 <span className="font-semibold">{song.title}</span> <span className="text-muted">· {song.artist}</span>
                            </li>
                        ))}
                    </ul>
                </section>
            )}

            <section className="mx-auto max-w-3xl px-4 pt-10 md:px-6">
                <h2 className="mb-4 text-[1.5rem] font-bold">{words.formTitle}</h2>
                <ArtistForm />
            </section>
        </div>
    );
}
