import { notFound } from "next/navigation";

// Any unknown URL under /fr or /en renders the site's own 404 page.
export default function UnknownPage() {
    notFound();
}
