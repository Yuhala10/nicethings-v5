import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PollBoard from "@/components/poll/PollBoard";
import { fill, getDictionary, isLocale } from "@/lib/i18n";
import { POLL_CODE } from "@/lib/polls";
import { readPoll } from "@/lib/polls-server";
import { pollShareImage } from "@/lib/share-image";

// "On se voit où ?": the page a group of friends opens from their chat to
// vote on where to go. Always read fresh; never offered to search engines.

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ lang: string; code: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang, code } = await params;
    if (!isLocale(lang) || !POLL_CODE.test(code)) return {};
    const t = getDictionary(lang);
    const poll = await readPoll(code, null).catch(() => null);
    if (!poll) return { title: t.poll.title, robots: { index: false, follow: false } };
    const title = poll.title ? `${poll.title} · ${t.poll.eyebrow}` : t.poll.eyebrow;
    const description = fill(t.poll.metaDescription, { places: poll.options.map((option) => option.place.name).join(", ") });
    // Its own card, for the group chat it is dropped in.
    const card = pollShareImage(poll, lang);
    return { title, description, robots: { index: false, follow: false }, openGraph: { title, description, images: [card] }, twitter: { card: "summary_large_image", images: [card.url] } };
}

export default async function PollPage({ params }: Props) {
    const { lang, code } = await params;
    if (!isLocale(lang) || !POLL_CODE.test(code)) notFound();
    const poll = await readPoll(code, null).catch(() => null);
    if (!poll || poll.options.length === 0) notFound();
    return <PollBoard initial={poll} />;
}
