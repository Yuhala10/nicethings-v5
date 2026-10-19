// The welcome (components/site/Welcome.tsx) is shown to someone who enters
// the site: a new tab, a link tapped in a chat, or a return after a while
// away. This runs before the page is drawn, so the welcome is there from the
// first frame or not at all, never flashing in over a page already shown.
//
// "Entering" is told from the browser itself: nothing kept for this tab yet,
// or the site last seen more than half an hour ago. Robots, and the pages a
// person opens to do one precise thing at once (their invitation, a poster
// to print, the guidance), go straight in.
//
// The welcome waits for the visitor: it opens on their touch, or on any key,
// and on nothing else. That touch is listened for here and not in the page's
// own scripts, so it works from the first instant, before they have arrived.

export const WELCOME_SEEN_KEY = "nt_seen";

export const WELCOME_SCRIPT = `(function(){try{
var d=document.documentElement,k="${WELCOME_SEEN_KEY}",n=Date.now();
var last=Number(localStorage.getItem(k))||0,here=sessionStorage.getItem(k);
sessionStorage.setItem(k,"1");localStorage.setItem(k,String(n));
if(/bot|crawl|spider|lighthouse|headless|preview/i.test(navigator.userAgent))return;
if(/\\/(invitation|y-aller)\\//.test(location.pathname)||/\\/affiche\\/?$/.test(location.pathname))return;
if(here&&n-last<18e5)return;
d.setAttribute("data-nt-quote",String(Math.floor(n/1000)%3));
d.setAttribute("data-nt-welcome","1");
var events=["pointerdown","touchstart","keydown"];
var open=function(){
if(d.getAttribute("data-nt-welcome")!=="1")return;
d.setAttribute("data-nt-welcome","open");d.setAttribute("data-nt-entered",String(Date.now()));
for(var i=0;i<events.length;i++)removeEventListener(events[i],open,true);
setTimeout(function(){d.removeAttribute("data-nt-welcome")},720);
};
for(var i=0;i<events.length;i++)addEventListener(events[i],open,{capture:true,passive:true});
}catch(e){}})();`;
