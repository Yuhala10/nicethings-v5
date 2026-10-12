import type { PlaceSummary } from "./places/types";

// "On se voit où ?": the rules of a vote among friends, shared by the
// browser and the server (database script 007).

export const POLL_MIN = 2;
export const POLL_MAX = 4;
export const POLLS_PER_DAY = 12; // per browser
export const MAX_POLL_TITLE = 60;
export const MAX_VOTER_NAME = 20;
export const POLL_CODE = /^[a-z2-9]{8}$/;

// Letters and digits that cannot be mistaken for one another when read aloud
// or copied by hand.
const ALPHABET = "abcdefghjkmnpqrstuvwxyz23456789";

export function newPollCode() {
    const bytes = crypto.getRandomValues(new Uint8Array(8));
    return Array.from(bytes, (byte) => ALPHABET[byte % ALPHABET.length]).join("");
}

export type PollOption = { place: PlaceSummary; votes: number; voters: string[] };
export type PollState = { code: string; title: string | null; options: PollOption[]; total: number; mine: string | null };
