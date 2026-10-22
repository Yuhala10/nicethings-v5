import PageFade from "@/components/site/PageFade";

// Going from one page to another. The page arriving fades in (PageFade,
// site.css "From one page to another"), from where the page being left had
// dimmed to when the link was tapped (components/site/NavProgress.tsx): one
// continuous movement, with no blink in between.
//
// Opacity and nothing else, on purpose. The browser's own page transitions
// were tried here: they photograph the whole page being left, and on a long
// page that was more than a phone could hold; it reloaded the tab. And a
// wrapper that moved or scaled would carry along what the pages pin to the
// screen (the map, the guidance).
export default function Template({ children }: { children: React.ReactNode }) {
    return <PageFade>{children}</PageFade>;
}
