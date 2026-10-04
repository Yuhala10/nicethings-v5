"use client";

import { useRef, useState, type ReactNode } from "react";
import {
    ArrowDown,
    ArrowUp,
    Heading2,
    Heading3,
    ImagePlus,
    LayoutGrid,
    Lightbulb,
    List,
    MapPin,
    Pilcrow,
    Quote,
    Trash2,
    X,
    type LucideIcon,
} from "lucide-react";
import type { Block, BlockType } from "@/lib/blog/blocks";
import { compressImage } from "@/lib/compress-image";
import { adminLang, useTr } from "../i18n";
import { useAdminToast } from "../ui";
import PlacePicker, { type PickedPlace } from "./PlacePicker";
import { translateAdminMessage } from "@/lib/admin-messages";

export const BLOCK_META: Record<BlockType, { label: [string, string]; icon: LucideIcon }> = {
    p: { label: ["Texte", "Text"], icon: Pilcrow },
    h2: { label: ["Titre de partie", "Section title"], icon: Heading2 },
    h3: { label: ["Sous-titre", "Subtitle"], icon: Heading3 },
    image: { label: ["Photo", "Photo"], icon: ImagePlus },
    place: { label: ["Lieu", "Place"], icon: MapPin },
    places: { label: ["Sélection de lieux", "Place picks"], icon: LayoutGrid },
    quote: { label: ["Citation", "Quote"], icon: Quote },
    list: { label: ["Liste", "List"], icon: List },
    tip: { label: ["Bon plan", "Insider tip"], icon: Lightbulb },
};

// Grows with its text, like a page.
function AutoText({ value, onChange, placeholder, className = "" }: { value: string; onChange: (value: string) => void; placeholder: string; className?: string }) {
    return (
        <textarea
            value={value}
            onChange={(event) => {
                onChange(event.target.value);
                event.target.style.height = "auto";
                event.target.style.height = `${event.target.scrollHeight}px`;
            }}
            ref={(node) => {
                if (node) {
                    node.style.height = "auto";
                    node.style.height = `${node.scrollHeight}px`;
                }
            }}
            rows={2}
            placeholder={placeholder}
            className={`a-input min-h-0 resize-none overflow-hidden leading-relaxed ${className}`}
        />
    );
}

export async function uploadArticleImage(postId: string, file: File) {
    const body = new FormData();
    body.set("postId", postId);
    body.set("file", await compressImage(file, 2000, 0.85));
    const response = await fetch("/api/admin/blog-images", { method: "POST", body });
    const result = await response.json().catch(() => null);
    if (!response.ok || !result?.ok) throw new Error(translateAdminMessage(result?.message ?? "Envoi invalide.", adminLang()));
    return result.url as string;
}

function ImageField({ postId, block, onChange }: { postId: string; block: Extract<Block, { type: "image" }>; onChange: (block: Block) => void }) {
    const tr = useTr();
    const toast = useAdminToast();
    const input = useRef<HTMLInputElement>(null);
    const [busy, setBusy] = useState(false);
    const pick = async (file: File | undefined) => {
        if (!file) return;
        setBusy(true);
        try {
            onChange({ ...block, url: await uploadArticleImage(postId, file) });
        } catch (error) {
            toast((error as Error).message, true);
        } finally {
            setBusy(false);
        }
    };
    return (
        <div className="grid gap-2">
            {block.url ? (
                <img src={block.url} alt={block.alt} className="max-h-80 w-full rounded-xl object-cover" />
            ) : (
                <button type="button" onClick={() => input.current?.click()} disabled={busy} className="grid h-40 place-items-center rounded-xl border-2 border-dashed border-line-strong text-sm font-bold text-muted hover:bg-soft">
                    <span className="flex items-center gap-2">
                        <ImagePlus size={18} />
                        {busy ? tr("Envoi…", "Uploading…") : tr("Choisir une photo", "Choose a photo")}
                    </span>
                </button>
            )}
            <input ref={input} type="file" accept="image/*" hidden onChange={(event) => pick(event.target.files?.[0])} />
            <div className="grid gap-2 sm:grid-cols-2">
                <input value={block.alt} onChange={(event) => onChange({ ...block, alt: event.target.value })} placeholder={tr("Description de la photo (pour Google et l'accessibilité)", "Photo description (for Google and accessibility)")} className="a-input" />
                <input value={block.caption} onChange={(event) => onChange({ ...block, caption: event.target.value })} placeholder={tr("Légende (facultatif)", "Caption (optional)")} className="a-input" />
            </div>
            {block.url && (
                <button type="button" onClick={() => input.current?.click()} disabled={busy} className="a-btn a-btn-soft h-9 w-fit px-3 text-xs">
                    {busy ? tr("Envoi…", "Uploading…") : tr("Changer la photo", "Change photo")}
                </button>
            )}
        </div>
    );
}

