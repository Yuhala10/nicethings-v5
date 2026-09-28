import { BedDouble, Coffee, Heart, Moon, Sun, Users, UtensilsCrossed, Wine, type LucideIcon } from "lucide-react";
import type { IntentKey } from "@/lib/concierge/query";

// Quick picks shared by the search page and the map, in the order people
// reach for them.
export const INTENT_ICONS: Record<IntentKey, LucideIcon> = {
    eat: UtensilsCrossed,
    coffee: Coffee,
    drinks: Wine,
    tonight: Moon,
    date: Heart,
    chill: Sun,
    family: Users,
    stay: BedDouble,
};

export const INTENT_ORDER: IntentKey[] = ["eat", "coffee", "drinks", "tonight", "date", "chill", "family", "stay"];
