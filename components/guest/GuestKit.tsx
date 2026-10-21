"use client";

import Link from "next/link";
import { ArrowUpRight, Copy, Download, MessageSquareQuote, Send } from "lucide-react";
import { sharePlace, useShareCard } from "@/lib/share";
import { useLocale } from "../site/LocaleProvider";
import { useToast } from "../site/Toast";

// What a guest needs to make their page travel (their invitation link,
// once the page is out): see it, share it, the picture for their story and
// a caption ready to paste.
export default function GuestKit({ title, path, url, preview, story, caption, slug }: { title: string; path: string; url: string; preview: string; story: string; caption: string; slug: string }) {
    const { t } = useLocale();
    const toast = useToast();
    const card = useShareCard(preview);
    const copy = async (text: string, done: string) => {
        try {
            await navigator.clipboard.writeText(text);
            toast(done);
        } catch {
            toast(text);
        }
    };
    const button = "nt-tap inline-flex min-h-12 items-center justify-center gap-2 rounded-full px-5 text-[0.875rem] font-bold transition active:scale-[0.97]";
    return (
        <div className="grid gap-3">
            <div className="grid grid-cols-2 gap-2">
                <Link href={path} className={`${button} bg-[#faf7f2] text-[#15110e] hover:bg-white`}>
                    <ArrowUpRight size={17} />
                    {t.guestKit.seePage}
                </Link>
                <button type="button" {...card} onClick={() => void sharePlace(title, url, "", preview).then((done) => done === "copied" && toast(t.guestKit.copied))} className={`${button} border border-white/25 text-white hover:bg-white/10`}>
                    <Send size={16} />
                    {t.guestKit.sharePage}
                </button>
            </div>
            <a href={story} download={`nicethings-${slug}-story.jpg`} className={`${button} bg-[#d9bc8c] text-[#15110e] hover:brightness-105`}>
                <Download size={17} />
                {t.guestKit.story}
            </a>
            <p className="px-2 text-center text-[0.75rem] leading-relaxed text-white/55">{t.guestKit.storyHint}</p>
            <div className="grid grid-cols-2 gap-2">
                <button type="button" onClick={() => void copy(caption, t.guestKit.captionCopied)} className={`${button} border border-white/25 text-white hover:bg-white/10`}>
                    <MessageSquareQuote size={16} />
                    {t.guestKit.caption}
                </button>
                <button type="button" onClick={() => void copy(url, t.guestKit.copied)} className={`${button} border border-white/25 text-white hover:bg-white/10`}>
                    <Copy size={16} />
                    {t.guestKit.copyLink}
                </button>
            </div>
        </div>
    );
}
