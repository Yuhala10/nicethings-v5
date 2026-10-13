// A guest's notebook: an article by someone outside the team (a creator, a
// chef, a traveller) about the places they went to, with their own photos,
// published with their agreement. In the console it is an ordinary article
// with the guest's name as its author and the tag "invite"; the site then
// says whose it is (components/blog/ArticleView.tsx).

export const GUEST_TAG = "invite";

const plain = (text: string) => text.normalize("NFD").replace(/[̀-ͯ]/g, "").trim().toLowerCase();

export function isGuest(post: { tags: string[] }) {
    return post.tags.some((tag) => plain(tag) === GUEST_TAG);
}
