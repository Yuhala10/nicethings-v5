import { SITE_URL } from "./i18n/config";

// Runs on every public page, before the app starts. Lets a page say when it
// did not come out right on this browser, so the team learns about it
// without waiting for someone to describe it: shown without its design (an
// old browser, a data-saving mode, a blocked style file), machine-
// translated, or stopped by a script error. Nothing is sent when all is
// well, and nothing about the visitor is sent at all: only the kind of
// trouble, the page and the site they came from (see app/api/health).
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
var noise=/load failed|failed to fetch|networkerror|aborterror|resizeobserver|^script error\\.?$/i;
window.addEventListener("error",function(e){var m=e&&e.message;if(!m||noise.test(m))return;report("script-error",m+" @ "+String(e.filename||"").split("/").pop()+":"+(e.lineno||0))});
window.addEventListener("unhandledrejection",function(e){var r=e&&e.reason;var m=String((r&&r.message)||r||"");if(m&&!noise.test(m))report("script-error",m)});
setTimeout(function(){
try{
var probe=document.createElement("div");probe.className="hidden";document.body.appendChild(probe);
var utilities=getComputedStyle(probe).display==="none";document.body.removeChild(probe);
var colours=String(getComputedStyle(document.documentElement).getPropertyValue("--nt-bg")||"").replace(/\\s/g,"")!=="";
if(!utilities||!colours)report("styles-missing","classes "+(utilities?"ok":"ignorees")+", couleurs "+(colours?"ok":"absentes"));
var elsewhere=/\\.translate\\.goog$/.test(location.hostname);
if(elsewhere||/(^|\\s)translated-(ltr|rtl)/.test(document.documentElement.className)||document.getElementsByTagName("font").length>15)report("translated",elsewhere?"via le service de traduction de Google":"par le navigateur");
}catch(e){}
},4000);
})();`;
