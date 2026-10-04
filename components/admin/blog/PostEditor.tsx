"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ArrowLeft, CalendarClock, Copy, Eye, ImagePlus, Languages, Save, Send, Trash2, Undo2 } from "lucide-react";
import { adminPatch } from "@/lib/admin-client";
import { BLOCK_TYPES, emptyBlock, outline, placesIn, readingMinutes, type Block, type BlockType } from "@/lib/blog/blocks";
import { TOPICS, type Topic } from "@/lib/blog/topics";
import { CITIES } from "@/lib/cities";
import { useAdminLang, useTr } from "../i18n";
import { useAdminToast } from "../ui";
import BlockEditor, { BLOCK_META, uploadArticleImage } from "./BlockEditor";
import type { PickedPlace } from "./PlacePicker";

export type PostRow = {
    id: string;
    slug: string;
    status: "DRAFT" | "PUBLISHED";
    title_fr: string;
    title_en: string | null;
    excerpt_fr: string | null;
    excerpt_en: string | null;
    body_fr: Block[];
    body_en: Block[];
    cover_url: string | null;
    cover_alt: string | null;
    topic: string;
    city: string | null;
    tags: string[];
    author: string;
    featured: boolean;
    published_at: string | null;
    updated_at: string;
};

type Lang = "fr" | "en";

// datetime-local works in local time; Cameroon is UTC+1 all year.
function toLocalInput(iso: string | null) {
    if (!iso) return "";
    return new Date(new Date(iso).getTime() + 3_600_000).toISOString().slice(0, 16);
}
function fromLocalInput(value: string) {
    return value ? new Date(`${value}:00+01:00`).toISOString() : null;
}

function Inserter({ onInsert, always = false }: { onInsert: (type: BlockType) => void; always?: boolean }) {
    const tr = useTr();
    const [open, setOpen] = useState(false);
    return (
        <div className={`relative flex justify-center py-1 ${always ? "" : "opacity-0 transition hover:opacity-100 focus-within:opacity-100"}`}>
            <div className="absolute inset-x-6 top-1/2 h-px bg-line" aria-hidden />
            {open ? (
                <div className="relative flex flex-wrap justify-center gap-1 rounded-2xl border border-line bg-white p-1.5 shadow-lg">
                    {BLOCK_TYPES.map((type) => {
                        const Icon = BLOCK_META[type].icon;
                        return (
                            <button
                                key={type}
                                type="button"
                                onClick={() => {
                                    onInsert(type);
                                    setOpen(false);
                                }}
                                className="flex items-center gap-1.5 rounded-xl px-2.5 py-1.5 text-xs font-bold hover:bg-soft"
                            >
                                <Icon size={14} />
                                {tr(...BLOCK_META[type].label)}
                            </button>
                        );
                    })}
                    <button type="button" onClick={() => setOpen(false)} className="rounded-xl px-2.5 py-1.5 text-xs font-bold text-muted hover:bg-soft">
                        {tr("Annuler", "Cancel")}
                    </button>
                </div>
            ) : (
                <button type="button" onClick={() => setOpen(true)} className="relative rounded-full border border-line bg-white px-3 py-1 text-xs font-bold text-text-2 shadow-sm hover:border-brand-500 hover:text-brand-600">
                    + {tr("Ajouter un bloc", "Add a block")}
                </button>
            )}
        </div>
    );
}

