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
    // The blue tick (gold for the founder), and what they are known as.
    verified: boolean;
    verifiedLabel: string | null;
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
    // Activité: what has not been seen yet, and a level waiting to be celebrated.
    unread: number;
    levelUp: { id: string; level: number } | null;
    // La série (null before script 014).
    series: Series | null;
};

// One line of Activité.
export type Notice = {
    id: string;
    kind: "vote" | "reply" | "comment" | "like" | "tip_vote" | "level" | "follow" | "going" | "outing_like" | "outing_comment" | "approved" | "verified" | "flame";
    actor: Person | null;
    data: { place?: string; name?: string; level?: number; snippet?: string; outing?: string; flame?: number };
    read: boolean;
    createdAt: string;
};

// What a member can tell about a place right now.
export type PulseView = { kind: string; count: number; last: string; people: Person[] };

// The way to a place, written by a member.
export type TipView = { id: string; kind: "taxi" | "way"; body: string; person: Person; helpful: number; createdAt: string; mine: boolean; voted: boolean; pending: boolean };

// One moment of "Ça bouge au kwat".
export type KwatItem =
    | { type: "review"; id: string; at: string; person: Person; place: KwatPlace; rating: number; body: string | null }
    | { type: "photo"; id: string; at: string; person: Person | null; place: KwatPlace; url: string; kind: "photo" | "video"; caption: string | null }
    | { type: "pulse"; id: string; at: string; person: Person; place: KwatPlace; pulse: string }
    | { type: "tip"; id: string; at: string; person: Person; place: KwatPlace; body: string }
    | { type: "outing"; id: string; at: string; person: Person; place: KwatPlace; cover: string; count: number; mood: string | null; body: string | null; likes: number };

export type KwatPlace = { slug: string; name: string; neighborhood: string | null; city: string; cover: string | null };

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
    // What is good to know (generator, the match, MoMo…), said by at least one visitor.
    facts: { tag: string; count: number }[];
    // What people say they paid per person, when enough of them said.
    price: { median: number; count: number } | null;
};

// ---------------------------------------------------------------- messages (script 014)

export type ChatKind = "text" | "photo" | "voice" | "place" | "plan";

// "En ligne", or when they were last there (null when either of the two hides it).
export type ChatPresence = { online: boolean; lastSeen: string | null };

// La flamme: the days in a row both wrote. `ending`: alive since yesterday,
// not yet kept today, and the evening has come.
export type ChatFlame = { count: number; best: number; alive: boolean; ending: boolean };

export type ChatMessage = {
    id: string;
    mine: boolean;
    kind: ChatKind;
    body: string | null;
    media: { url: string; width: number | null; height: number | null; duration: number | null; waveform?: number[] | null } | null;
    // A voice note the other person has listened to (script 015).
    listened?: boolean;
    place: KwatPlace | null;
    // "On y va ?": when, and each one's answer.
    plan: { at: string; mine: "yes" | "no" | null; theirs: "yes" | "no" | null } | null;
    reply: { id: string; mine: boolean; kind: ChatKind; body: string | null; deleted: boolean } | null;
    reactions: { emoji: string; count: number; mine: boolean }[];
    deleted: boolean;
    // Its file is still on its way (only the sender sees it).
    pending: boolean;
    at: string;
    changedAt: string;
};

export type ChatRequest = "incoming" | "outgoing" | null;

export type ChatSummary = {
    id: string;
    person: Person;
    last: { kind: ChatKind; body: string | null; mine: boolean; at: string; deleted: boolean } | null;
    unread: number;
    flame: ChatFlame | null;
    pinned: boolean;
    muted: boolean;
    archived: boolean;
    request: ChatRequest;
    presence: ChatPresence;
    blocked: boolean;
};

export type ChatWrite = { ok: true } | { ok: false; why: "blocked" | "unavailable" | "closed" | "following" | "limit" };

export type ChatThread = {
    chat: { id: string; key: string; accepted: boolean; request: ChatRequest; pinned: boolean; muted: boolean; archived: boolean; flame: ChatFlame | null } | null;
    person: Person;
    presence: ChatPresence;
    write: ChatWrite;
    blocked: boolean;
    // When they last read (null when either hides the blue ticks), and when
    // they were last on the site (the grey double tick).
    theirRead: string | null;
    theirActive: string | null;
    messages: ChatMessage[];
    more: boolean;
};

export type ChatPrivacy = { messagesFrom: "everyone" | "following" | "nobody"; hideLastSeen: boolean; hideRead: boolean };

// La série: the weeks in a row a member gave something to the city.
export type Series = { weeks: number; thisWeek: boolean; best: number };

// "Ma sortie": an outing at a real place, as everyone sees it.
export type OutingMedia = { kind: "photo" | "video"; url: string; poster: string | null; width: number | null; height: number | null };

export type OutingView = {
    id: string;
    person: Person;
    place: KwatPlace;
    mood: string | null;
    // One of NiceThings' soundtracks (lib/soundtracks.ts), for photos.
    sound: string | null;
    pricePaid: number | null;
    company: string | null;
    body: string | null;
    media: OutingMedia[];
    likes: number;
    comments: number;
    goers: number;
    status: "DRAFT" | "PENDING" | "PUBLISHED" | "HIDDEN";
    at: string;
    mine: boolean;
    liked: boolean;
    going: boolean;
};
