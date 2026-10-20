// Structured data for search engines, ready for a <script type="application/ld+json">.
// Several entries go in one "@graph" under a single "@context": some readers
// (Safari among them) look for "@context" at the top and fail on a bare list.
type Entry = Record<string, unknown>;

export function jsonLdScript(data: Entry | Entry[]) {
    const entries = Array.isArray(data) ? data : [data];
    const value =
        entries.length === 1
            ? entries[0]
            : {
                  "@context": "https://schema.org",
                  "@graph": entries.map((entry) => Object.fromEntries(Object.entries(entry).filter(([key]) => key !== "@context"))),
              };
    return JSON.stringify(value).replace(/</g, "\\u003c");
}
