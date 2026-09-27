"use client";
import { Globe2 } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
export default function LanguageSwitcher(){const{language,setLanguage}=useLanguage();return <div className="nt-language-switcher" role="group" aria-label="Language"><Globe2 size={15}/><button type="button" className={language==="en"?"active":""} onClick={()=>setLanguage("en")}>EN</button><span>/</span><button type="button" className={language==="fr"?"active":""} onClick={()=>setLanguage("fr")}>FR</button></div>}
