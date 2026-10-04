import Link from "next/link";
import { parseInline } from "@/lib/blog/blocks";

// Article text with its little inline syntax (**bold**, *italic*, links),
// drawn as React elements: no HTML from the editor ever reaches the page.
export default function Inline({ text }: { text: string }) {
    return (
        <>
            {parseInline(text).map((piece, index) => {
                switch (piece.kind) {
                    case "bold":
                        return (
                            <strong key={index} className="font-bold text-text">
                                {piece.text}
                            </strong>
                        );
                    case "italic":
                        return <em key={index}>{piece.text}</em>;
                    case "link":
                        return piece.href.startsWith("/") ? (
                            <Link key={index} href={piece.href} className="font-semibold text-brand-600 underline decoration-brand-200 decoration-2 underline-offset-4 hover:decoration-brand-500">
                                {piece.text}
                            </Link>
                        ) : (
                            <a
                                key={index}
                                href={piece.href}
                                target="_blank"
                                rel="noopener noreferrer nofollow"
                                className="font-semibold text-brand-600 underline decoration-brand-200 decoration-2 underline-offset-4 hover:decoration-brand-500"
                            >
                                {piece.text}
                            </a>
                        );
                    default:
                        return <span key={index}>{piece.text}</span>;
                }
            })}
        </>
    );
}
