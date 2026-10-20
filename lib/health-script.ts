import { SITE_URL } from "./i18n/config";

// Runs on every public page, before the app starts. Lets a page say when it
// did not come out right on this browser, so the team learns about it
// without waiting for someone to describe it: shown without its design (an
// old browser, a data-saving mode, a blocked style file), machine-
// translated, or stopped by a script error. Nothing is sent when all is
// well, and nothing about the visitor is sent at all: only the kind of
// trouble, the page and the site they came from (see app/api/health).
//
// A browser too old for the site (no CSS layers, or no `?.` in its
// JavaScript: old Chrome never updated, browsers built on an old engine)
// cannot show the design nor run the app. It gets a notice instead of a
// broken page, with a way out: open the page in Chrome, or update Chrome.
// Its errors are expected, so they are not reported one by one.
//
// Written in the oldest JavaScript on purpose: the browsers that fail to
// run the app are exactly the ones this must still run on.
export const HEALTH_SCRIPT = `(function(){
if(navigator.webdriver)return;
var api=${JSON.stringify(`${SITE_URL}/api/health`)},sent={};
function report(code,detail){
if(sent[code])return;sent[code]=1;
var ref=null;try{ref=document.referrer?document.referrer.split("/")[2]||null:null}catch(e){}
var body=JSON.stringify({code:code,detail:String(detail||"").slice(0,300),path:location.pathname,ref:ref});
try{if(navigator.sendBeacon){navigator.sendBeacon(api,body)}else{var x=new XMLHttpRequest();x.open("POST",api,true);x.setRequestHeader("Content-Type","text/plain");x.send(body)}}catch(e){}
}
var old=[];
if(!window.CSSLayerBlockRule)old.push("css");
try{new Function("var a={};return a?.b??1")}catch(e){if(e instanceof SyntaxError)old.push("js")}
var noise=/load failed|failed to fetch|networkerror|aborterror|resizeobserver|@context|^script error\\.?$/i;
window.addEventListener("error",function(e){var m=e&&e.message;if(old.length||!m||noise.test(m))return;report("script-error",m+" @ "+String(e.filename||"").split("/").pop()+":"+(e.lineno||0))});
window.addEventListener("unhandledrejection",function(e){if(old.length)return;var r=e&&e.reason;var m=String((r&&r.message)||r||"");if(m&&!noise.test(m))report("script-error",m)});
function notice(){
try{if(sessionStorage.getItem("nt-old"))return}catch(e){}
var en=document.documentElement.lang==="en",android=/android/i.test(navigator.userAgent);
var here=location.host+location.pathname+location.search;
var box=document.createElement("div");
box.setAttribute("role","alert");
box.style.cssText="position:fixed;left:0;right:0;top:0;z-index:2147483647;background:#14110f;color:#fff;font:15px/1.45 sans-serif;padding:14px 16px 16px;box-shadow:0 4px 18px rgba(0,0,0,.35)";
var link="display:inline-block;margin:10px 10px 0 0;padding:11px 16px;border-radius:999px;font-weight:bold;text-decoration:none;";
box.innerHTML="<strong style=\\"display:block;font-size:16px;margin-bottom:4px\\">"+(en?"Your browser is too old for NiceThings":"Ton navigateur est trop ancien pour NiceThings")+"</strong>"
+(en?"The page cannot show properly here. ":"La page ne peut pas s\\u2019afficher correctement ici. ")
+(android?(en?"Open it in an up-to-date Chrome: it is free.":"Ouvre-la dans Chrome \\u00e0 jour : c\\u2019est gratuit."):(en?"Update your browser (or your phone) to see it.":"Mets \\u00e0 jour ton navigateur (ou ton t\\u00e9l\\u00e9phone) pour la voir."))
+"<br>"+(android?"<a style=\\""+link+"background:#f2c14e;color:#14110f\\" href=\\"intent://"+here+"#Intent;scheme=https;package=com.android.chrome;end\\">"+(en?"Open in Chrome":"Ouvrir dans Chrome")+"</a>"
+"<a style=\\""+link+"background:#fff;color:#14110f\\" href=\\"https://play.google.com/store/apps/details?id=com.android.chrome\\">"+(en?"Update Chrome":"Mettre \\u00e0 jour Chrome")+"</a>":"")
+"<a style=\\""+link+"color:#fff;border:1px solid rgba(255,255,255,.5)\\" href=\\"#\\" data-close=\\"1\\">"+(en?"Close":"Fermer")+"</a>";
box.onclick=function(e){var t=e.target||e.srcElement;if(t&&t.getAttribute&&t.getAttribute("data-close")){if(e.preventDefault)e.preventDefault();try{sessionStorage.setItem("nt-old","1")}catch(x){}if(box.parentNode)box.parentNode.removeChild(box)}};
document.body.appendChild(box);
}
setTimeout(function(){
try{
if(old.length){report("old-browser",old.join("+"));notice();return}
var probe=document.createElement("div");probe.className="hidden";document.body.appendChild(probe);
var utilities=getComputedStyle(probe).display==="none";document.body.removeChild(probe);
var colours=String(getComputedStyle(document.documentElement).getPropertyValue("--nt-bg")||"").replace(/\\s/g,"")!=="";
if(!utilities||!colours)report("styles-missing","classes "+(utilities?"ok":"ignorees")+", couleurs "+(colours?"ok":"absentes"));
var elsewhere=/\\.translate\\.goog$/.test(location.hostname);
if(elsewhere||/(^|\\s)translated-(ltr|rtl)/.test(document.documentElement.className)||document.getElementsByTagName("font").length>15)report("translated",elsewhere?"via le service de traduction de Google":"par le navigateur");
}catch(e){}
},old.length?600:4000);
})();`;
