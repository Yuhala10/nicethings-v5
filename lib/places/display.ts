// Visual identity per category, used when a place has no photo yet so lists
// still look alive, and for map pin glyphs.

export const CATEGORY_STYLE: Record<string, { emoji: string; from: string; to: string }> = {
    Restaurant: { emoji: "🍽️", from: "#fed7aa", to: "#fb923c" },
    Cafe: { emoji: "☕", from: "#fde68a", to: "#d97706" },
    Bar: { emoji: "🍹", from: "#fbcfe8", to: "#db2777" },
    Club: { emoji: "🪩", from: "#c4b5fd", to: "#6d28d9" },
    Hotel: { emoji: "🛎️", from: "#bfdbfe", to: "#2563eb" },
    Bakery: { emoji: "🥐", from: "#fef3c7", to: "#f59e0b" },
    Shopping: { emoji: "🛍️", from: "#e9d5ff", to: "#9333ea" },
    Beauty: { emoji: "💅", from: "#fecdd3", to: "#e11d48" },
    Wellness: { emoji: "🧘", from: "#bbf7d0", to: "#16a34a" },
    Entertainment: { emoji: "🎳", from: "#a5f3fc", to: "#0891b2" },
    Culture: { emoji: "🎭", from: "#fde68a", to: "#b45309" },
    Nature: { emoji: "🌳", from: "#bbf7d0", to: "#15803d" },
    Other: { emoji: "📍", from: "#e7e5e4", to: "#78716c" },
};

export function categoryStyle(category: string) {
    return CATEGORY_STYLE[category] ?? CATEGORY_STYLE.Other;
}
