import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import {
    ArrowRight,
    BadgeCheck,
    CloudSun,
    Heart,
    Landmark,
    type LucideIcon,
    Map as MapIcon,
    Navigation,
    PenLine,
    Plane,
    Plus,
    Search,
    Send,
    Smartphone,
    Store,
    Users,
    Wallet,
} from "lucide-react";
import { HELP, type HelpIcon, type HelpLink } from "@/lib/help";
import { getDictionary, isLocale, type Locale } from "@/lib/i18n";
import { tidy } from "@/lib/i18n/format";
import { paths } from "@/lib/places/paths";

// "Mode d'emploi": how the site works, feature by feature (lib/help.ts), each
// with the way to try it. It opens on the film that shows it all in under a
// minute, played only if asked for: it costs nothing to those who read.

type Props = { params: Promise<{ lang: string }> };

const ICONS: Record<HelpIcon, LucideIcon> = {
    search: Search,
    map: MapIcon,
    place: BadgeCheck,
    route: Navigation,
    heart: Heart,
    vote: Users,
    share: Send,
    now: CloudSun,
    culture: Landmark,
    home: Plane,
    add: Plus,
    guest: PenLine,
    owner: Store,
    install: Smartphone,
    free: Wallet,
};

const linkTo = (to: HelpLink, lang: Locale) =>
    ({
        search: paths.searchEntry(lang),
        map: paths.map(lang),
        saved: paths.saved(lang),
        now: `${paths.home(lang)}#maintenant`,
        culture: paths.culture(lang),
        street: paths.streetFood(lang),
        homecoming: paths.homecoming(lang),
        submit: paths.submit(lang),
        guests: paths.guests(lang),
        pro: paths.pro(lang),
        privacy: paths.privacy(lang),
    })[to];

export async function generateMetadata({ params }: Props): Promise<Metadata> {
    const { lang } = await params;
    if (!isLocale(lang)) return {};
    const t = getDictionary(lang);
    const path = (locale: Locale) => paths.help(locale);
    return {
        title: t.help.metaTitle,
        description: t.help.metaDescription,
        alternates: { canonical: path(lang), languages: { fr: path("fr"), en: path("en"), "x-default": path("fr") } },
        openGraph: { title: t.help.metaTitle, description: t.help.metaDescription, url: path(lang) },
    };
}

export default async function HelpPage({ params }: Props) {
    const { lang } = await params;
    if (!isLocale(lang)) notFound();
    const t = getDictionary(lang);
    const topics = HELP[lang];

    return (
        <div className="pb-24">
            <header className="mx-auto max-w-6xl px-4 pt-[max(env(safe-area-inset-top),1rem)] md:px-6 md:pt-10">
                <div className="relative overflow-hidden rounded-[2rem] bg-contrast px-6 py-12 text-on-contrast md:px-12 md:py-20">
                    <p className="text-[0.75rem] font-semibold tracking-[0.16em] uppercase opacity-60">{t.help.eyebrow}</p>
                    <h1 className="nt-serif mt-3 max-w-[13ch] text-[2.75rem] leading-[0.98] md:text-[4.5rem]">{t.help.title}</h1>
                    <p className="mt-5 max-w-xl text-[1.125rem] leading-relaxed opacity-80">{tidy(t.help.lead)}</p>
                    {/* The page's own index: every feature, one tap away. */}
                    <ol className="mt-8 flex flex-wrap gap-2">
                        {topics.map((topic, index) => (
                            <li key={topic.id}>
                                <a href={`#${topic.id}`} className="nt-tap inline-flex min-h-11 items-center gap-2 rounded-full border border-white/20 px-4 text-[0.875rem] font-semibold transition hover:bg-white/10">
                                    <span className="nt-serif text-[1.125rem] leading-none opacity-60">{index + 1}</span>
                                    {topic.title}
                                </a>
                            </li>
                        ))}
                    </ol>
                </div>
            </header>

            {/* ---------------- The film ---------------- */}
            <section className="mx-auto grid max-w-6xl items-center gap-8 px-4 pt-14 md:grid-cols-[minmax(0,1fr)_minmax(0,20rem)] md:gap-14 md:px-6 md:pt-20">
                <div className="nt-reveal">
                    <p className="nt-eyebrow">{t.help.filmEyebrow}</p>
                    <h2 className="nt-serif mt-2 text-[2.25rem] leading-[1.05] md:text-[3.5rem]">{t.help.filmTitle}</h2>
                    <p className="mt-3 max-w-xl text-[1rem] leading-relaxed text-muted">{tidy(t.help.filmLead)}</p>
                </div>
                <video
                    controls
                    playsInline
                    preload="none"
                    poster="/film/nicethings.jpg"
                    aria-label={t.help.filmTitle}
                    className="nt-reveal mx-auto aspect-[9/16] w-full max-w-[20rem] rounded-[1.6rem] border border-line bg-surface-2 shadow-float"
                >
                    <source src="/film/nicethings.mp4" type="video/mp4" />
                </video>
            </section>

            {/* ---------------- Every feature ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-14 md:px-6 md:pt-24">
                <ol className="grid gap-3 md:grid-cols-2 md:gap-4">
                    {topics.map((topic, index) => {
                        const Icon = ICONS[topic.icon];
                        return (
                            <li key={topic.id} id={topic.id} className="nt-reveal scroll-mt-24 flex flex-col rounded-[1.6rem] border border-line bg-surface p-6 md:p-8">
                                <div className="flex items-center justify-between">
                                    <span className="nt-serif text-[2.25rem] leading-none text-brand-600">{index + 1}</span>
                                    <Icon size={22} strokeWidth={1.7} className="text-muted" />
                                </div>
                                <h2 className="nt-serif mt-5 text-[2.25rem] leading-[1.05]">{tidy(topic.title)}</h2>
                                <p className="mt-2 text-[1.125rem] leading-relaxed text-text-2">{tidy(topic.lead)}</p>
                                <ul className="mt-5 grid gap-3 border-t border-line pt-5">
                                    {topic.steps.map((step) => (
                                        <li key={step} className="flex gap-3 text-[1rem] leading-relaxed">
                                            <span className="mt-[0.6rem] h-1.5 w-1.5 shrink-0 rounded-full bg-brand-600" aria-hidden />
                                            {tidy(step)}
                                        </li>
                                    ))}
                                </ul>
                                {topic.link && (
                                    <Link href={linkTo(topic.link.to, lang)} className="nt-tap group mt-6 inline-flex min-h-11 items-center gap-1.5 self-start text-[1rem] font-semibold">
                                        {topic.link.label}
                                        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                                    </Link>
                                )}
                            </li>
                        );
                    })}
                </ol>
            </section>

            {/* ---------------- A question that is not here ---------------- */}
            <section className="mx-auto max-w-6xl px-4 pt-6 md:px-6">
                <Link href={`${paths.about(lang)}#contact`} className="nt-reveal nt-pressable group flex flex-col justify-between gap-8 rounded-[1.6rem] bg-[#15110e] p-6 text-white md:flex-row md:items-end md:p-8">
                    <span className="max-w-xl">
                        <span className="nt-serif block text-[2.25rem] leading-[1.05]">{tidy(t.help.askTitle)}</span>
                        <span className="mt-2 block text-[1rem] leading-relaxed text-white/65">{t.help.askBody}</span>
                    </span>
                    <span className="inline-flex shrink-0 items-center gap-1.5 font-semibold">
                        {t.help.askCta}
                        <ArrowRight size={16} className="transition-transform duration-200 group-hover:translate-x-0.5" />
                    </span>
                </Link>
            </section>
        </div>
    );
}
