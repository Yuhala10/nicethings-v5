"use client";

import {
    createContext,
    useContext,
    useEffect,
    useMemo,
    useState,
    type ReactNode,
} from "react";

import {
    getInitialLanguage,
    setLanguage as persistLanguage,
    type Language,
} from "../../lib/i18n";

type LanguageContextValue = {
    language: Language;
    setLanguage: (language: Language) => void;
};

const LanguageContext = createContext<LanguageContextValue>({
    language: "en",
    setLanguage: () => undefined,
});

/*
 * UI fallback dictionary.
 * Keep each English phrase unique. This layer is intentionally small and
 * complements page-level translations without changing application logic.
 */
const dictionary: Record<string, string> = {
    "Home": "Accueil",
    "Discover": "Découvrir",
    "Nearby": "À proximité",
    "Saved": "Enregistrés",
    "Search": "Rechercher",
    "Profile": "Profil",
    "Contribute": "Contribuer",
    "Suggest a place": "Suggérer un lieu",
    "Around me": "Autour de moi",
    "Privacy": "Confidentialité",
    "Terms": "Conditions",
    "Admin": "Administration",
    "English": "Anglais",
    "Français": "Français",
    "Find nice things around you.": "Trouvez de belles adresses autour de vous.",
    "Discover something nice": "Découvrez quelque chose de sympa",
    "Discover locally.": "Découvrez autour de vous.",
    "Find your next favorite place.": "Trouvez votre prochaine adresse préférée.",
    "Know a place?": "Vous connaissez une adresse ?",
    "Share it with NiceThings": "Partagez-la avec NiceThings",
    "Use my location": "Utiliser ma position",
    "Explore nearby": "Explorer à proximité",
    "Featured": "À la une",
    "Near you": "Près de vous",
    "What are you looking for?": "Que recherchez-vous ?",
    "All": "Tous",
    "Restaurants": "Restaurants",
    "Cafés": "Cafés",
    "Fast Food": "Fast-food",
    "Drinks": "Boissons",
    "Snacks": "Snacks",
    "Other": "Autre",
    "Loading...": "Chargement...",
    "Try again": "Réessayer",
    "Cancel": "Annuler",
    "Confirm": "Confirmer",
    "Save": "Enregistrer",
    "Close": "Fermer",
    "Back": "Retour",
    "View place": "Voir le lieu",
    "Directions": "Itinéraire",
    "Reviews": "Avis",
    "Details": "Détails",
    "Rating": "Note",
    "Address": "Adresse",
    "Neighborhood": "Quartier",
    "Price": "Prix",
    "Opening hours": "Horaires",
    "Phone": "Téléphone",
    "Website": "Site web",
    "Open now": "Ouvert",
    "Closed": "Fermé",
    "I arrived": "Je suis arrivé(e)",
    "Report": "Signaler",
    "No places found.": "Aucun lieu trouvé.",
    "Your privacy matters.": "Votre vie privée compte.",
    "Welcome to NiceThings.": "Bienvenue sur NiceThings.",
    "BEFORE YOU EXPLORE": "AVANT DE COMMENCER",
    "Account & activity": "Compte et activité",
    "Choices": "Vos choix",
    "Contact": "Contact",
    "Discover something nice.": "Découvrez quelque chose de sympa.",
    "Made for discovering Cameroon, one nice place at a time.": "Créé pour découvrir le Cameroun, une belle adresse à la fois.",
    "Simple rules for a better discovery community.": "Des règles simples pour une meilleure communauté de découverte.",
    "Your privacy, clearly explained.": "Votre vie privée, expliquée simplement.",
    "Back to NiceThings": "Retour à NiceThings",
    "Something went wrong.": "Une erreur est survenue.",
};

function translateDom(language: Language) {
    if (language !== "fr" || typeof document === "undefined") {
        return;
    }

    const walker = document.createTreeWalker(
        document.body,
        NodeFilter.SHOW_TEXT
    );

    const nodes: Text[] = [];
    let node: Node | null;

    while ((node = walker.nextNode())) {
        nodes.push(node as Text);
    }

    for (const textNode of nodes) {
        const value = textNode.nodeValue?.trim();

        if (!value || value.length > 180) {
            continue;
        }

        const translated = dictionary[value];

        if (
            translated &&
            textNode.nodeValue &&
            textNode.nodeValue.trim() === value
        ) {
            const leading = textNode.nodeValue.slice(
                0,
                textNode.nodeValue.indexOf(value)
            );

            textNode.nodeValue = `${leading}${translated}`;
        }
    }
}

export function LanguageProvider({
    children,
}: {
    children: ReactNode;
}) {
    const [language, setLanguageState] =
        useState<Language>("en");

    useEffect(() => {
        const initial = getInitialLanguage();
        setLanguageState(initial);
        document.documentElement.lang = initial;
    }, []);

    useEffect(() => {
        document.documentElement.lang = language;
        persistLanguage(language);

        if (language !== "fr") {
            return;
        }

        const observer = new MutationObserver(() => {
            translateDom(language);
        });

        observer.observe(document.body, {
            childList: true,
            subtree: true,
            characterData: true,
        });

        translateDom(language);

        return () => observer.disconnect();
    }, [language]);

    const value = useMemo<LanguageContextValue>(
        () => ({
            language,
            setLanguage: (next) => {
                setLanguageState(next);
            },
        }),
        [language]
    );

    return (
        <LanguageContext.Provider value={value}>
            {children}
        </LanguageContext.Provider>
    );
}

export function useLanguage() {
    return useContext(LanguageContext);
}
