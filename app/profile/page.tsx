"use client";

import {
    useEffect,
    useMemo,
    useState,
} from "react";

import {
    AnimatePresence,
    motion,
} from "framer-motion";

import {
    ArrowLeft,
    ArrowRight,
    Bell,
    Check,
    ChevronRight,
    Globe2,
    Heart,
    LogOut,
    Mail,
    MapPin,
    Pencil,
    Phone,
    ShieldCheck,
    Sparkles,
    Trash2,
    User,
    X,
} from "lucide-react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import {
    getSupabaseBrowserClient,
} from "../../lib/supabase/client";
import { useTranslation } from "../../lib/i18n/useTranslation";

type Language =
    | "en"
    | "fr";

type Visitor = {
    id: string;
    preferred_language:
    | "en"
    | "fr";
};

type ProfileState = {
    name: string;
    phone: string;
    email: string;
    city: string;
    language: Language;
};

const DEFAULT_PROFILE: ProfileState = {
    name: "",
    phone: "",
    email: "",
    city: "",
    language: "en",
};

const CITIES = [
    "Douala",
    "Yaoundé",
    "Buea",
    "Limbe",
    "Bamenda",
    "Bafoussam",
    "Kribi",
];

export default function ProfilePage() {
    const t = useTranslation();
    const router =
        useRouter();
    const supabase =
        useMemo(
            () =>
                getSupabaseBrowserClient() as any,
            []
        );

    const [
        profile,
        setProfile,
    ] =
        useState<ProfileState>(
            DEFAULT_PROFILE
        );

    const [
        originalProfile,
        setOriginalProfile,
    ] =
        useState<ProfileState>(
            DEFAULT_PROFILE
        );

    const [
        loading,
        setLoading,
    ] =
        useState(true);

    const [
        saving,
        setSaving,
    ] =
        useState(false);

    const [
        saved,
        setSaved,
    ] =
        useState(false);

    const [
        error,
        setError,
    ] =
        useState<string | null>(
            null
        );

    const [
        showEdit,
        setShowEdit,
    ] =
        useState(false);

    const [
        showLanguage,
        setShowLanguage,
    ] =
        useState(false);

    const [
        showCity,
        setShowCity,
    ] =
        useState(false);

    const [
        showDelete,
        setShowDelete,
    ] =
        useState(false);

    const [
        deleting,
        setDeleting,
    ] =
        useState(false);

    const [
        stats,
        setStats,
    ] =
        useState({
            saved: 0,
            arrivals: 0,
            reviews: 0,
        });

    useEffect(() => {
        void loadProfile();
    }, []);

    async function loadProfile() {
        setLoading(true);
        setError(null);

        try {
            const visitorId =
                window.localStorage.getItem(
                    "nt_visitor_id"
                );

            if (!visitorId) {
                setLoading(false);
                return;
            }

            const [
                visitorResult,
                savedResult,
                arrivalsResult,
                reviewsResult,
            ] =
                await Promise.all([
                    supabase
                        .from(
                            "nt_visitors"
                        )
                        .select(
                            "id,preferred_language"
                        )
                        .eq(
                            "id",
                            visitorId
                        )
                        .maybeSingle(),

                    supabase
                        .from(
                            "nt_saved_spots"
                        )
                        .select(
                            "id",
                            {
                                count:
                                    "exact",
                                head: true,
                            }
                        )
                        .eq(
                            "visitor_id",
                            visitorId
                        ),

                    supabase
                        .from(
                            "nt_arrivals"
                        )
                        .select(
                            "id",
                            {
                                count:
                                    "exact",
                                head: true,
                            }
                        )
                        .eq(
                            "visitor_id",
                            visitorId
                        ),

                    supabase
                        .from(
                            "nt_reviews"
                        )
                        .select(
                            "id",
                            {
                                count:
                                    "exact",
                                head: true,
                            }
                        )
                        .eq(
                            "visitor_id",
                            visitorId
                        ),
                ]);

            if (
                visitorResult.error
            ) {
                throw visitorResult.error;
            }

            const visitor =
                visitorResult.data as
                | Visitor
                | null;

            const language =
                visitor?.preferred_language ??
                "en";

            const storedName =
                window.localStorage.getItem(
                    "nt_visitor_name"
                ) ??
                window.localStorage.getItem(
                    "visitor_name"
                ) ??
                "";

            const storedPhone =
                window.localStorage.getItem(
                    "nt_visitor_phone"
                ) ??
                "";

            const storedEmail =
                window.localStorage.getItem(
                    "nt_visitor_email"
                ) ??
                "";

            const storedCity =
                window.localStorage.getItem(
                    "nt_visitor_city"
                ) ??
                "";

            const nextProfile: ProfileState =
            {
                name:
                    storedName,
                phone:
                    storedPhone,
                email:
                    storedEmail,
                city:
                    storedCity,
                language,
            };

            setProfile(
                nextProfile
            );

            setOriginalProfile(
                nextProfile
            );

            setStats({
                saved:
                    savedResult.count ??
                    0,

                arrivals:
                    arrivalsResult.count ??
                    0,

                reviews:
                    reviewsResult.count ??
                    0,
            });
        } catch (err) {
            console.error(
                "Profile loading error:",
                err
            );

            setError(
                "We couldn't load your profile."
            );
        } finally {
            setLoading(false);
        }
    }

    async function saveProfile() {
        const visitorId =
            window.localStorage.getItem(
                "nt_visitor_id"
            );

        if (!visitorId) {
            setError(
                "Your visitor session could not be found."
            );

            return;
        }

        setSaving(true);
        setError(null);
        setSaved(false);

        try {
            const {
                error:
                languageError,
            } =
                await supabase
                    .from(
                        "nt_visitors"
                    )
                    .update({
                        preferred_language:
                            profile.language,
                    })
                    .eq(
                        "id",
                        visitorId
                    );

            if (
                languageError
            ) {
                throw languageError;
            }

            window.localStorage.setItem(
                "nt_visitor_name",
                profile.name.trim()
            );

            window.localStorage.setItem(
                "nt_visitor_phone",
                profile.phone.trim()
            );

            window.localStorage.setItem(
                "nt_visitor_email",
                profile.email.trim()
            );

            window.localStorage.setItem(
                "nt_visitor_city",
                profile.city.trim()
            );

            setOriginalProfile(
                profile
            );

            setSaved(true);
            setShowEdit(false);

            window.setTimeout(
                () =>
                    setSaved(
                        false
                    ),
                2500
            );
        } catch (err) {
            console.error(
                "Profile save error:",
                err
            );

            setError(
                "We couldn't save your changes."
            );
        } finally {
            setSaving(false);
        }
    }

    function cancelEdit() {
        setProfile(
            originalProfile
        );

        setShowEdit(false);
        setError(null);
    }

    async function changeLanguage(
        language: Language
    ) {
        setProfile(
            (
                current
            ) => ({
                ...current,
                language,
            })
        );

        setShowLanguage(
            false
        );

        const visitorId =
            window.localStorage.getItem(
                "nt_visitor_id"
            );

        if (!visitorId) {
            return;
        }

        try {
            const {
                error:
                updateError,
            } =
                await supabase
                    .from(
                        "nt_visitors"
                    )
                    .update({
                        preferred_language:
                            language,
                    })
                    .eq(
                        "id",
                        visitorId
                    );

            if (
                updateError
            ) {
                throw updateError;
            }

            setOriginalProfile(
                (
                    current
                ) => ({
                    ...current,
                    language,
                })
            );
        } catch (err) {
            console.error(
                "Language update error:",
                err
            );

            setError(
                "Language couldn't be updated."
            );
        }
    }

    async function deleteAccount() {
        const visitorId =
            window.localStorage.getItem(
                "nt_visitor_id"
            );

        if (!visitorId) {
            return;
        }

        setDeleting(true);
        setError(null);

        try {
            /*
             * Delete dependent records first.
             * This keeps the operation compatible
             * with databases that do not have
             * cascading foreign keys configured.
             */

            const savedDelete =
                await supabase
                    .from(
                        "nt_saved_spots"
                    )
                    .delete()
                    .eq(
                        "visitor_id",
                        visitorId
                    );

            if (
                savedDelete.error
            ) {
                throw savedDelete.error;
            }

            const arrivalsDelete =
                await supabase
                    .from(
                        "nt_arrivals"
                    )
                    .delete()
                    .eq(
                        "visitor_id",
                        visitorId
                    );

            if (
                arrivalsDelete.error
            ) {
                throw arrivalsDelete.error;
            }

            const reviewsDelete =
                await supabase
                    .from(
                        "nt_reviews"
                    )
                    .delete()
                    .eq(
                        "visitor_id",
                        visitorId
                    );

            if (
                reviewsDelete.error
            ) {
                throw reviewsDelete.error;
            }

            const reportsDelete =
                await supabase
                    .from(
                        "nt_reports"
                    )
                    .delete()
                    .eq(
                        "visitor_id",
                        visitorId
                    );

            if (
                reportsDelete.error
            ) {
                throw reportsDelete.error;
            }

            const consentsDelete =
                await supabase
                    .from(
                        "nt_consents"
                    )
                    .delete()
                    .eq(
                        "visitor_id",
                        visitorId
                    );

            if (
                consentsDelete.error
            ) {
                throw consentsDelete.error;
            }

            const visitorDelete =
                await supabase
                    .from(
                        "nt_visitors"
                    )
                    .delete()
                    .eq(
                        "id",
                        visitorId
                    );

            if (
                visitorDelete.error
            ) {
                throw visitorDelete.error;
            }

            const keys = [
                "nt_visitor_id",
                "nt_visitor_name",
                "nt_visitor_phone",
                "nt_visitor_email",
                "nt_visitor_city",
                "nt_visitor_language",
                "visitor_name",
                "visitor_phone",
                "visitor_email",
                "visitor_city",
            ];

            keys.forEach(
                (
                    key
                ) =>
                    window.localStorage.removeItem(
                        key
                    )
            );

            router.push(
                "/"
            );
        } catch (err) {
            console.error(
                "Account deletion error:",
                err
            );

            setError(
                "We couldn't delete your account. Nothing else was changed."
            );
        } finally {
            setDeleting(false);
        }
    }

    function signOut() {
        const keys = [
            "nt_visitor_id",
            "nt_visitor_name",
            "nt_visitor_phone",
            "nt_visitor_email",
            "nt_visitor_city",
            "nt_visitor_language",
        ];

        keys.forEach(
            (
                key
            ) =>
                window.localStorage.removeItem(
                    key
                )
        );

        router.push(
            "/"
        );
    }

    const initials =
        getInitials(
            profile.name
        );

    if (loading) {
        return (
            <ProfileSkeleton />
        );
    }

    return (
        <main className="nt-profile-page">
            <div className="nt-profile-container">
                <section className="nt-profile-hero">
                    <div className="nt-profile-hero-copy">
                        <span className="nt-profile-eyebrow">
                            YOUR PROFILE
                        </span>

                        <h1>
                            Make NiceThings
                            <br />
                            <em>
                                yours.
                            </em>
                        </h1>

                        <p>
                            Keep your
                            preferences,
                            saved places and
                            experiences in
                            one place.
                        </p>
                    </div>

                    <div className="nt-profile-avatar-large">
                        {initials ||
                            "N"}
                    </div>
                </section>

                {error && (
                    <motion.div
                        className="nt-profile-error"
                        initial={{
                            opacity: 0,
                            y: -8,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                    >
                        <span>
                            {error}
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setError(
                                    null
                                )
                            }
                        >
                            <X
                                size={
                                    15
                                }
                            />
                        </button>
                    </motion.div>
                )}

                <section className="nt-profile-card">
                    <div className="nt-profile-card-head">
                        <div className="nt-profile-identity">
                            <div className="nt-profile-avatar">
                                {initials ||
                                    "N"}
                            </div>

                            <div>
                                <span>
                                    MEMBER
                                </span>

                                <h2>
                                    {profile.name ||
                                        "NiceThings visitor"}
                                </h2>

                                <p>
                                    {profile.city ||
                                        "Cameroon"}
                                </p>
                            </div>
                        </div>

                        <button
                            type="button"
                            className="nt-edit-profile"
                            onClick={() =>
                                setShowEdit(
                                    true
                                )
                            }
                        >
                            <Pencil
                                size={
                                    14
                                }
                            />

                            Edit profile
                        </button>
                    </div>

                    <div className="nt-profile-stats">
                        <ProfileStat
                            value={
                                stats.saved
                            }
                            label="Saved"
                            icon={
                                <Heart
                                    size={
                                        16
                                    }
                                />
                            }
                        />

                        <ProfileStat
                            value={
                                stats.arrivals
                            }
                            label="Arrivals"
                            icon={
                                <MapPin
                                    size={
                                        16
                                    }
                                />
                            }
                        />

                        <ProfileStat
                            value={
                                stats.reviews
                            }
                            label="Reviews"
                            icon={
                                <Sparkles
                                    size={
                                        16
                                    }
                                />
                            }
                        />
                    </div>
                </section>

                <section className="nt-profile-section">
                    <div className="nt-profile-section-heading">
                        <span>
                            PERSONAL
                        </span>

                        <h2>
                            Your details
                        </h2>
                    </div>

                    <div className="nt-profile-details">
                        <ProfileDetail
                            icon={
                                <User
                                    size={
                                        17
                                    }
                                />
                            }
                            label="Full name"
                            value={
                                profile.name ||
                                "Not added"
                            }
                        />

                        <ProfileDetail
                            icon={
                                <Phone
                                    size={
                                        17
                                    }
                                />
                            }
                            label="Phone"
                            value={
                                profile.phone ||
                                "Not added"
                            }
                        />

                        <ProfileDetail
                            icon={
                                <Mail
                                    size={
                                        17
                                    }
                                />
                            }
                            label="Email"
                            value={
                                profile.email ||
                                "Not added"
                            }
                        />

                        <ProfileDetail
                            icon={
                                <MapPin
                                    size={
                                        17
                                    }
                                />
                            }
                            label="City"
                            value={
                                profile.city ||
                                "Not added"
                            }
                        />
                    </div>
                </section>

                <section className="nt-profile-section">
                    <div className="nt-profile-section-heading">
                        <span>
                            PREFERENCES
                        </span>

                        <h2>
                            Make it yours
                        </h2>
                    </div>

                    <div className="nt-profile-settings">
                        <button
                            type="button"
                            className="nt-setting-row"
                            onClick={() =>
                                setShowLanguage(
                                    true
                                )
                            }
                        >
                            <div className="nt-setting-icon">
                                <Globe2
                                    size={
                                        18
                                    }
                                />
                            </div>

                            <div className="nt-setting-copy">
                                <strong>
                                    Language
                                </strong>

                                <span>
                                    {profile.language ===
                                        "fr"
                                        ? "Français"
                                        : "English"}
                                </span>
                            </div>

                            <ChevronRight
                                size={
                                    17
                                }
                            />
                        </button>

                        <button
                            type="button"
                            className="nt-setting-row"
                            onClick={() =>
                                setError(
                                    "Notification preferences are coming next."
                                )
                            }
                        >
                            <div className="nt-setting-icon">
                                <Bell
                                    size={
                                        18
                                    }
                                />
                            </div>

                            <div className="nt-setting-copy">
                                <strong>
                                    Notifications
                                </strong>

                                <span>
                                    Stay updated
                                    about places
                                    you care about
                                </span>
                            </div>

                            <ChevronRight
                                size={
                                    17
                                }
                            />
                        </button>

                        <Link
                            href="/saved"
                            className="nt-setting-row"
                        >
                            <div className="nt-setting-icon">
                                <Heart
                                    size={
                                        18
                                    }
                                />
                            </div>

                            <div className="nt-setting-copy">
                                <strong>
                                    Saved places
                                </strong>

                                <span>
                                    Your personal
                                    collection
                                </span>
                            </div>

                            <ChevronRight
                                size={
                                    17
                                }
                            />
                        </Link>
                    </div>
                </section>

                <section className="nt-profile-security">
                    <div className="nt-security-icon">
                        <ShieldCheck
                            size={
                                19
                            }
                        />
                    </div>

                    <div>
                        <strong>
                            Your information,
                            your control.
                        </strong>

                        <p>
                            NiceThings keeps
                            your profile
                            preferences under
                            your control.
                        </p>
                    </div>
                </section>

                <section className="nt-profile-account-actions">
                    <button
                        type="button"
                        onClick={
                            signOut
                        }
                    >
                        <LogOut
                            size={
                                16
                            }
                        />
                        Sign out
                    </button>

                    <button
                        type="button"
                        className="danger"
                        onClick={() =>
                            setShowDelete(
                                true
                            )
                        }
                    >
                        <Trash2
                            size={
                                16
                            }
                        />
                        Delete account
                    </button>
                </section>

                <div className="nt-profile-footer">
                    <span>
                        NiceThings
                    </span>

                    <span>
                        Discover more.
                        Experience better.
                    </span>
                </div>
            </div>

            <AnimatePresence>
                {showEdit && (
                    <EditProfileModal
                        profile={
                            profile
                        }
                        setProfile={
                            setProfile
                        }
                        saving={
                            saving
                        }
                        save={
                            saveProfile
                        }
                        cancel={
                            cancelEdit
                        }
                        showCity={
                            showCity
                        }
                        setShowCity={
                            setShowCity
                        }
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showLanguage && (
                    <LanguageModal
                        language={
                            profile.language
                        }
                        changeLanguage={
                            changeLanguage
                        }
                        close={() =>
                            setShowLanguage(
                                false
                            )
                        }
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {showDelete && (
                    <DeleteModal
                        deleting={
                            deleting
                        }
                        confirm={
                            deleteAccount
                        }
                        close={() =>
                            setShowDelete(
                                false
                            )
                        }
                    />
                )}
            </AnimatePresence>

            <AnimatePresence>
                {saved && (
                    <motion.div
                        className="nt-profile-toast"
                        initial={{
                            opacity: 0,
                            y: 15,
                        }}
                        animate={{
                            opacity: 1,
                            y: 0,
                        }}
                        exit={{
                            opacity: 0,
                            y: 15,
                        }}
                    >
                        <Check
                            size={
                                15
                            }
                        />
                        Profile updated
                    </motion.div>
                )}
            </AnimatePresence>
        </main>
    );
}

function ProfileStat({
    value,
    label,
    icon,
}: {
    value: number;
    label: string;
    icon: React.ReactNode;
}) {
    return (
        <div className="nt-profile-stat">
            <div>
                {icon}
            </div>

            <strong>
                {value}
            </strong>

            <span>
                {label}
            </span>
        </div>
    );
}

function ProfileDetail({
    icon,
    label,
    value,
}: {
    icon: React.ReactNode;
    label: string;
    value: string;
}) {
    return (
        <div className="nt-profile-detail">
            <div className="nt-detail-icon">
                {icon}
            </div>

            <div>
                <span>
                    {label}
                </span>

                <strong>
                    {value}
                </strong>
            </div>
        </div>
    );
}

function EditProfileModal({
    profile,
    setProfile,
    saving,
    save,
    cancel,
    showCity,
    setShowCity,
}: {
    profile: ProfileState;
    setProfile: React.Dispatch<
        React.SetStateAction<ProfileState>
    >;
    saving: boolean;
    save: () => void;
    cancel: () => void;
    showCity: boolean;
    setShowCity: (
        value: boolean
    ) => void;
}) {
    return (
        <motion.div
            className="nt-modal-overlay"
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: 1,
            }}
            exit={{
                opacity: 0,
            }}
        >
            <motion.div
                className="nt-profile-modal"
                initial={{
                    opacity: 0,
                    y: 30,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                exit={{
                    opacity: 0,
                    y: 30,
                }}
            >
                <div className="nt-modal-header">
                    <div>
                        <span>
                            PROFILE
                        </span>

                        <h2>
                            Edit your
                            details
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={
                            cancel
                        }
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="nt-profile-form">
                    <label>
                        <span>
                            Full name
                        </span>

                        <input
                            value={
                                profile.name
                            }
                            onChange={(
                                event
                            ) =>
                                setProfile(
                                    (
                                        current
                                    ) => ({
                                        ...current,
                                        name:
                                            event
                                                .target
                                                .value,
                                    })
                                )
                            }
                            placeholder="Your name"
                        />
                    </label>

                    <label>
                        <span>
                            Phone
                        </span>

                        <input
                            value={
                                profile.phone
                            }
                            onChange={(
                                event
                            ) =>
                                setProfile(
                                    (
                                        current
                                    ) => ({
                                        ...current,
                                        phone:
                                            event
                                                .target
                                                .value,
                                    })
                                )
                            }
                            placeholder="+237..."
                            inputMode="tel"
                        />
                    </label>

                    <label>
                        <span>
                            Email
                        </span>

                        <input
                            value={
                                profile.email
                            }
                            onChange={(
                                event
                            ) =>
                                setProfile(
                                    (
                                        current
                                    ) => ({
                                        ...current,
                                        email:
                                            event
                                                .target
                                                .value,
                                    })
                                )
                            }
                            placeholder="you@example.com"
                            type="email"
                        />
                    </label>

                    <div className="nt-form-select">
                        <span>
                            City
                        </span>

                        <button
                            type="button"
                            onClick={() =>
                                setShowCity(
                                    !showCity
                                )
                            }
                        >
                            {profile.city ||
                                "Choose your city"}

                            <ChevronRight
                                size={
                                    16
                                }
                            />
                        </button>

                        <AnimatePresence>
                            {showCity && (
                                <motion.div
                                    className="nt-city-menu"
                                    initial={{
                                        opacity: 0,
                                        y: -5,
                                    }}
                                    animate={{
                                        opacity: 1,
                                        y: 0,
                                    }}
                                    exit={{
                                        opacity: 0,
                                        y: -5,
                                    }}
                                >
                                    {CITIES.map(
                                        (
                                            city
                                        ) => (
                                            <button
                                                key={
                                                    city
                                                }
                                                type="button"
                                                onClick={() => {
                                                    setProfile(
                                                        (
                                                            current
                                                        ) => ({
                                                            ...current,
                                                            city,
                                                        })
                                                    );

                                                    setShowCity(
                                                        false
                                                    );
                                                }}
                                            >
                                                {
                                                    city
                                                }

                                                {profile.city ===
                                                    city && (
                                                        <Check
                                                            size={
                                                                14
                                                            }
                                                        />
                                                    )}
                                            </button>
                                        )
                                    )}
                                </motion.div>
                            )}
                        </AnimatePresence>
                    </div>
                </div>

                <div className="nt-modal-actions">
                    <button
                        type="button"
                        onClick={
                            cancel
                        }
                    >
                        Cancel
                    </button>

                    <button
                        type="button"
                        onClick={
                            save
                        }
                        disabled={
                            saving
                        }
                    >
                        {saving
                            ? "Saving..."
                            : "Save changes"}

                        {!saving && (
                            <ArrowRight
                                size={
                                    15
                                }
                            />
                        )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function LanguageModal({
    language,
    changeLanguage,
    close,
}: {
    language: Language;
    changeLanguage: (
        language: Language
    ) => void;
    close: () => void;
}) {
    return (
        <motion.div
            className="nt-modal-overlay"
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: 1,
            }}
            exit={{
                opacity: 0,
            }}
            onClick={close}
        >
            <motion.div
                className="nt-language-modal"
                initial={{
                    opacity: 0,
                    y: 25,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                exit={{
                    opacity: 0,
                    y: 25,
                }}
                onClick={(event) =>
                    event.stopPropagation()
                }
            >
                <div className="nt-modal-header">
                    <div>
                        <span>
                            PREFERENCE
                        </span>

                        <h2>
                            Language
                        </h2>
                    </div>

                    <button
                        type="button"
                        onClick={
                            close
                        }
                    >
                        <X size={19} />
                    </button>
                </div>

                <div className="nt-language-options">
                    <button
                        type="button"
                        className={
                            language ===
                                "en"
                                ? "selected"
                                : ""
                        }
                        onClick={() =>
                            changeLanguage(
                                "en"
                            )
                        }
                    >
                        <span className="nt-language-symbol">
                            EN
                        </span>

                        <div>
                            <strong>
                                English
                            </strong>

                            <span>
                                English
                            </span>
                        </div>

                        {language ===
                            "en" && (
                                <Check
                                    size={
                                        16
                                    }
                                />
                            )}
                    </button>

                    <button
                        type="button"
                        className={
                            language ===
                                "fr"
                                ? "selected"
                                : ""
                        }
                        onClick={() =>
                            changeLanguage(
                                "fr"
                            )
                        }
                    >
                        <span className="nt-language-symbol">
                            FR
                        </span>

                        <div>
                            <strong>
                                Français
                            </strong>

                            <span>
                                Français
                            </span>
                        </div>

                        {language ===
                            "fr" && (
                                <Check
                                    size={
                                        16
                                    }
                                />
                            )}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function DeleteModal({
    deleting,
    confirm,
    close,
}: {
    deleting: boolean;
    confirm: () => void;
    close: () => void;
}) {
    return (
        <motion.div
            className="nt-modal-overlay"
            initial={{
                opacity: 0,
            }}
            animate={{
                opacity: 1,
            }}
            exit={{
                opacity: 0,
            }}
        >
            <motion.div
                className="nt-delete-modal"
                initial={{
                    opacity: 0,
                    scale: 0.97,
                }}
                animate={{
                    opacity: 1,
                    scale: 1,
                }}
                exit={{
                    opacity: 0,
                    scale: 0.97,
                }}
            >
                <div className="nt-delete-icon">
                    <Trash2
                        size={
                            21
                        }
                    />
                </div>

                <span>
                    ACCOUNT
                </span>

                <h2>
                    Delete your
                    account?
                </h2>

                <p>
                    This permanently removes
                    your NiceThings profile,
                    saved places, reviews and
                    arrival history. This
                    action cannot be undone.
                </p>

                <div className="nt-delete-actions">
                    <button
                        type="button"
                        onClick={
                            close
                        }
                        disabled={
                            deleting
                        }
                    >
                        Keep my account
                    </button>

                    <button
                        type="button"
                        className="danger"
                        onClick={
                            confirm
                        }
                        disabled={
                            deleting
                        }
                    >
                        {deleting
                            ? "Deleting..."
                            : "Delete account"}
                    </button>
                </div>
            </motion.div>
        </motion.div>
    );
}

function ProfileSkeleton() {
    return (
        <main className="nt-profile-page">
            <div className="nt-profile-container">
                <section className="nt-profile-hero">
                    <div className="nt-profile-skeleton-copy">
                        <span />
                        <span />
                        <span />
                    </div>

                    <div className="nt-profile-skeleton-avatar" />
                </section>

                <section className="nt-profile-card nt-profile-skeleton-card">
                    <div />
                    <div />
                    <div />
                </section>

                <section className="nt-profile-section">
                    <div className="nt-profile-skeleton-lines">
                        <span />
                        <span />
                    </div>

                    <div className="nt-profile-details-skeleton">
                        {Array.from(
                            {
                                length: 4,
                            }
                        ).map(
                            (
                                _,
                                index
                            ) => (
                                <div
                                    key={
                                        index
                                    }
                                />
                            )
                        )}
                    </div>
                </section>
            </div>
        </main>
    );
}

function getInitials(
    name: string
) {
    const parts =
        name
            .trim()
            .split(
                /\s+/
            )
            .filter(
                Boolean
            );

    if (
        parts.length ===
        0
    ) {
        return "";
    }

    if (
        parts.length ===
        1
    ) {
        return parts[0]
            .slice(
                0,
                2
            )
            .toUpperCase();
    }

    return (
        parts[0][0] +
        parts[
        parts.length - 1
        ][0]
    ).toUpperCase();
}