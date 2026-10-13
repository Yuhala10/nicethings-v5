// Going from one page to another. A template is made anew for each page, so
// this wrapper is new each time: the page arriving fades in (site.css,
// "From one page to another"). Together with the page being left stepping
// back the moment a link is tapped (components/site/NavProgress.tsx), that
// is the whole change.
//
// Opacity and nothing else, on purpose. The browser's own page transitions
// were tried here: they photograph the whole page being left, and on a long
// page that was more than a phone could hold; it reloaded the tab. And a
// wrapper that moved or scaled would carry along what the pages pin to the
// screen (the map, the guidance).
export default function Template({ children }: { children: React.ReactNode }) {
    return <div className="nt-page">{children}</div>;
}
