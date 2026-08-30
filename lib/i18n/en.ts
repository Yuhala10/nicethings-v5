const en = {
  // Common UI elements
  common: {
    appName: "NiceThings",
    home: "Home",
    search: "Search",
    nearby: "Nearby",
    saved: "Saved",
    profile: "Profile",
    submit: "Suggest a place",
    loading: "Loading...",
    retry: "Try again",
    cancel: "Cancel",
    confirm: "Confirm",
    save: "Save",
    unsave: "Remove",
    close: "Close",
    discover: "Discover",
    admin: "Admin",
    privacy: "Privacy",
    terms: "Terms",
    directions: "Directions",
    language: "Language",
    settings: "Settings",
    edit: "Edit",
    delete: "Delete",
    share: "Share",
    report: "Report",
    logout: "Log out",
    continue: "Continue",
    skip: "Skip",
    next: "Next",
    back: "Back",
    done: "Done",
    success: "Success",
    error: "Error",
    warning: "Warning",
    info: "Info",
    optional: "Optional",
    required: "Required",
  },

  // Header and Navigation
  header: {
    title: "NiceThings",
    menu: "Menu",
    search: "Search places",
  },

  navigation: {
    home: "Home",
    discover: "Discover",
    nearby: "Nearby",
    saved: "Saved",
    profile: "Profile",
    contribute: "Contribute",
    explore: "Explore",
    search: "Search",
  },

  // Bottom Navigation
  bottomNav: {
    home: "Home",
    saved: "Saved",
    search: "Search",
    contribute: "Contribute",
    profile: "Profile",
  },

  // Home Page
  home: {
    eyebrow: "DISCOVER SOMETHING NICE",
    title: "Find nice things around you.",
    titleAccent: "nice.",
    description: "Discover great places, food, drinks and experiences near you.",
    searchPlaceholder: "What are you looking for?",
    useLocation: "Use my location",
    exploreNearby: "Explore nearby",
    featured: "Featured",
    nearYou: "Near you",
    knowAPlace: "I know a place",
    shareIt: "Share it with NiceThings",
    categories: "Popular categories",
    
    // Hero visual section
    aroundYou: "Around you",
    nicePlacesNearby: "Nice places nearby",
    community: "Community",
    realDiscoveries: "Real discoveries",
    
    // Phone mockup
    exampleCity: "Douala",
    phoneTitle: "Find something",
    searchNearby: "Search nearby",
    placeWorthDiscovering: "A place worth discovering",
    localFavorite: "Local favorite",
    
    // Categories section
    startExploring: "Start exploring.",
    startExploringDescription: "From everyday favorites to places you would never have found on your own.",
    categoryTitles: {
      food: "Restaurants",
      cafe: "Cafés",
      drinks: "Drinks",
      discover: "Discover",
    },
    categoryDescriptions: {
      food: "Local food & hidden gems",
      cafe: "Coffee, pastries & chill",
      drinks: "Bars, lounges & more",
      discover: "Something different",
    },
    
    // Community section
    communityTitle: "Know somewhere special?",
    communityDescription: "NiceThings grows through people. Share a place worth discovering and help someone else find it.",
    placesWaitingDiscovery: "Places waiting to be discovered.",
    
    // Final CTA
    finalCTATitle: "There is always something nice nearby.",
    finalCTADescription: "Search. Discover. Go. That's the whole point.",
    
    // Footer
    tagline: "Local discovery, reimagined.",
  },

  // Categories
  categories: {
    all: "All",
    restaurant: "Restaurants",
    cafe: "Cafés",
    fastFood: "Fast Food",
    drinks: "Drinks",
    snacks: "Snacks",
    bakery: "Bakery",
    hotel: "Hotels",
    shopping: "Shopping",
    beauty: "Beauty & Wellness",
    wellness: "Wellness",
    entertainment: "Entertainment",
    nature: "Nature",
    other: "Other",
  },

  // Location Permission
  location: {
    title: "Discover what's around you",
    description: "Allow location access so NiceThings can show you places nearby.",
    allow: "Allow location",
    denied: "Location access was not allowed. You can still search manually.",
    unavailable: "Your location is currently unavailable.",
    requestingLocation: "Finding your location...",
    errorDetectingLocation: "Could not detect your location",
  },

  // Spot Details & Cards
  spots: {
    details: "Details",
    reviews: "Reviews",
    rating: "Rating",
    address: "Address",
    neighborhood: "Neighborhood",
    price: "Price",
    openingHours: "Opening hours",
    phone: "Phone",
    whatsapp: "WhatsApp",
    website: "Website",
    openNow: "Open now",
    closedNow: "Closed",
    arrived: "I arrived",
    report: "Report",
    noResults: "No places found.",
    viewPlace: "View place",
    menu: "Menu",
    photos: "Photos",
    description: "About",
    howToFind: "How to find",
    distance: "Distance",
    notFound: "This place could not be found.",
    savePlace: "Save this place",
    removeSaved: "Remove from saved",
  },

  // Submit Form (I Know a Place)
  submit: {
    title: "I Know a Place",
    subtitle: "Share a place you love",
    description: "Help NiceThings discover great places by sharing places you know. You must be physically present at the location.",
    
    // Step 1: Category & Cuisine
    step1Title: "What kind of place?",
    step1Subtitle: "Select a category",
    category: "Category",
    cuisine: "Cuisine type",
    cuisinePlaceholder: "Enter cuisine or specialty",
    
    // Step 2: Location
    step2Title: "Where is it?",
    step2Subtitle: "Provide location details",
    city: "City",
    cityPlaceholder: "Select city",
    neighborhood: "Neighborhood",
    neighborhoodPlaceholder: "Enter neighborhood",
    address: "Street address",
    addressPlaceholder: "Enter street address",
    
    // Step 3: Contact
    step3Title: "How to reach it?",
    step3Subtitle: "Contact information",
    phone: "Phone number",
    phonePlaceholder: "Enter phone number",
    whatsapp: "WhatsApp number",
    whatsappPlaceholder: "Enter WhatsApp number",
    website: "Website",
    websitePlaceholder: "https://example.com",
    
    // Step 4: Description
    step4Title: "Tell us about it",
    step4Subtitle: "What makes this place nice?",
    placeDescription: "Description",
    descriptionPlaceholder: "Share what makes this place special...",
    
    // Step 5: Location Verification
    step5Title: "Verify your location",
    step5Subtitle: "We need to confirm you're at this place",
    locationVerification: "Location verification",
    locationFound: "Your location has been captured",
    latitude: "Latitude",
    longitude: "Longitude",
    accuracy: "Accuracy",
    allowLocationAccess: "Allow location access to verify you're at this place",
    errorGettingLocation: "Could not get your location. Please try again.",
    
    // Step 6: Photos
    step6Title: "Add photos",
    step6Subtitle: "Show what it looks like",
    addPhotos: "Add photos",
    uploadPhoto: "Upload photo",
    photoRequired: "Add at least one photo",
    
    // Step 7: Review
    step7Title: "Review your submission",
    step7Subtitle: "Make sure everything looks good",
    reviewSubmission: "Review submission",
    placeInformation: "Place information",
    contactInformation: "Contact information",
    
    // Form actions
    submit: "Submit",
    submitting: "Submitting...",
    submitSuccess: "Thank you! Your submission has been received.",
    submitError: "Failed to submit. Please try again.",
    fillRequiredFields: "Please fill in all required fields",
    backToHome: "Back to home",
    
    // Cities
    cities: {
      douala: "Douala",
      yaounde: "Yaoundé",
      buea: "Buea",
      limbe: "Limbé",
      bamenda: "Bamenda",
      bafoussam: "Bafoussam",
      kribi: "Kribi",
    },
  },

  // Search & Filter
  search: {
    title: "Search",
    searchPlaceholder: "What are you looking for?",
    filter: "Filter",
    filters: "Filters",
    filterByCategory: "Filter by category",
    filterByPrice: "Filter by price",
    clearFilters: "Clear filters",
    showFilters: "Show filters",
    hideFilters: "Hide filters",
    noResults: "No places found",
    tryDifferentSearch: "Try a different search or location",
    loading: "Loading places...",
    sortBy: "Sort by",
    sortByName: "Name",
    sortByRating: "Rating",
    sortByDistance: "Distance",
    sortByNearest: "Nearest first",
  },

  // Nearby/Map
  nearby: {
    title: "Nearby",
    subtitle: "Places around you",
    enableLocation: "Enable location to see nearby places",
    loading: "Finding nearby places...",
    mapLoading: "Loading map...",
    mapError: "Could not load map",
    noPlacesNearby: "No places found near you",
    tryExpanding: "Try expanding your search radius",
  },

  // Saved Places
  saved: {
    title: "Saved places",
    subtitle: "Your bookmarked places",
    empty: "No saved places yet",
    startSaving: "Start saving places you love",
    removedFromSaved: "Removed from saved places",
  },

  // Profile
  profile: {
    title: "Profile",
    myProfile: "My profile",
    editProfile: "Edit profile",
    settings: "Settings",
    language: "Language",
    currentLanguage: "Current language",
    theme: "Theme",
    notifications: "Notifications",
    aboutYou: "About you",
    city: "City",
    selectCity: "Select your city",
    preferences: "Preferences",
    cuisine: "Favorite cuisines",
    priceRange: "Preferred price range",
    budget: "Budget",
    low: "Budget-friendly",
    medium: "Moderate",
    high: "Premium",
    privacy: "Privacy",
    dataUsage: "Data & Privacy",
    deleteAccount: "Delete account",
    logout: "Log out",
    confirmLogout: "Are you sure you want to log out?",
  },

  // Legal & Privacy
  privacy: {
    title: "Your privacy, clearly explained.",
    lead: "NiceThings uses information to help you discover places, remember your choices, and improve the service. We keep location use purposeful and under your control.",
    section1: "Location",
    section1Body: "Your device location is requested when you use location-based features such as Around Me. The browser and your device control the underlying permission.",
    section2: "Account & activity",
    section2Body: "NiceThings may store saved places, reviews, arrivals and contributions so those features can work for you.",
    section3: "Choices",
    section3Body: "You can manage location permission from your device and revisit your NiceThings preferences from the app.",
    section4: "Contact",
    section4Body: "If you have a privacy question or need information about your data, contact the NiceThings team through the contact details provided in the deployed application.",
  },
  terms: {
    title: "Simple rules for a better discovery community.",
    lead: "Use NiceThings to discover and share places responsibly. Information contributed by the community should be accurate, respectful and useful.",
    section1: "Accurate contributions",
    section1Body: "Only submit information you reasonably believe is accurate. Do not deliberately publish misleading or harmful information.",
    section2: "Respectful reviews",
    section2Body: "Reviews should describe genuine experiences and avoid harassment, personal information or abusive content.",
    section3: "Place information",
    section3Body: "Opening hours, prices and locations can change. NiceThings may review, update or remove information when necessary.",
    section4: "Moderation",
    section4Body: "NiceThings may moderate submissions, reports and reviews to protect the quality and safety of the directory.",
  },

  // Admin
  admin: {
    title: "Admin",
    dashboard: "Dashboard",
    login: "Admin login",
    pin: "PIN",
    enterPin: "Enter the private admin PIN",
    invalidPin: "Invalid PIN",
    welcome: "Welcome back",
    statistics: "Statistics",
    totalPlaces: "Total places",
    pendingSubmissions: "Pending submissions",
    totalSubmissions: "Total submissions",
    activeReports: "Active reports",
    totalReports: "Total reports",
    registeredUsers: "Registered visitors",
    totalReviews: "Total reviews",
    
    // Moderation
    moderation: "Moderation",
    submissions: "Submissions",
    reports: "Reports",
    places: "Places",
    users: "Users",
    
    // Actions
    approve: "Approve",
    reject: "Reject",
    delete: "Delete",
    edit: "Edit",
    view: "View",
    pendingApproval: "Pending approval",
    approved: "Approved",
    rejected: "Rejected",
    
    // Status
    status: "Status",
    created: "Created",
    updatedAt: "Updated",
    noData: "No data",
    
    // Submission Management
    recentSubmissions: "Recent submissions",
    viewSubmission: "View submission",
    approveSubmission: "Approve submission",
    rejectSubmission: "Reject submission",
    confirmApprove: "Are you sure you want to approve this submission?",
    confirmReject: "Are you sure you want to reject this submission?",
    submissionApproved: "Submission approved",
    submissionRejected: "Submission rejected",
    
    // Report Management
    reportedContent: "Reported content",
    reportReason: "Report reason",
    resolveReport: "Resolve report",
    dismissReport: "Dismiss report",
    confirmResolve: "Are you sure you want to resolve this report?",
    reportResolved: "Report resolved",
    
    // Settings
    adminSettings: "Admin settings",
    manageAdmins: "Manage admins",
    siteSuspended: "Site status",
    maintenance: "Maintenance mode",
  },

  // Validation Messages
  validation: {
    required: "This field is required",
    email: "Please enter a valid email",
    phone: "Please enter a valid phone number",
    url: "Please enter a valid URL",
    minLength: "Must be at least {min} characters",
    maxLength: "Must be at most {max} characters",
    invalidFormat: "Invalid format",
    nameRequired: "Place name is required",
    categoryRequired: "Category is required",
    cityRequired: "City is required",
    addressRequired: "Address is required",
  },

  // Consent & Privacy
  consent: {
    title: "Welcome to NiceThings",
    description: "We care about your privacy",
    privacyConsent: "I agree to NiceThings privacy policy",
    cookieConsent: "Allow cookies to improve your experience",
    locationConsent: "Allow location access",
    acceptAll: "Accept all",
    rejectAll: "Reject all",
    acceptedNotice: "Preferences saved",
  },

  // Error Messages
  errors: {
    generic: "Something went wrong.",
    network: "Please check your internet connection and try again.",
    location: "We couldn't access your location.",
    loadingFailed: "Failed to load content. Please try again.",
    notFound: "Page not found",
    unauthorized: "You are not authorized to access this",
    serverError: "Server error. Please try again later.",
  },

  // Success Messages
  success: {
    saved: "Saved successfully",
    deleted: "Deleted successfully",
    updated: "Updated successfully",
    submitted: "Submitted successfully",
    copied: "Copied to clipboard",
  },

  // Language
  language: {
    english: "English",
    french: "Français",
    selectLanguage: "Select language",
    changeLanguage: "Change language",
  },

  // Time/Date
  time: {
    monday: "Monday",
    tuesday: "Tuesday",
    wednesday: "Wednesday",
    thursday: "Thursday",
    friday: "Friday",
    saturday: "Saturday",
    sunday: "Sunday",
    mon: "Mon",
    tue: "Tue",
    wed: "Wed",
    thu: "Thu",
    fri: "Fri",
    sat: "Sat",
    sun: "Sun",
    today: "Today",
    yesterday: "Yesterday",
    tomorrow: "Tomorrow",
  },

  // Price Range
  price: {
    budget: "Budget-friendly",
    moderate: "Moderate",
    premium: "Premium",
    luxury: "Luxury",
  },
} as const;

