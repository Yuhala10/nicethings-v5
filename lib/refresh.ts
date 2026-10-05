import { revalidatePath, revalidateTag } from "next/cache";
import { POSTS_TAG } from "./blog/server";
import { PLACES_TAG } from "./places/server";

// Called after every save from the team console or an owner's space: the
// very next reader gets the new version. The "max" profile would hand out
// the old copy one more time while it refreshes behind the scenes, so an
// article saved twice opened on its first draft, then on the full text.
const NOW = { expire: 0 };

// The sitemap reads the database itself, so it is dropped by its address.
const SITEMAP = "/sitemap.xml";

export function refreshPlaces() {
    revalidateTag(PLACES_TAG, NOW);
    revalidatePath(SITEMAP);
}

export function refreshPosts() {
    revalidateTag(POSTS_TAG, NOW);
    revalidatePath(SITEMAP);
}