// One block of the article, with its own controls.
export default function BlockEditor({
    postId,
    block,
    names,
    onChange,
    onMove,
    onRemove,
    onNamed,
    first,
    last,
}: {
    postId: string;
    block: Block;
    names: Record<string, PickedPlace>;
    onChange: (block: Block) => void;
    onMove: (direction: -1 | 1) => void;
    onRemove: () => void;
    onNamed: (place: PickedPlace) => void;
    first: boolean;
    last: boolean;
}) {
    const tr = useTr();
    const meta = BLOCK_META[block.type];
    let body: ReactNode = null;

    switch (block.type) {
        case "p":
            body = (
                <AutoText
                    value={block.text}
                    onChange={(text) => onChange({ ...block, text })}
                    placeholder={tr("Écris ici… **gras**, *italique*, [lien](https://…) ou [lien interne](/fr/yaounde/bastos)", "Write here… **bold**, *italic*, [link](https://…) or [internal link](/fr/yaounde/bastos)")}
                    className="text-[1.02rem]"
                />
            );
            break;
        case "h2":
        case "h3":
            body = (
                <input
                    value={block.text}
                    onChange={(event) => onChange({ ...block, text: event.target.value })}
                    placeholder={block.type === "h2" ? tr("Titre de partie (apparaît dans le sommaire)", "Section title (shown in the contents)") : tr("Sous-titre", "Subtitle")}
                    className={`a-input a-serif ${block.type === "h2" ? "h-12 text-2xl" : "text-xl"}`}
                />
            );
            break;
        case "tip":
            body = (
                <AutoText
                    value={block.text}
                    onChange={(text) => onChange({ ...block, text })}
                    placeholder={tr("Le bon plan : astuce, horaire à connaître, plat à commander…", "The insider tip: trick, time to know, dish to order…")}
                />
            );
            break;
        case "quote":
            body = (
                <div className="grid gap-2">
                    <AutoText value={block.text} onChange={(text) => onChange({ ...block, text })} placeholder={tr("La citation", "The quote")} className="a-serif text-xl italic" />
                    <input value={block.cite} onChange={(event) => onChange({ ...block, cite: event.target.value })} placeholder={tr("Qui le dit ? (facultatif)", "Who says it? (optional)")} className="a-input" />
                </div>
            );
            break;
        case "list":
            body = (
                <div className="grid gap-2">
                    <AutoText value={block.items.join("\n")} onChange={(text) => onChange({ ...block, items: text.split("\n") })} placeholder={tr("Un élément par ligne", "One item per line")} />
                    <label className="flex items-center gap-2 text-sm font-semibold">
                        <input type="checkbox" checked={block.ordered} onChange={(event) => onChange({ ...block, ordered: event.target.checked })} />
                        {tr("Liste numérotée", "Numbered list")}
                    </label>
                </div>
            );
            break;
        case "image":
            body = <ImageField postId={postId} block={block} onChange={onChange} />;
            break;
        case "place": {
            const picked = names[block.slug];
            body = (
                <div className="grid gap-2">
                    {block.slug ? (
                        <div className="flex items-center gap-3 rounded-xl bg-soft px-3 py-2.5">
                            <MapPin size={18} className="shrink-0 text-brand-600" />
                            <span className="min-w-0 flex-1">
                                <span className="block truncate font-bold">{picked?.name ?? block.slug}</span>
                                {picked && <span className="block truncate text-xs text-muted">{[picked.neighborhood, picked.city].filter(Boolean).join(", ")}</span>}
                            </span>
                            <button type="button" onClick={() => onChange({ ...block, slug: "" })} className="text-xs font-bold text-muted hover:text-ink">
                                {tr("Changer", "Change")}
                            </button>
                        </div>
                    ) : (
                        <PlacePicker
                            onPick={(place) => {
                                onNamed(place);
                                onChange({ ...block, slug: place.slug });
                            }}
                        />
                    )}
                    <AutoText
                        value={block.note}
                        onChange={(note) => onChange({ ...block, note })}
                        placeholder={tr("Pourquoi on y va : ce qu'on y mange, l'ambiance, le prix, le moment idéal…", "Why go: what to eat, the vibe, the price, the best moment…")}
                    />
                    <p className="text-xs text-muted">
                        {tr(
                            "La carte affiche en direct les prix, les horaires et « ouvert maintenant ». Le lieu est numéroté et placé sur la carte de l'article.",
                            "The card shows live prices, hours and “open now”. The place is numbered and placed on the article's map."
                        )}
                    </p>
                </div>
            );
            break;
        }
        case "places":
            body = (
                <div className="grid gap-2">
                    <input value={block.title} onChange={(event) => onChange({ ...block, title: event.target.value })} placeholder={tr("Titre de la sélection (facultatif)", "Pick list title (optional)")} className="a-input" />
                    {block.slugs.length > 0 && (
                        <ul className="flex flex-wrap gap-1.5">
                            {block.slugs.map((slug) => (
                                <li key={slug} className="flex items-center gap-1 rounded-full bg-soft py-1 pr-1 pl-3 text-sm font-semibold">
                                    {names[slug]?.name ?? slug}
                                    <button type="button" onClick={() => onChange({ ...block, slugs: block.slugs.filter((item) => item !== slug) })} className="grid h-6 w-6 place-items-center rounded-full hover:bg-white" aria-label={tr("Retirer", "Remove")}>
                                        <X size={13} />
                                    </button>
                                </li>
                            ))}
                        </ul>
                    )}
                    <PlacePicker
                        exclude={block.slugs}
                        onPick={(place) => {
                            onNamed(place);
                            onChange({ ...block, slugs: [...block.slugs, place.slug] });
                        }}
                    />
                </div>
            );
            break;
    }

    const Icon = meta.icon;
    return (
        <div className="group rounded-2xl border border-transparent p-2 transition hover:border-line focus-within:border-line">
            <div className="mb-1.5 flex items-center gap-1 text-xs font-bold text-muted">
                <Icon size={14} />
                <span className="mr-auto">{tr(...meta.label)}</span>
                <button type="button" disabled={first} onClick={() => onMove(-1)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-soft disabled:opacity-30" aria-label={tr("Monter", "Move up")}>
                    <ArrowUp size={14} />
                </button>
                <button type="button" disabled={last} onClick={() => onMove(1)} className="grid h-7 w-7 place-items-center rounded-lg hover:bg-soft disabled:opacity-30" aria-label={tr("Descendre", "Move down")}>
                    <ArrowDown size={14} />
                </button>
                <button type="button" onClick={onRemove} className="grid h-7 w-7 place-items-center rounded-lg text-bad hover:bg-red-50" aria-label={tr("Supprimer le bloc", "Delete block")}>
                    <Trash2 size={14} />
                </button>
            </div>
            {body}
        </div>
    );
}
