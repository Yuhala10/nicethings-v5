/// <reference types="react/canary" />
import { ViewTransition } from "react";

// Going from one page to another. A template is made anew for each page, so
// the page being left and the page arriving are two different things to the
// browser: the first lifts away, the second settles in (site.css, "From one
// page to another"). The menu and the header are not part of it and stay
// still. A browser that cannot do this simply shows the next page, as before.
export default function Template({ children }: { children: React.ReactNode }) {
    return (
        <ViewTransition enter="nt-page-in" exit="nt-page-out" default="none">
            {children}
        </ViewTransition>
    );
}