// The article editor: language tabs, blocks in the middle, settings on the
// side. Saving is explicit (Ctrl+S works); leaving with unsaved changes asks
// first. Published articles change on the site only when you save.
export default function PostEditor({ initial }: { initial: PostRow }) {
    const tr = useTr();
    const { lang: consoleLang } = useAdminLang();
    const router = useRouter();
    const toast = useAdminToast();
    const [post, setPost] = useState(initial);
    const [saved, setSaved] = useState(initial);
    const [lang, setLang] = useState<Lang>("fr");
    const [saving, setSaving] = useState(false);
    const [names, setNames] = useState<Record<string, PickedPlace>>({});
    const coverInput = useRef<HTMLInputElement>(null);
    const [coverBusy, setCoverBusy] = useState(false);

    const dirty = useMemo(() => JSON.stringify(post) !== JSON.stringify(saved), [post, saved]);
    const blocks = lang === "fr" ? post.body_fr : post.body_en;
    const minutes = readingMinutes(post.body_fr);
    const placeCount = placesIn(post.body_fr).length;
    const sections = outline(post.body_fr).length;
    const scheduled = post.status === "PUBLISHED" && post.published_at && new Date(post.published_at) > new Date();

    // Names of the places already in the article, for the editor chips.
    useEffect(() => {
        const slugs = [...new Set([...placesIn(initial.body_fr), ...placesIn(initial.body_en)])];
        if (!slugs.length) return;
        fetch(`/api/places?slugs=${slugs.join(",")}`)
            .then((response) => response.json())
            .then((data: { places?: { slug: string; name: string; city: string; neighborhood: string | null }[] }) =>
                setNames(Object.fromEntries((data.places ?? []).map((place) => [place.slug, { slug: place.slug, name: place.name, city: place.city, neighborhood: place.neighborhood }])))
            )
            .catch(() => {});
    }, [initial]);

    useEffect(() => {
        if (!dirty) return;
        const warn = (event: BeforeUnloadEvent) => event.preventDefault();
        window.addEventListener("beforeunload", warn);
        return () => window.removeEventListener("beforeunload", warn);
    }, [dirty]);

    const set = <K extends keyof PostRow>(key: K, value: PostRow[K]) => setPost((current) => ({ ...current, [key]: value }));
    const setBlocks = (next: Block[]) => set(lang === "fr" ? "body_fr" : "body_en", next);

    const save = async (extra: Partial<PostRow> = {}) => {
        setSaving(true);
        try {
            const payload = { ...post, ...extra };
            const { row } = await adminPatch<{ row: PostRow }>(`posts/${post.id}`, {
                slug: payload.slug,
                status: payload.status,
                title_fr: payload.title_fr,
                title_en: payload.title_en,
                excerpt_fr: payload.excerpt_fr,
                excerpt_en: payload.excerpt_en,
                body_fr: payload.body_fr,
                body_en: payload.body_en,
                cover_url: payload.cover_url,
                cover_alt: payload.cover_alt,
                topic: payload.topic,
                city: payload.city,
                tags: payload.tags,
                author: payload.author,
                featured: payload.featured,
                published_at: payload.published_at,
            });
            setPost(row);
            setSaved(row);
            toast(
                row.status === "PUBLISHED"
                    ? new Date(row.published_at ?? 0) > new Date()
                        ? tr("Programmé ✓", "Scheduled ✓")
                        : tr("Publié et à jour ✓", "Published and up to date ✓")
                    : tr("Brouillon enregistré ✓", "Draft saved ✓")
            );
            return true;
        } catch (error) {
            toast((error as Error).message, true);
            return false;
        } finally {
            setSaving(false);
        }
    };

    useEffect(() => {
        const onKey = (event: KeyboardEvent) => {
            if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === "s") {
                event.preventDefault();
                if (!saving) void save();
            }
        };
        window.addEventListener("keydown", onKey);
        return () => window.removeEventListener("keydown", onKey);
    });

    const insert = (at: number, type: BlockType) => setBlocks([...blocks.slice(0, at), emptyBlock(type), ...blocks.slice(at)]);
    const named = (place: PickedPlace) => setNames((current) => ({ ...current, [place.slug]: place }));

    const uploadCover = async (file: File | undefined) => {
        if (!file) return;
        setCoverBusy(true);
        try {
            set("cover_url", await uploadArticleImage(post.id, file));
        } catch (error) {
            toast((error as Error).message, true);
        } finally {
            setCoverBusy(false);
        }
    };

    const remove = async () => {
        if (!window.confirm(tr("Supprimer définitivement cet article et ses photos ?", "Delete this article and its photos for good?"))) return;
        const response = await fetch(`/api/admin/posts/${post.id}`, { method: "DELETE" });
        if (response.ok) {
            setSaved(post);
            router.replace("/admin/blog");
        } else toast(tr("Suppression impossible.", "Couldn't delete."), true);
    };

    return (
        <div className="pb-16">
            <div className="sticky top-0 z-30 -mx-4 mb-5 flex flex-wrap items-center gap-2 border-b border-line bg-paper/90 px-4 py-3 backdrop-blur md:-mx-8 md:px-8">
                <Link href="/admin/blog" className="a-btn a-btn-ghost h-10 px-2.5" aria-label={tr("Retour aux articles", "Back to articles")}>
                    <ArrowLeft size={18} />
                </Link>
                <span className={`rounded-full px-2.5 py-1 text-xs font-bold ${post.status === "PUBLISHED" ? (scheduled ? "bg-amber-50 text-warn" : "bg-green-50 text-good") : "bg-soft text-text-2"}`}>
                    {post.status === "PUBLISHED" ? (scheduled ? tr("Programmé", "Scheduled") : tr("Publié", "Published")) : tr("Brouillon", "Draft")}
                </span>
                <span className="text-xs text-muted">{dirty ? tr("Modifications non enregistrées", "Unsaved changes") : tr("Tout est enregistré", "Everything is saved")}</span>
                <div className="ml-auto flex flex-wrap gap-2">
                    <a href={`/api/admin/posts/${post.id}/preview?l=${lang}`} target="_blank" rel="noreferrer" className="a-btn a-btn-soft h-10 px-3 text-sm" onClick={(event) => dirty && !window.confirm(tr("Les modifications non enregistrées ne seront pas dans l'aperçu. Continuer ?", "Unsaved changes won't be in the preview. Continue?")) && event.preventDefault()}>
                        <Eye size={16} />
                        {tr("Aperçu", "Preview")}
                    </a>
                    <button type="button" onClick={() => save()} disabled={saving || !dirty} className="a-btn a-btn-soft h-10 px-3 text-sm">
                        <Save size={16} />
                        {saving ? "…" : tr("Enregistrer", "Save")}
                    </button>
                    {post.status === "PUBLISHED" ? (
                        <button type="button" onClick={() => save({ status: "DRAFT" })} disabled={saving} className="a-btn a-btn-ghost h-10 px-3 text-sm">
                            <Undo2 size={16} />
                            {tr("Dépublier", "Unpublish")}
                        </button>
                    ) : (
                        <button type="button" onClick={() => save({ status: "PUBLISHED" })} disabled={saving} className="a-btn a-btn-primary h-10 px-4 text-sm">
                            <Send size={16} />
                            {post.published_at && new Date(post.published_at) > new Date() ? tr("Programmer", "Schedule") : tr("Publier", "Publish")}
                        </button>
                    )}
                </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_20rem]">
                <div className="min-w-0">
                    <div className="mb-4 flex gap-1.5">
                        {(["fr", "en"] as const).map((value) => (
                            <button key={value} type="button" className="a-chip" aria-pressed={lang === value} onClick={() => setLang(value)}>
                                <Languages size={14} />
                                {value === "fr" ? tr("Français", "French") : tr("English (facultatif)", "English (optional)")}
                            </button>
                        ))}
                    </div>

                    <div className="a-card p-4 md:p-6">
                        <input
                            value={(lang === "fr" ? post.title_fr : post.title_en) ?? ""}
                            onChange={(event) => set(lang === "fr" ? "title_fr" : "title_en", event.target.value)}
                            placeholder={lang === "fr" ? tr("Le titre qui donne envie", "A title that makes people click") : tr("Titre en anglais", "Title in English")}
                            className="a-serif w-full border-0 bg-transparent text-[2.1rem] outline-none placeholder:text-line-strong md:text-[2.8rem]"
                        />
                        <textarea
                            value={(lang === "fr" ? post.excerpt_fr : post.excerpt_en) ?? ""}
                            onChange={(event) => set(lang === "fr" ? "excerpt_fr" : "excerpt_en", event.target.value)}
                            placeholder={
                                lang === "fr"
                                    ? tr("Le chapeau : une ou deux phrases qui résument l'article (aussi utilisé par Google et WhatsApp)", "The standfirst: one or two sentences summing up the article (also used by Google and WhatsApp)")
                                    : tr("Résumé en anglais", "Summary in English")
                            }
                            rows={2}
                            maxLength={320}
                            className="mt-2 w-full resize-none border-0 bg-transparent text-lg text-text-2 outline-none placeholder:text-muted/60"
                        />

                        {lang === "en" && post.body_en.length === 0 && post.body_fr.length > 0 && (
                            <button
                                type="button"
                                onClick={() => setBlocks(structuredClone(post.body_fr))}
                                className="mt-3 flex w-full items-center justify-center gap-2 rounded-2xl border-2 border-dashed border-line-strong px-4 py-4 text-sm font-bold text-text-2 hover:bg-soft"
                            >
                                <Copy size={16} />
                                {tr("Copier la version française pour la traduire (lieux et photos gardés)", "Copy the French version to translate it (places and photos kept)")}
                            </button>
                        )}

                        <div className="mt-4 border-t border-line pt-3">
                            {blocks.length === 0 && <Inserter always onInsert={(type) => insert(0, type)} />}
                            {blocks.map((block, index) => (
                                <div key={index}>
                                    {index > 0 && <Inserter onInsert={(type) => insert(index, type)} />}
                                    <BlockEditor
                                        postId={post.id}
                                        block={block}
                                        names={names}
                                        first={index === 0}
                                        last={index === blocks.length - 1}
                                        onNamed={named}
                                        onChange={(next) => setBlocks(blocks.map((item, at) => (at === index ? next : item)))}
                                        onRemove={() => setBlocks(blocks.filter((_, at) => at !== index))}
                                        onMove={(direction) => {
                                            const next = [...blocks];
                                            [next[index], next[index + direction]] = [next[index + direction], next[index]];
                                            setBlocks(next);
                                        }}
                                    />
                                </div>
                            ))}
                            {blocks.length > 0 && <Inserter always onInsert={(type) => insert(blocks.length, type)} />}
                        </div>
                    </div>
                </div>

                <aside className="grid content-start gap-4">
                    <section className="a-card p-4">
                        <p className="a-eyebrow mb-2">{tr("En un coup d'œil", "At a glance")}</p>
                        <dl className="grid grid-cols-3 gap-2 text-center">
                            <div className="rounded-xl bg-soft p-2">
                                <dt className="text-[0.68rem] font-bold text-muted">{tr("Lecture", "Reading")}</dt>
                                <dd className="a-serif text-[1.6rem]">{minutes} min</dd>
                            </div>
                            <div className="rounded-xl bg-soft p-2">
                                <dt className="text-[0.68rem] font-bold text-muted">{tr("Lieux", "Places")}</dt>
                                <dd className="a-serif text-[1.6rem]">{placeCount}</dd>
                            </div>
                            <div className="rounded-xl bg-soft p-2">
                                <dt className="text-[0.68rem] font-bold text-muted">{tr("Parties", "Sections")}</dt>
                                <dd className="a-serif text-[1.6rem]">{sections}</dd>
                            </div>
                        </dl>
                        {placeCount >= 2 && (
                            <p className="mt-2 text-xs text-muted">
                                {tr(`Une carte avec les ${placeCount} lieux sera ajoutée en fin d'article.`, `A map with the ${placeCount} places will be added at the end.`)}
                            </p>
                        )}
                    </section>

                    <section className="a-card p-4">
                        <p className="a-eyebrow mb-2">{tr("Couverture", "Cover")}</p>
                        {post.cover_url ? (
                            // Plain img: the console has no image optimiser config for previews.
                            <img src={post.cover_url} alt="" className="aspect-[4/3] w-full rounded-xl object-cover" />
                        ) : (
                            <button type="button" onClick={() => coverInput.current?.click()} className="grid aspect-[4/3] w-full place-items-center rounded-xl border-2 border-dashed border-line-strong text-sm font-bold text-muted hover:bg-soft">
                                <span className="flex items-center gap-2">
                                    <ImagePlus size={18} />
                                    {coverBusy ? tr("Envoi…", "Uploading…") : tr("Ajouter la photo de couverture", "Add the cover photo")}
                                </span>
                            </button>
                        )}
                        <input ref={coverInput} type="file" accept="image/*" hidden onChange={(event) => uploadCover(event.target.files?.[0])} />
                        {post.cover_url && (
                            <button type="button" onClick={() => coverInput.current?.click()} disabled={coverBusy} className="a-btn a-btn-soft mt-2 h-9 w-full text-xs">
                                {coverBusy ? tr("Envoi…", "Uploading…") : tr("Changer", "Change")}
                            </button>
                        )}
                        <input value={post.cover_alt ?? ""} onChange={(event) => set("cover_alt", event.target.value)} placeholder={tr("Ce que montre la photo", "What the photo shows")} className="a-input mt-2" />
                    </section>

                    <section className="a-card grid gap-3 p-4">
                        <p className="a-eyebrow">{tr("Classement", "Filing")}</p>
                        <label className="grid gap-1">
                            <span className="a-label mb-0">{tr("Rubrique", "Section")}</span>
                            <select value={post.topic} onChange={(event) => set("topic", event.target.value as Topic)} className="a-input">
                                {(Object.keys(TOPICS) as Topic[]).map((key) => (
                                    <option key={key} value={key}>
                                        {TOPICS[key][consoleLang]}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-1">
                            <span className="a-label mb-0">{tr("Ville", "City")}</span>
                            <select value={post.city ?? ""} onChange={(event) => set("city", event.target.value || null)} className="a-input">
                                <option value="">{tr("Tout le Cameroun", "All of Cameroon")}</option>
                                {CITIES.map((city) => (
                                    <option key={city.slug} value={city.slug}>
                                        {city.name}
                                    </option>
                                ))}
                            </select>
                        </label>
                        <label className="grid gap-1">
                            <span className="a-label mb-0">{tr("Mots-clés (séparés par des virgules)", "Keywords (comma separated)")}</span>
                            <input
                                value={post.tags.join(", ")}
                                onChange={(event) => set("tags", event.target.value.split(",").map((tag) => tag.trimStart()))}
                                placeholder="petit-déj, bastos, pas cher"
                                className="a-input"
                            />
                        </label>
                        <label className="flex items-center gap-2 text-sm font-semibold">
                            <input type="checkbox" checked={post.featured} onChange={(event) => set("featured", event.target.checked)} />
                            {tr("À la une du blog", "Featured on the blog")}
                        </label>
                    </section>

                    <section className="a-card grid gap-3 p-4">
                        <p className="a-eyebrow">{tr("Publication", "Publishing")}</p>
                        <label className="grid gap-1">
                            <span className="a-label mb-0 flex items-center gap-1.5">
                                <CalendarClock size={14} />
                                {tr("Date de publication (heure du Cameroun)", "Publication date (Cameroon time)")}
                            </span>
                            <input type="datetime-local" value={toLocalInput(post.published_at)} onChange={(event) => set("published_at", fromLocalInput(event.target.value))} className="a-input" />
                            <span className="text-xs text-muted">{tr("Vide = maintenant. Une date future programme l'article.", "Empty = now. A future date schedules the article.")}</span>
                        </label>
                        <label className="grid gap-1">
                            <span className="a-label mb-0">{tr("Adresse de l'article", "Article address")}</span>
                            <input value={post.slug} onChange={(event) => set("slug", event.target.value)} className="a-input font-mono text-sm" />
                            <span className="truncate text-xs text-muted">nicethings.site/fr/blog/{post.slug}</span>
                        </label>
                        <label className="grid gap-1">
                            <span className="a-label mb-0">{tr("Signature", "Byline")}</span>
                            <input value={post.author} onChange={(event) => set("author", event.target.value)} className="a-input" />
                        </label>
                        <button type="button" onClick={remove} className="a-btn a-btn-danger mt-1 h-10 text-sm">
                            <Trash2 size={16} />
                            {tr("Supprimer l'article", "Delete the article")}
                        </button>
                    </section>
                </aside>
            </div>
        </div>
    );
}
