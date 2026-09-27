const en = {
  common:{appName:"NiceThings",back:"Back",home:"Home",search:"Search",nearby:"Nearby",saved:"Saved",profile:"Profile",submit:"Suggest a place",loading:"Loading...",retry:"Try again",cancel:"Cancel",confirm:"Confirm",save:"Save",close:"Close",discover:"Discover",admin:"Admin",privacy:"Privacy",terms:"Terms",directions:"Directions"},
  home:{eyebrow:"DISCOVER SOMETHING NICE",title:"Find nice things around you.",description:"Discover great places, food, drinks and experiences near you.",searchPlaceholder:"What are you looking for?",useLocation:"Use my location",exploreNearby:"Explore nearby",featured:"Featured",nearYou:"Near you"},
  categories:{all:"All",restaurant:"Restaurants",cafe:"Cafés",fastFood:"Fast Food",drinks:"Drinks",snacks:"Snacks",other:"Other"},
  location:{title:"Discover what's around you",description:"Allow location access so NiceThings can show you places nearby.",allow:"Allow location",denied:"Location access was not allowed. You can still search manually.",unavailable:"Your location is currently unavailable."},
  spots:{details:"Details",reviews:"Reviews",rating:"Rating",address:"Address",neighborhood:"Neighborhood",price:"Price",openingHours:"Opening hours",phone:"Phone",whatsapp:"WhatsApp",website:"Website",openNow:"Open now",closedNow:"Closed",arrived:"I arrived",report:"Report",noResults:"No places found.",viewPlace:"View place"},
  language:{english:"English",french:"Français"},
  errors:{generic:"Something went wrong.",network:"Please check your internet connection and try again.",location:"We couldn't access your location."}
} as const;

const fr = {
  common:{appName:"NiceThings",back:"Retour",home:"Accueil",search:"Rechercher",nearby:"À proximité",saved:"Enregistrés",profile:"Profil",submit:"Suggérer un lieu",loading:"Chargement...",retry:"Réessayer",cancel:"Annuler",confirm:"Confirmer",save:"Enregistrer",close:"Fermer",discover:"Découvrir",admin:"Administration",privacy:"Confidentialité",terms:"Conditions",directions:"Itinéraire"},
  home:{eyebrow:"DÉCOUVREZ QUELQUE CHOSE DE SYMPA",title:"Trouvez de belles adresses autour de vous.",description:"Découvrez de bonnes adresses, des restaurants, des boissons et des expériences près de vous.",searchPlaceholder:"Que recherchez-vous ?",useLocation:"Utiliser ma position",exploreNearby:"Explorer à proximité",featured:"À la une",nearYou:"Près de vous"},
  categories:{all:"Tous",restaurant:"Restaurants",cafe:"Cafés",fastFood:"Fast-food",drinks:"Boissons",snacks:"Snacks",other:"Autre"},
  location:{title:"Découvrez ce qui vous entoure",description:"Autorisez la position pour que NiceThings puisse afficher les lieux proches de vous.",allow:"Autoriser la position",denied:"L'accès à la position n'a pas été autorisé. Vous pouvez toujours rechercher manuellement.",unavailable:"Votre position est actuellement indisponible."},
  spots:{details:"Détails",reviews:"Avis",rating:"Note",address:"Adresse",neighborhood:"Quartier",price:"Prix",openingHours:"Horaires",phone:"Téléphone",whatsapp:"WhatsApp",website:"Site web",openNow:"Ouvert",closedNow:"Fermé",arrived:"Je suis arrivé(e)",report:"Signaler",noResults:"Aucun lieu trouvé.",viewPlace:"Voir le lieu"},
  language:{english:"Anglais",french:"Français"},
  errors:{generic:"Une erreur est survenue.",network:"Vérifiez votre connexion Internet et réessayez.",location:"Nous n'avons pas pu accéder à votre position."}
} as const;

export { en, fr };
export const translations = { en, fr };
