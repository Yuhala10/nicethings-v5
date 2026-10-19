import type { Stats } from "./rules";

// A profile as everyone sees it: under a review, a comment, on a wall.
export type Person = {
    id: string;
    handle: string;
    name: string | null;
    // The picture to show: their photo, or their drawn avatar.
    face: string;
    area: string | null;
    city: string | null;
    role: "member" | "team" | "founder";
    memberNo: number;
    level: number;
    points: number;
};

// The profile of the person signed in on this phone, as they see it.
export type Me = Person & {
    avatar: string | null;
    photo: string | null;
    bio: string | null;
    topPlaces: string[];
    saves: string[];
    stats: Stats;
    createdAt: string;
};

export type ReviewView = {
    id: string;
    person: Person;
    rating: number;
    body: string | null;
    tags: string[];
    pricePaid: number | null;
    company: string | null;
    helpful: number;
    replies: number;
    createdAt: string;
    updatedAt: string;
    pending: boolean;
    mine: boolean;
    voted: boolean;
};

export type CommentView = {
    id: string;
    person: Person;
    body: string;
    createdAt: string;
    pending: boolean;
    mine: boolean;
};

// What a place's reviews add up to.
export type ReviewSummary = {
    count: number;
    average: number;
    // How many gave each mark, 1 to 5.
    spread: [number, number, number, number, number];
    tags: { tag: string; count: number }[];
    // What people say they paid per person, when enough of them said.
    price: { median: number; count: number } | null;
};
