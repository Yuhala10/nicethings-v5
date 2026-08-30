"use client";

import {
    useEffect,
    useState,
} from "react";

import {
    Check,
    ChevronDown,
    ChevronUp,
    MapPin,
    ShieldCheck,
    X,
} from "lucide-react";

import {
    acceptAllConsent,
    getStoredConsent,
    saveConsent,
    type ConsentState,
} from "../../lib/consent";

type ConsentModalProps = {
    onComplete?: () => void;
};

const PRIVACY_VERSION = "1.0";

export default function ConsentModal({
    onComplete,
}: ConsentModalProps) {
    const [visible, setVisible] =
        useState(false);

    const [manageOpen, setManageOpen] =
        useState(false);

    const [consent, setConsent] =
        useState<ConsentState>({
            privacy: false,
            cookies: false,
            location: false,
        });

    useEffect(() => {
        const stored =
            getStoredConsent();

        if (
            stored.privacy !== true
        ) {
            setConsent(stored);
            setVisible(true);
        }
    }, []);

    useEffect(() => {
        if (!visible) {
            document.body.style.overflow =
                "";
            return;
        }

        document.body.style.overflow =
            "hidden";

        return () => {
            document.body.style.overflow =
                "";
        };
    }, [visible]);

    if (!visible) {
        return null;
    }

    function finish(
        nextConsent: ConsentState
    ) {
        saveConsent(
            nextConsent
        );
        window.dispatchEvent(new Event("nicethings:consent"));

        setConsent(
            nextConsent
        );

        setVisible(false);

        onComplete?.();
    }

    function handleAcceptAll() {
        acceptAllConsent();
        window.dispatchEvent(new Event("nicethings:consent"));

        setConsent({
            privacy: true,
            cookies: true,
            location: true,
        });

        setVisible(false);

        onComplete?.();
    }

    function handleSaveChoices() {
        finish({
            ...consent,
            privacy: true,
        });
    }

    return (
        <div
            className="nt-consent-overlay"
            role="dialog"
            aria-modal="true"
            aria-labelledby="nt-consent-title"
        >
            <div
                className="nt-consent-backdrop"
                aria-hidden="true"
            />

            <section className="nt-consent-modal">
                <div className="nt-consent-brand">
                    <div className="nt-consent-icon">
                        <ShieldCheck
                            size={22}
                            strokeWidth={2.2}
                        />
                    </div>

                    <div>
                        <span>
                            NICE THINGS
                        </span>

                        <strong>
                            Your privacy matters.
                        </strong>
                    </div>
                </div>

                <div className="nt-consent-content">
                    <p className="nt-consent-eyebrow">
                        BEFORE YOU EXPLORE
                    </p>

                    <h2 id="nt-consent-title">
                        Welcome to NiceThings.
                    </h2>

                    <p className="nt-consent-description">
                        NiceThings helps you
                        discover places around
                        you. Before you begin,
                        choose how you'd like us
                        to use your information.
                    </p>

                    <div className="nt-consent-options">
                        <ConsentOption
                            icon={
                                <ShieldCheck
                                    size={18}
                                />
                            }
                            title="Privacy"
                            description="We use your information only to provide and improve NiceThings."
                            checked={
                                consent.privacy
                            }
                            required
                            onChange={() =>
                                setConsent(
                                    (current) => ({
                                        ...current,
                                        privacy:
                                            !current.privacy,
                                    })
                                )
                            }
                        />

                        <ConsentOption
                            icon={
                                <Check
                                    size={18}
                                />
                            }
                            title="Essential cookies"
                            description="Used to remember important preferences and keep the app working."
                            checked={
                                consent.cookies
                            }
                            onChange={() =>
                                setConsent(
                                    (current) => ({
                                        ...current,
                                        cookies:
                                            !current.cookies,
                                    })
                                )
                            }
                        />

                        <ConsentOption
                            icon={
                                <MapPin
                                    size={18}
                                />
                            }
                            title="Location"
                            description="Used when you choose location-based discovery, nearby places, or location features."
                            checked={
                                consent.location
                            }
                            onChange={() =>
                                setConsent(
                                    (current) => ({
                                        ...current,
                                        location:
                                            !current.location,
                                    })
                                )
                            }
                        />
                    </div>

                    <button
                        type="button"
                        className="nt-consent-manage"
                        onClick={() =>
                            setManageOpen(
                                (open) =>
                                    !open
                            )
                        }
                        aria-expanded={
                            manageOpen
                        }
                    >
                        <span>
                            Manage your choices
                        </span>

                        {manageOpen ? (
                            <ChevronUp
                                size={16}
                            />
                        ) : (
                            <ChevronDown
                                size={16}
                            />
                        )}
                    </button>

                    {manageOpen && (
                        <div className="nt-consent-details">
                            <p>
                                You can change
                                these choices
                                later from
                                your profile
                                settings.
                            </p>

                            <p>
                                Location access
                                is also controlled
                                by your device's
                                own permission
                                settings.
                            </p>

                            <p>
                                Privacy policy
                                version:{" "}
                                <strong>
                                    {
                                        PRIVACY_VERSION
                                    }
                                </strong>
                            </p>
                        </div>
                    )}

                    <div className="nt-consent-actions">
                        <button
                            type="button"
                            className="nt-consent-secondary"
                            onClick={
                                handleSaveChoices
                            }
                        >
                            Continue with choices
                        </button>

                        <button
                            type="button"
                            className="nt-consent-primary"
                            onClick={
                                handleAcceptAll
                            }
                        >
                            Accept all
                        </button>
                    </div>

                    <p className="nt-consent-footer">
                        Read our <a href="/privacy">Privacy Policy</a> and <a href="/terms">Terms</a>. By continuing, you acknowledge our privacy choices and consent experience.
                    </p>
                </div>
            </section>
        </div>
    );
}

function ConsentOption({
    icon,
    title,
    description,
    checked,
    required = false,
    onChange,
}: {
    icon: React.ReactNode;
    title: string;
    description: string;
    checked: boolean;
    required?: boolean;
    onChange: () => void;
}) {
    return (
        <button
            type="button"
            className={[
                "nt-consent-option",
                checked
                    ? "is-checked"
                    : "",
            ]
                .filter(Boolean)
                .join(" ")}
            onClick={onChange}
            aria-pressed={checked}
        >
            <span className="nt-consent-option-icon">
                {icon}
            </span>

            <span className="nt-consent-option-copy">
                <span className="nt-consent-option-title">
                    {title}

                    {required && (
                        <small>
                            Required
                        </small>
                    )}
                </span>

                <span className="nt-consent-option-description">
                    {description}
                </span>
            </span>

            <span
                className="nt-consent-checkbox"
                aria-hidden="true"
            >
                {checked && (
                    <Check
                        size={13}
                        strokeWidth={3}
                    />
                )}
            </span>
        </button>
    );
}