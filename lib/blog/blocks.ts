// An article is a list of blocks, stored as JSON and drawn by
// components/blog/ArticleBody. Never raw HTML: text only carries a tiny
// inline syntax (**bold**, *italic*, [link](https://…)), turned into React
// elements, so nothing typed in the editor can inject code into the site.

export type Block =
    | { type: "p"; text: string }
    | { type: "h2"; text: string }
    | { type: "h3"; text: string }
    | { type: "image"; url: string; alt: string; caption: string }
    | { type: "place"; slug: string; note: string }
    | { type: "places"; title: string; slugs: string[] }
    | { type: "quote"; text: string; cite: string }
    | { type: "list"; ordered: boolean; items: string[] }
    | { type: "tip"; text: string };

export type BlockType = Block["type"];

export const BLOCK_TYPES: BlockType[] = ["p", "h2", "h3", "image", "place", "places", "quote", "list", "tip"];

export function emptyBlock(type: BlockType): Block {
    switch (type) {
        case "image":
            return { type, url: "", alt: "", caption: "" };
        case "place":
            return { type, slug: "", note: "" };
        case "places":
            return { type, title: "", slugs: [] };
        case "quote":
            return { type, text: "", cite: "" };
        case "list":
            return { type, ordered: false, items: [""] };
        default:
            return { type, text: "" };
    }
}

const str = (value: unknown, max: number) => (typeof value === "string" ? value.replace(/\r/g, "").slice(0, max) : "");
const SLUG = /^[a-z0-9-]{1,200}$/;
// Images come from our own storage (or another https address).
const safeUrl = (value: unknown) => {
    const url = str(value, 600).trim();
    return /^https:\/\/[^\s"'<>]+$/.test(url) ? url : "";
};

// Cleans blocks coming from the editor: unknown types and fields dropped,
// lengths capped, empty blocks removed.
export function cleanBlocks(input: unknown): Block[] {
    if (!Array.isArray(input)) return [];
    const blocks: Block[] = [];
    for (const raw of input.slice(0, 300)) {
        if (!raw || typeof raw !== "object") continue;
        const item = raw as Record<string, unknown>;
        switch (item.type) {
            case "p":
            case "h2":
            case "h3":
            case "tip": {
                const text = str(item.text, item.type === "p" || item.type === "tip" ? 4000 : 200).trim();
                if (text) blocks.push({ type: item.type, text });
                break;
            }
            case "image": {
                const url = safeUrl(item.url);
                if (url) blocks.push({ type: "image", url, alt: str(item.alt, 200).trim(), caption: str(item.caption, 300).trim() });
                break;
            }
            case "place": {
                const slug = str(item.slug, 200);
                if (SLUG.test(slug)) blocks.push({ type: "place", slug, note: str(item.note, 1500).trim() });
                break;
            }
            case "places": {
                const slugs = (Array.isArray(item.slugs) ? item.slugs : []).map((value) => str(value, 200)).filter((slug) => SLUG.test(slug));
                if (slugs.length) blocks.push({ type: "places", title: str(item.title, 160).trim(), slugs: [...new Set(slugs)].slice(0, 24) });
                break;
            }
            case "quote": {
                const text = str(item.text, 1200).trim();
                if (text) blocks.push({ type: "quote", text, cite: str(item.cite, 160).trim() });
                break;
            }
            case "list": {
                const items = (Array.isArray(item.items) ? item.items : []).map((value) => str(value, 600).trim()).filter(Boolean).slice(0, 50);
                if (items.length) blocks.push({ type: "list", ordered: item.ordered === true, items });
                break;
            }
        }
    }
    return blocks;
}

// Every place an article shows, in order of appearance.
export function placesIn(blocks: Block[]) {
    const slugs: string[] = [];
    for (const block of blocks) {
        if (block.type === "place") slugs.push(block.slug);
        if (block.type === "places") slugs.push(...block.slugs);
    }
    return [...new Set(slugs)];
}

export function plainText(text: string) {
    return text.replace(/\*\*(.+?)\*\*/g, "$1").replace(/\*(.+?)\*/g, "$1").replace(/\[([^\]]+)\]\([^)]+\)/g, "$1");
}

function blockWords(block: Block) {
    switch (block.type) {
        case "list":
            return block.items.join(" ");
        case "place":
            return block.note;
        case "image":
            return block.caption;
        case "places":
            return block.title;
        case "quote":
            return block.text;
        default:
            return block.text;
    }
}

// About 200 words a minute, plus a little for each picture and place.
export function readingMinutes(blocks: Block[]) {
    const words = blocks.map((block) => plainText(blockWords(block))).join(" ").split(/\s+/).filter(Boolean).length;
    const visuals = blocks.filter((block) => block.type === "image" || block.type === "place").length;
    return Math.max(1, Math.round(words / 200 + visuals * 0.15));
}

// Headings, with stable anchors, for the table of contents.
export function outline(blocks: Block[]) {
    const used = new Set<string>();
    return blocks.flatMap((block, index) => {
        if (block.type !== "h2") return [];
        let id = plainText(block.text)
            .normalize("NFD")
            .replace(/[̀-ͯ]/g, "")
            .toLowerCase()
            .replace(/[^a-z0-9]+/g, "-")
            .replace(/^-+|-+$/g, "")
            .slice(0, 60) || `partie-${index}`;
        while (used.has(id)) id = `${id}-2`;
        used.add(id);
        return [{ index, id, text: plainText(block.text) }];
    });
}

export type Inline = { kind: "text" | "bold" | "italic"; text: string } | { kind: "link"; text: string; href: string };

// "**Bon** plan à [Bastos](/fr/yaounde/bastos)" → pieces to draw.
export function parseInline(text: string): Inline[] {
    const pieces: Inline[] = [];
    const pattern = /\*\*(.+?)\*\*|\*(.+?)\*|\[([^\]]+)\]\(([^)\s]+)\)/g;
    let last = 0;
    for (const match of text.matchAll(pattern)) {
        const at = match.index ?? 0;
        if (at > last) pieces.push({ kind: "text", text: text.slice(last, at) });
        if (match[1]) pieces.push({ kind: "bold", text: match[1] });
        else if (match[2]) pieces.push({ kind: "italic", text: match[2] });
        else {
            const href = match[4];
            // Only web addresses and links inside the site.
            if (/^https?:\/\//.test(href) || /^\/[a-z0-9/_-]*$/i.test(href)) pieces.push({ kind: "link", text: match[3], href });
            else pieces.push({ kind: "text", text: match[3] });
        }
        last = at + match[0].length;
    }
    if (last < text.length) pieces.push({ kind: "text", text: text.slice(last) });
    return pieces;
}