const fr = {
  // Éléments UI courants
  common: {
    appName: "NiceThings",
    back: "Retour",
    home: "Accueil",
    search: "Rechercher",
    nearby: "À proximité",
    saved: "Enregistrés",
    profile: "Profil",
    submit: "Suggérer un lieu",
    loading: "Chargement...",
    retry: "Réessayer",
    cancel: "Annuler",
    confirm: "Confirmer",
    save: "Enregistrer",
    unsave: "Retirer",
    close: "Fermer",
    discover: "Découvrir",
    admin: "Administration",
    privacy: "Confidentialité",
    terms: "Conditions",
    directions: "Itinéraire",
    language: "Langue",
    settings: "Paramètres",
    edit: "Modifier",
    delete: "Supprimer",
    share: "Partager",
    report: "Signaler",
    logout: "Se déconnecter",
    continue: "Continuer",
    skip: "Passer",
    next: "Suivant",
    done: "Terminé",
    success: "Succès",
    error: "Erreur",
    warning: "Attention",
    info: "Info",
    optional: "Facultatif",
    required: "Requis",
  },

  // En-tête et Navigation
  header: {
    title: "NiceThings",
    menu: "Menu",
    search: "Rechercher des lieux",
  },

  // Navigation
  navigation: {
    home: "Accueil",
    discover: "Découvrir",
    nearby: "À proximité",
    saved: "Enregistrés",
    profile: "Profil",
    contribute: "Contribuer",
    explore: "Explorer",
    search: "Rechercher",
  },

  // Navigation inférieure
  bottomNav: {
    home: "Accueil",
    saved: "Enregistrés",
    search: "Rechercher",
    contribute: "Contribuer",
    profile: "Profil",
  },

  // Page d'accueil
  home: {
    eyebrow: "DÉCOUVREZ QUELQUE CHOSE DE SYMPA",
    title: "Trouvez de belles adresses autour de vous.",
    titleAccent: "sympa.",
    description: "Découvrez de bonnes adresses, des restaurants, des boissons et des expériences près de vous.",
    searchPlaceholder: "Que recherchez-vous ?",
    useLocation: "Utiliser ma position",
    exploreNearby: "Explorer à proximité",
    featured: "À la une",
    nearYou: "Près de vous",
    knowAPlace: "Je connais une adresse",
    shareIt: "Partagez-la avec NiceThings",
    categories: "Catégories populaires",
    
    // Section visuelle du héros
    aroundYou: "Autour de vous",
    nicePlacesNearby: "Belles adresses à proximité",
    community: "Communauté",
    realDiscoveries: "De vraies découvertes",
    
    // Mockup téléphone
    exampleCity: "Douala",
    phoneTitle: "Trouvez quelque chose",
    searchNearby: "Rechercher à proximité",
    placeWorthDiscovering: "Un lieu qui vaut le coup",
    localFavorite: "Favori local",
    
    // Section catégories
    startExploring: "Commencez à explorer.",
    startExploringDescription: "Des favoris au quotidien aux lieux que vous n'auriez jamais trouvés par vous-même.",
    categoryTitles: {
      food: "Restaurants",
      cafe: "Cafés",
      drinks: "Boissons",
      discover: "Découvrir",
    },
    categoryDescriptions: {
      food: "Nourriture locale et pépites cachées",
      cafe: "Café, pâtisseries et détente",
      drinks: "Bars, lounges et plus",
      discover: "Quelque chose de différent",
    },
    
    // Section communauté
    communityTitle: "Vous connaissez un lieu spécial ?",
    communityDescription: "NiceThings grandit grâce aux gens. Partagez un lieu qui vaut le coup et aidez quelqu'un d'autre à le découvrir.",
    placesWaitingDiscovery: "Des lieux en attente de découverte.",
    
    // Appel final
    finalCTATitle: "Il y a toujours quelque chose de sympa à proximité.",
    finalCTADescription: "Cherchez. Découvrez. Allez-y. C'est tout l'intérêt.",
    
    // Pied de page
    tagline: "La découverte locale, réinventée.",
  },

  // Catégories
  categories: {
    all: "Tous",
    restaurant: "Restaurants",
    cafe: "Cafés",
    fastFood: "Fast-food",
    drinks: "Boissons",
    snacks: "Snacks",
    bakery: "Boulangeries",
    hotel: "Hôtels",
    shopping: "Shopping",
    beauty: "Beauté & Bien-être",
    wellness: "Bien-être",
    entertainment: "Divertissement",
    nature: "Nature",
    other: "Autre",
  },

  // Permission de localisation
  location: {
    title: "Découvrez ce qui vous entoure",
    description: "Autorisez la localisation pour que NiceThings puisse afficher les lieux proches de vous.",
    allow: "Autoriser la position",
    denied: "L'accès à la position n'a pas été autorisé. Vous pouvez toujours rechercher manuellement.",
    unavailable: "Votre position est actuellement indisponible.",
    requestingLocation: "Détection de votre position...",
    errorDetectingLocation: "Impossible de détecter votre position",
  },

  // Détails et cartes de lieux
  spots: {
    details: "Détails",
    reviews: "Avis",
    rating: "Note",
    address: "Adresse",
    neighborhood: "Quartier",
    price: "Prix",
    openingHours: "Horaires",
    phone: "Téléphone",
    whatsapp: "WhatsApp",
    website: "Site web",
    openNow: "Ouvert",
    closedNow: "Fermé",
    arrived: "Je suis arrivé(e)",
    report: "Signaler",
    noResults: "Aucun lieu trouvé.",
    viewPlace: "Voir le lieu",
    menu: "Menu",
    photos: "Photos",
    description: "À propos",
    howToFind: "Comment accéder",
    distance: "Distance",
    notFound: "Ce lieu n'a pas pu être trouvé.",
    savePlace: "Enregistrer ce lieu",
    removeSaved: "Retirer des enregistrés",
  },

  // Formulaire de soumission (Je connais une adresse)
  submit: {
    title: "Je connais une adresse",
    subtitle: "Partagez un lieu que vous aimez",
    description: "Aidez NiceThings à découvrir de belles adresses en partageant les lieux que vous connaissez. Vous devez être physiquement présent(e) à l'endroit.",
    
    // Étape 1 : Catégorie
    step1Title: "Quel type de lieu ?",
    step1Subtitle: "Sélectionnez une catégorie",
    category: "Catégorie",
    cuisine: "Type de cuisine",
    cuisinePlaceholder: "Entrez la cuisine ou la spécialité",
    
    // Étape 2 : Localisation
    step2Title: "Où se trouve-t-il ?",
    step2Subtitle: "Fournissez les détails de localisation",
    city: "Ville",
    cityPlaceholder: "Sélectionnez une ville",
    neighborhood: "Quartier",
    neighborhoodPlaceholder: "Entrez le quartier",
    address: "Adresse",
    addressPlaceholder: "Entrez l'adresse",
    
    // Étape 3 : Contact
    step3Title: "Comment le joindre ?",
    step3Subtitle: "Informations de contact",
    phone: "Numéro de téléphone",
    phonePlaceholder: "Entrez le numéro de téléphone",
    whatsapp: "Numéro WhatsApp",
    whatsappPlaceholder: "Entrez le numéro WhatsApp",
    website: "Site web",
    websitePlaceholder: "https://example.com",
    
    // Étape 4 : Description
    step4Title: "Parlez-nous de ce lieu",
    step4Subtitle: "Qu'est-ce qui le rend spécial ?",
    placeDescription: "Description",
    descriptionPlaceholder: "Partagez ce qui rend ce lieu spécial...",
    
    // Étape 5 : Vérification de localisation
    step5Title: "Vérifiez votre position",
    step5Subtitle: "Nous devons confirmer que vous êtes à cet endroit",
    locationVerification: "Vérification de la position",
    locationFound: "Votre position a été capturée",
    latitude: "Latitude",
    longitude: "Longitude",
    accuracy: "Précision",
    allowLocationAccess: "Autorisez la localisation pour vérifier que vous êtes à cet endroit",
    errorGettingLocation: "Impossible d'obtenir votre position. Veuillez réessayer.",
    
    // Étape 6 : Photos
    step6Title: "Ajoutez des photos",
    step6Subtitle: "Montrez à quoi cela ressemble",
    addPhotos: "Ajouter des photos",
    uploadPhoto: "Télécharger une photo",
    photoRequired: "Ajoutez au moins une photo",
    
    // Étape 7 : Vérification
    step7Title: "Vérifiez votre soumission",
    step7Subtitle: "Assurez-vous que tout est en ordre",
    reviewSubmission: "Vérifier la soumission",
    placeInformation: "Informations sur le lieu",
    contactInformation: "Informations de contact",
    
    // Actions du formulaire
    submit: "Envoyer",
    submitting: "Envoi en cours...",
    submitSuccess: "Merci ! Votre soumission a été reçue.",
    submitError: "Impossible d'envoyer. Veuillez réessayer.",
    fillRequiredFields: "Veuillez remplir tous les champs requis",
    backToHome: "Retour à l'accueil",
    
    // Villes
    cities: {
      douala: "Douala",
      yaounde: "Yaoundé",
      buea: "Buea",
      limbe: "Limbé",
      bamenda: "Bamenda",
      bafoussam: "Bafoussam",
      kribi: "Kribi",
    },
  },

  // Recherche et filtres
  search: {
    title: "Rechercher",
    searchPlaceholder: "Que recherchez-vous ?",
    filter: "Filtrer",
    filters: "Filtres",
    filterByCategory: "Filtrer par catégorie",
    filterByPrice: "Filtrer par prix",
    clearFilters: "Réinitialiser les filtres",
    showFilters: "Afficher les filtres",
    hideFilters: "Masquer les filtres",
    noResults: "Aucun lieu trouvé",
    tryDifferentSearch: "Essayez une autre recherche ou une autre localisation",
    loading: "Chargement des lieux...",
    sortBy: "Trier par",
    sortByName: "Nom",
    sortByRating: "Note",
    sortByDistance: "Distance",
    sortByNearest: "Plus proche d'abord",
  },

  // À proximité/Carte
  nearby: {
    title: "À proximité",
    subtitle: "Lieux autour de vous",
    enableLocation: "Activez la localisation pour voir les lieux à proximité",
    loading: "Recherche des lieux à proximité...",
    mapLoading: "Chargement de la carte...",
    mapError: "Impossible de charger la carte",
    noPlacesNearby: "Aucun lieu trouvé près de vous",
    tryExpanding: "Essayez d'élargir votre rayon de recherche",
  },

  // Lieux enregistrés
  saved: {
    title: "Lieux enregistrés",
    subtitle: "Vos lieux favoris",
    empty: "Aucun lieu enregistré",
    startSaving: "Commencez à enregistrer les lieux que vous aimez",
    removedFromSaved: "Retiré des lieux enregistrés",
  },

  // Profil
  profile: {
    title: "Profil",
    myProfile: "Mon profil",
    editProfile: "Modifier le profil",
    settings: "Paramètres",
    language: "Langue",
    currentLanguage: "Langue actuelle",
    theme: "Thème",
    notifications: "Notifications",
    aboutYou: "À propos de vous",
    city: "Ville",
    selectCity: "Sélectionnez votre ville",
    preferences: "Préférences",
    cuisine: "Cuisines préférées",
    priceRange: "Gamme de prix préférée",
    budget: "Budget",
    low: "Économique",
    medium: "Modéré",
    high: "Premium",
    privacy: "Confidentialité",
    dataUsage: "Données et confidentialité",
    deleteAccount: "Supprimer le compte",
    logout: "Se déconnecter",
    confirmLogout: "Êtes-vous sûr(e) de vouloir vous déconnecter ?",
  },

  // Légal & confidentialité
  privacy: {
    title: "Votre vie privée, expliquée simplement.",
    lead: "NiceThings utilise des informations pour vous aider à découvrir des lieux, mémoriser vos choix et améliorer le service. L'utilisation de la localisation reste intentionnelle et sous votre contrôle.",
    section1: "Localisation",
    section1Body: "La localisation de votre appareil est demandée lorsque vous utilisez des fonctionnalités basées sur la position comme À proximité. Le navigateur et votre appareil contrôlent la permission sous-jacente.",
    section2: "Compte et activité",
    section2Body: "NiceThings peut enregistrer les lieux sauvegardés, les avis, les arrivées et les contributions afin que ces fonctionnalités fonctionnent pour vous.",
    section3: "Choix",
    section3Body: "Vous pouvez gérer l'autorisation de localisation depuis votre appareil et revoir vos préférences NiceThings depuis l'application.",
    section4: "Contact",
    section4Body: "Si vous avez une question sur la confidentialité ou besoin d'informations sur vos données, contactez l'équipe NiceThings via les coordonnées fournies dans l'application déployée.",
  },
  terms: {
    title: "Des règles simples pour une meilleure communauté de découverte.",
    lead: "Utilisez NiceThings pour découvrir et partager des lieux de manière responsable. Les informations contribué es par la communauté doivent être précises, respectueuses et utiles.",
    section1: "Contributions précises",
    section1Body: "Ne soumettez que des informations que vous croyez raisonnablement exactes. N'ajoutez pas intentionnellement d'informations trompeuses ou nuisibles.",
    section2: "Avis respectueux",
    section2Body: "Les avis doivent décrire des expériences réelles et éviter le harcèlement, les informations personnelles ou les contenus abusifs.",
    section3: "Informations sur les lieux",
    section3Body: "Les horaires, prix et emplacements peuvent changer. NiceThings peut revoir, mettre à jour ou retirer des informations si nécessaire.",
    section4: "Modération",
    section4Body: "NiceThings peut modérer les soumissions, signalements et avis pour protéger la qualité et la sécurité du répertoire.",
  },

  // Admin
  admin: {
    title: "Administration",
    dashboard: "Tableau de bord",
    login: "Connexion admin",
    pin: "PIN",
    enterPin: "Entrez le PIN d'accès privé",
    invalidPin: "PIN invalide",
    welcome: "Bienvenue",
    statistics: "Statistiques",
    totalPlaces: "Nombre total de lieux",
    pendingSubmissions: "Soumissions en attente",
    totalSubmissions: "Total des soumissions",
    activeReports: "Signalements actifs",
    totalReports: "Total des signalements",
    registeredUsers: "Visiteurs enregistrés",
    totalReviews: "Total des avis",
    
    // Modération
    moderation: "Modération",
    submissions: "Soumissions",
    reports: "Signalements",
    places: "Lieux",
    users: "Utilisateurs",
    
    // Actions
    approve: "Approuver",
    reject: "Rejeter",
    delete: "Supprimer",
    edit: "Modifier",
    view: "Voir",
    pendingApproval: "En attente d'approbation",
    approved: "Approuvé",
    rejected: "Rejeté",
    
    // Statut
    status: "Statut",
    created: "Créé",
    updatedAt: "Mis à jour",
    noData: "Aucune donnée",
    
    // Gestion des soumissions
    recentSubmissions: "Soumissions récentes",
    viewSubmission: "Voir la soumission",
    approveSubmission: "Approuver la soumission",
    rejectSubmission: "Rejeter la soumission",
    confirmApprove: "Êtes-vous sûr(e) de vouloir approuver cette soumission ?",
    confirmReject: "Êtes-vous sûr(e) de vouloir rejeter cette soumission ?",
    submissionApproved: "Soumission approuvée",
    submissionRejected: "Soumission rejetée",
    
    // Gestion des signalements
    reportedContent: "Contenu signalé",
    reportReason: "Raison du signalement",
    resolveReport: "Résoudre le signalement",
    dismissReport: "Ignorer le signalement",
    confirmResolve: "Êtes-vous sûr(e) de vouloir résoudre ce signalement ?",
    reportResolved: "Signalement résolu",
    
    // Paramètres
    adminSettings: "Paramètres d'administration",
    manageAdmins: "Gérer les administrateurs",
    siteSuspended: "État du site",
    maintenance: "Mode maintenance",
  },

  // Messages de validation
  validation: {
    required: "Ce champ est requis",
    email: "Veuillez entrer une adresse e-mail valide",
    phone: "Veuillez entrer un numéro de téléphone valide",
    url: "Veuillez entrer une URL valide",
    minLength: "Doit contenir au moins {min} caractères",
    maxLength: "Doit contenir au maximum {max} caractères",
    invalidFormat: "Format invalide",
    nameRequired: "Le nom du lieu est requis",
    categoryRequired: "La catégorie est requise",
    cityRequired: "La ville est requise",
    addressRequired: "L'adresse est requise",
  },

  // Consentement et confidentialité
  consent: {
    title: "Bienvenue chez NiceThings",
    description: "Nous accordons de l'importance à votre confidentialité",
    privacyConsent: "J'accepte la politique de confidentialité de NiceThings",
    cookieConsent: "Autoriser les cookies pour améliorer votre expérience",
    locationConsent: "Autoriser la localisation",
    acceptAll: "Tout accepter",
    rejectAll: "Tout refuser",
    acceptedNotice: "Préférences enregistrées",
  },

  // Messages d'erreur
  errors: {
    generic: "Une erreur est survenue.",
    network: "Veuillez vérifier votre connexion Internet et réessayer.",
    location: "Nous n'avons pas pu accéder à votre position.",
    loadingFailed: "Impossible de charger le contenu. Veuillez réessayer.",
    notFound: "Page non trouvée",
    unauthorized: "Vous n'êtes pas autorisé(e) à accéder à ceci",
    serverError: "Erreur serveur. Veuillez réessayer plus tard.",
  },

  // Messages de succès
  success: {
    saved: "Enregistré avec succès",
    deleted: "Supprimé avec succès",
    updated: "Mis à jour avec succès",
    submitted: "Envoyé avec succès",
    copied: "Copié dans le presse-papiers",
  },

  // Langue
  language: {
    english: "Anglais",
    french: "Français",
    selectLanguage: "Sélectionnez la langue",
    changeLanguage: "Changer la langue",
  },

  // Heure/Date
  time: {
    monday: "Lundi",
    tuesday: "Mardi",
    wednesday: "Mercredi",
    thursday: "Jeudi",
    friday: "Vendredi",
    saturday: "Samedi",
    sunday: "Dimanche",
    mon: "Lun",
    tue: "Mar",
    wed: "Mer",
    thu: "Jeu",
    fri: "Ven",
    sat: "Sam",
    sun: "Dim",
    today: "Aujourd'hui",
    yesterday: "Hier",
    tomorrow: "Demain",
  },

  // Gamme de prix
  price: {
    budget: "Économique",
    moderate: "Modéré",
    premium: "Premium",
    luxury: "Luxe",
  },
} as const;

export { en, fr };
export const translations = { en, fr };
