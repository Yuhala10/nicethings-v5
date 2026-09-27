import type { PRIVACY } from "@/lib/legal";

type Doc = (typeof PRIVACY)["fr"];

export default function LegalPage({ doc }: { doc: Doc }) {
    return (
        <article className="mx-auto max-w-2xl px-4 pt-6 md:px-6 md:pt-10">
            <h1 className="text-[1.9rem] leading-tight font-extrabold md:text-4xl">{doc.title}</h1>
            <p className="mt-2 text-sm text-muted">{doc.updated}</p>
            {doc.sections.map((section) => (
                <section key={section.heading} className="mt-8">
                    <h2 className="nt-section-title mb-2">{section.heading}</h2>
                    {section.body.map((paragraph) => (
                        <p key={paragraph} className="mb-3 leading-relaxed text-text-2">
                            {paragraph}
                        </p>
                    ))}
                </section>
            ))}
        </article>
    );
}
