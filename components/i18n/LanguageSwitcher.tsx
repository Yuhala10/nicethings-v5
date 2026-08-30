"use client";

import { Globe2, Check } from "lucide-react";
import { useLanguage } from "./LanguageProvider";
import { useState, useRef, useEffect } from "react";
import { useTranslation } from "../../lib/i18n/useTranslation";

type Language = "en" | "fr";

interface LanguageOption {
  code: Language;
  name: string;
  nativeName: string;
  flag: string;
}

const LANGUAGES: LanguageOption[] = [
  {
    code: "en",
    name: "English",
    nativeName: "English",
    flag: "🇬🇧",
  },
  {
    code: "fr",
    name: "Français",
    nativeName: "Français",
    flag: "🇫🇷",
  },
];

export default function LanguageSwitcher() {
  const { language, setLanguage } = useLanguage();
  const t = useTranslation();
  const [isOpen, setIsOpen] = useState(false);
  const containerRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false);
      }
    }

    if (isOpen) {
      document.addEventListener("mousedown", handleClickOutside);
      return () => {
        document.removeEventListener("mousedown", handleClickOutside);
      };
    }
  }, [isOpen]);

  const currentLanguage = LANGUAGES.find((l) => l.code === language);

  const handleLanguageChange = (newLanguage: Language) => {
    if (newLanguage !== language) {
      setLanguage(newLanguage);
    }
    setIsOpen(false);
  };

  return (
    <div
      ref={containerRef}
      className="nt-language-switcher-container"
      role="region"
      aria-label={t.language.changeLanguage}
    >
      {/* Main Button */}
      <button
        type="button"
        className="nt-language-switcher-button"
        onClick={() => setIsOpen(!isOpen)}
        aria-expanded={isOpen}
        aria-haspopup="listbox"
        aria-label={`${t.language.changeLanguage}: ${currentLanguage?.nativeName}`}
      >
        <span className="nt-language-icon">
          <Globe2 size={18} strokeWidth={1.5} />
        </span>

        <span className="nt-language-label">
          {currentLanguage?.name}
        </span>

        <span
          className={`nt-language-chevron ${isOpen ? "open" : ""}`}
          aria-hidden="true"
        >
          <svg
            width="16"
            height="16"
            viewBox="0 0 16 16"
            fill="none"
            xmlns="http://www.w3.org/2000/svg"
          >
            <path
              d="M4 6L8 10L12 6"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </span>
      </button>

      {/* Dropdown Menu */}
      {isOpen && (
        <div className="nt-language-dropdown" role="listbox">
          {LANGUAGES.map((lang) => {
            const isSelected = lang.code === language;
            return (
              <button
                key={lang.code}
                type="button"
                className={`nt-language-option ${
                  isSelected ? "selected" : ""
                }`}
                onClick={() => handleLanguageChange(lang.code)}
                role="option"
                aria-selected={isSelected}
                aria-label={`${lang.nativeName}${
                  isSelected ? " (selected)" : ""
                }`}
              >
                <span className="nt-language-option-flag">
                  {lang.flag}
                </span>

                <span className="nt-language-option-content">
                  <span className="nt-language-option-name">
                    {lang.nativeName}
                  </span>
                  <span className="nt-language-option-subtext">
                    {lang.name}
                  </span>
                </span>

                {isSelected && (
                  <span
                    className="nt-language-option-checkmark"
                    aria-hidden="true"
                  >
                    <Check size={16} strokeWidth={2.5} />
                  </span>
                )}
              </button>
            );
          })}
        </div>
      )}
    </div>
  );
}
