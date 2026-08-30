"use client";

import {
    ChangeEvent,
    FormEvent,
    ReactNode,
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
    Check,
    ImagePlus,
    MapPin,
    Phone,
    Plus,
    Send,
    Sparkles,
    X,
} from "lucide-react";

import Link from "next/link";

import { useRouter } from "next/navigation";

import {
    getSupabaseBrowserClient,
} from "../../lib/supabase/client";

type FormState = {
    name: string;
    category: string;
    cuisine: string;
    city: string;
    neighborhood: string;
    address: string;
    phone: string;
    whatsapp: string;
    website: string;
    description: string;
};

type SubmissionRecord = {
    id?: string;
    status?: string | null;
};

const INITIAL_FORM: FormState = {
    name: "",
    category: "",
    cuisine: "",
    city: "",
    neighborhood: "",
    address: "",
    phone: "",
    whatsapp: "",
    website: "",
    description: "",
};

const CATEGORIES = [
    "Restaurant",
    "Cafe",
    "Bar",
    "Hotel",
    "Bakery",
    "Shopping",
    "Beauty",
    "Wellness",
    "Entertainment",
    "Nature",
    "Other",
];

const CITIES = [
    "Douala",
    "Yaoundé",
    "Buea",
    "Limbe",
    "Bamenda",
    "Bafoussam",
    "Kribi",
];

export default function SubmitPage() {
    const router =
        useRouter();

    const supabase =
        useMemo(
            () =>
                getSupabaseBrowserClient() as any,
            []
        );

    const [
        form,
        setForm,
    ] =
        useState<FormState>(
            INITIAL_FORM
        );

    const [
        imageFiles,
        setImageFiles,
    ] =
        useState<File[]>([]);

    const [
        imagePreviews,
        setImagePreviews,
    ] =
        useState<string[]>(
            []
        );

    const [
        submitting,
        setSubmitting,
    ] =
        useState(false);

    const [
        submitted,
        setSubmitted,
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
        showCategory,
        setShowCategory,
    ] =
        useState(false);

    const [
        showCity,
        setShowCity,
    ] =
        useState(false);

    function updateField(
        field: keyof FormState,
        value: string
    ) {
        setForm(
            (
                current
            ) => ({
                ...current,
                [field]:
                    value,
            })
        );
    }

    function handleImages(
        event: ChangeEvent<HTMLInputElement>
    ) {
        const files =
            Array.from(
                event.target
                    .files ??
                []
            );

        if (
            files.length ===
            0
        ) {
            return;
        }

        const validFiles =
            files
                .filter(
                    (
                        file
                    ) =>
                        file.type.startsWith(
                            "image/"
                        )
                )
                .slice(
                    0,
                    6
                );

        setImageFiles(
            (current) =>
                [
                    ...current,
                    ...validFiles,
                ].slice(0, 6)
        );

        const urls =
            validFiles.map(
                (
                    file
                ) =>
                    URL.createObjectURL(
                        file
                    )
            );

        setImagePreviews(
            (
                current
            ) => {
                current.forEach(
                    (
                        url
                    ) =>
                        URL.revokeObjectURL(
                            url
                        )
                );

                return [
                    ...current,
                    ...urls,
                ].slice(0, 6);
            }
        );
    }

    function removeImage(
        index: number
    ) {
        setImageFiles(
            (
                current
            ) =>
                current.filter(
                    (
                        _,
                        itemIndex
                    ) =>
                        itemIndex !==
                        index
                )
        );

        setImagePreviews(
            (
                current
            ) =>
                current.filter(
                    (
                        _,
                        itemIndex
                    ) =>
                        itemIndex !==
                        index
                )
        );
    }

    function validate() {
        if (
            !form.name.trim()
        ) {
            return "Please enter the place name.";
        }

        if (
            !form.category
        ) {
            return "Please choose a category.";
        }

        if (
            !form.city
        ) {
            return "Please choose a city.";
        }

        if (
            !form.description.trim()
        ) {
            return "Please tell us a little about this place.";
        }

        if (
            form.description.trim()
                .length <
            20
        ) {
            return "Please give us a little more detail about the place.";
        }

        return null;
    }

    async function submitPlace(
        event: FormEvent<HTMLFormElement>
    ) {
        event.preventDefault();

        if (
            submitting
        ) {
            return;
        }

        setError(null);

        const validationError =
            validate();

        if (
            validationError
        ) {
            setError(
                validationError
            );

            return;
        }

        setSubmitting(
            true
        );

        try {
            const visitorId =
                window.localStorage.getItem(
                    "nt_visitor_id"
                );

            const submissionPayload =
            {
                name:
                    form.name.trim(),

                category:
                    form.category,

                cuisine:
                    form.cuisine.trim() ||
                    null,

                city:
                    form.city,

                neighborhood:
                    form.neighborhood.trim() ||
                    null,

                address:
                    form.address.trim() ||
                    null,

                phone:
                    form.phone.trim() ||
                    null,

                whatsapp:
                    form.whatsapp.trim() ||
                    null,

                website:
                    form.website.trim() ||
                    null,

                description:
                    form.description.trim(),

                status:
                    "PENDING",

                visitor_id:
                    visitorId ||
                    null,
            };

            const {
                data,
                error:
                submissionError,
            } =
                await supabase
                    .from(
                        "nt_spot_submissions"
                    )
                    .insert(
                        submissionPayload
                    )
                    .select(
                        "id,status"
                    )
                    .maybeSingle();

            if (
                submissionError
            ) {
                throw submissionError;
            }

            const submission =
                data as
                | SubmissionRecord
                | null;

            /*
             * Images are intentionally uploaded
             * only when the submission has been
             * created successfully.
             *
             * The existing database schema is
             * respected here. If your storage
             * bucket/policies are configured later,
             * this block can be connected without
             * changing the submission flow.
             */

            if (
                submission?.id &&
                imageFiles.length >
                0
            ) {
                await uploadSubmissionImages(
                    submission.id,
                    imageFiles
                );
            }

            setSubmitted(
                true
            );
        } catch (err) {
            console.error(
                "Submission error:",
                err
            );

            setError(
                "We couldn't submit this place right now. Please try again."
            );
        } finally {
            setSubmitting(
                false
            );
        }
    }

    async function uploadSubmissionImages(
        submissionId: string,
        files: File[]
    ) {
        /*
         * Uploading is deliberately isolated
         * from the main submission mutation.
         *
         * If storage isn't configured yet,
         * the place submission still remains
         * valid instead of being lost.
         */

        for (
            let index = 0;
            index <
            files.length;
            index += 1
        ) {
            const file =
                files[index];

            const extension =
                file.name
                    .split(".")
                    .pop() ??
                "jpg";

            const path =
                `submissions/${submissionId}/${index}-${crypto.randomUUID()}.${extension}`;

            const {
                error:
                uploadError,
            } =
                await supabase.storage
                    .from(
                        "spot-images"
                    )
                    .upload(
                        path,
                        file,
                        {
                            cacheControl:
                                "3600",
                            upsert:
                                false,
                        }
                    );

            if (
                uploadError
            ) {
                console.warn(
                    "Image upload skipped:",
                    uploadError
                );

                continue;
            }
        }
    }

    function resetForm() {
        imagePreviews.forEach(
            (
                url
            ) =>
                URL.revokeObjectURL(
                    url
                )
        );

        setForm(
            INITIAL_FORM
        );

        setImageFiles(
            []
        );

        setImagePreviews(
            []
        );

        setSubmitted(
            false
        );

        setError(null);
    }

    if (
        submitted
    ) {
        return (
            <SuccessScreen
                reset={
                    resetForm
                }
                router={
                    router
                }
            />
        );
    }

    return (
        <main className="nt-submit-page">
            <div className="nt-submit-container">
                <header className="nt-submit-header">
                    <Link
                        href="/"
                        className="nt-submit-back"
                    >
                        <ArrowLeft
                            size={
                                16
                            }
                        />

                        Back
                    </Link>

                    <div className="nt-submit-title">
                        <span>
                            CONTRIBUTE
                        </span>

                        <h1>
                            Know a nice
                            <br />
                            <em>
                                place?
                            </em>
                        </h1>

                        <p>
                            Help other people
                            discover somewhere
                            worth knowing.
                        </p>
                    </div>

                    <div className="nt-submit-spark">
                        <Sparkles
                            size={
                                20
                            }
                        />
                    </div>
                </header>

                {error && (
                    <motion.div
                        className="nt-submit-error"
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
                                    16
                                }
                            />
                        </button>
                    </motion.div>
                )}

                <form
                    className="nt-submit-form"
                    onSubmit={
                        submitPlace
                    }
                >
                    <section className="nt-submit-section">
                        <div className="nt-submit-section-number">
                            01
                        </div>

                        <div className="nt-submit-section-content">
                            <div className="nt-submit-section-heading">
                                <span>
                                    THE BASICS
                                </span>

                                <h2>
                                    Tell us about
                                    the place
                                </h2>
                            </div>

                            <div className="nt-submit-fields">
                                <Field
                                    label="Place name"
                                    required
                                >
                                    <input
                                        value={
                                            form.name
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateField(
                                                "name",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="e.g. Maison H"
                                        maxLength={
                                            120
                                        }
                                    />
                                </Field>

                                <div className="nt-submit-field">
                                    <label>
                                        Category
                                        <b>
                                            *
                                        </b>
                                    </label>

                                    <div className="nt-custom-select">
                                        <button
                                            type="button"
                                            onClick={() =>
                                                setShowCategory(
                                                    !showCategory
                                                )
                                            }
                                        >
                                            {form.category ||
                                                "Choose a category"}

                                            <ArrowRight
                                                size={
                                                    15
                                                }
                                            />
                                        </button>

                                        <AnimatePresence>
                                            {showCategory && (
                                                <motion.div
                                                    className="nt-submit-dropdown"
                                                    initial={{
                                                        opacity: 0,
                                                        y: -6,
                                                    }}
                                                    animate={{
                                                        opacity: 1,
                                                        y: 0,
                                                    }}
                                                    exit={{
                                                        opacity: 0,
                                                        y: -6,
                                                    }}
                                                >
                                                    {CATEGORIES.map(
                                                        (
                                                            category
                                                        ) => (
                                                            <button
                                                                type="button"
                                                                key={
                                                                    category
                                                                }
                                                                onClick={() => {
                                                                    updateField(
                                                                        "category",
                                                                        category
                                                                    );

                                                                    setShowCategory(
                                                                        false
                                                                    );
                                                                }}
                                                            >
                                                                {
                                                                    category
                                                                }

                                                                {form.category ===
                                                                    category && (
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

                                <Field label="Cuisine / style">
                                    <input
                                        value={
                                            form.cuisine
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateField(
                                                "cuisine",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="e.g. Cameroonian, Italian, Modern"
                                        maxLength={
                                            100
                                        }
                                    />
                                </Field>

                                <div className="nt-submit-two-column">
                                    <div className="nt-submit-field">
                                        <label>
                                            City
                                            <b>
                                                *
                                            </b>
                                        </label>

                                        <div className="nt-custom-select">
                                            <button
                                                type="button"
                                                onClick={() =>
                                                    setShowCity(
                                                        !showCity
                                                    )
                                                }
                                            >
                                                {form.city ||
                                                    "Choose a city"}

                                                <ArrowRight
                                                    size={
                                                        15
                                                    }
                                                />
                                            </button>

                                            <AnimatePresence>
                                                {showCity && (
                                                    <motion.div
                                                        className="nt-submit-dropdown"
                                                        initial={{
                                                            opacity: 0,
                                                            y: -6,
                                                        }}
                                                        animate={{
                                                            opacity: 1,
                                                            y: 0,
                                                        }}
                                                        exit={{
                                                            opacity: 0,
                                                            y: -6,
                                                        }}
                                                    >
                                                        {CITIES.map(
                                                            (
                                                                city
                                                            ) => (
                                                                <button
                                                                    type="button"
                                                                    key={
                                                                        city
                                                                    }
                                                                    onClick={() => {
                                                                        updateField(
                                                                            "city",
                                                                            city
                                                                        );

                                                                        setShowCity(
                                                                            false
                                                                        );
                                                                    }}
                                                                >
                                                                    {
                                                                        city
                                                                    }

                                                                    {form.city ===
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

                                    <Field label="Neighborhood">
                                        <input
                                            value={
                                                form.neighborhood
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateField(
                                                    "neighborhood",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="e.g. Bonapriso"
                                            maxLength={
                                                100
                                            }
                                        />
                                    </Field>
                                </div>

                                <Field label="Address">
                                    <div className="nt-input-with-icon">
                                        <MapPin
                                            size={
                                                16
                                            }
                                        />

                                        <input
                                            value={
                                                form.address
                                            }
                                            onChange={(
                                                event
                                            ) =>
                                                updateField(
                                                    "address",
                                                    event
                                                        .target
                                                        .value
                                                )
                                            }
                                            placeholder="Street, landmark or area"
                                            maxLength={
                                                200
                                            }
                                        />
                                    </div>
                                </Field>

                                <Field
                                    label="Description"
                                    required
                                >
                                    <textarea
                                        value={
                                            form.description
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateField(
                                                "description",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="What makes this place special? Tell people what they should know..."
                                        rows={
                                            6
                                        }
                                        maxLength={
                                            1000
                                        }
                                    />

                                    <div className="nt-character-count">
                                        {
                                            form.description
                                                .length
                                        }
                                        /1000
                                    </div>
                                </Field>
                            </div>
                        </div>
                    </section>

                    <section className="nt-submit-section">
                        <div className="nt-submit-section-number">
                            02
                        </div>

                        <div className="nt-submit-section-content">
                            <div className="nt-submit-section-heading">
                                <span>
                                    CONTACT
                                </span>

                                <h2>
                                    Help people
                                    reach them
                                </h2>
                            </div>

                            <div className="nt-submit-fields">
                                <div className="nt-submit-two-column">
                                    <Field label="Phone">
                                        <div className="nt-input-with-icon">
                                            <Phone
                                                size={
                                                    16
                                                }
                                            />

                                            <input
                                                value={
                                                    form.phone
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateField(
                                                        "phone",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="+237..."
                                                inputMode="tel"
                                            />
                                        </div>
                                    </Field>

                                    <Field label="WhatsApp">
                                        <div className="nt-input-with-icon">
                                            <Phone
                                                size={
                                                    16
                                                }
                                            />

                                            <input
                                                value={
                                                    form.whatsapp
                                                }
                                                onChange={(
                                                    event
                                                ) =>
                                                    updateField(
                                                        "whatsapp",
                                                        event
                                                            .target
                                                            .value
                                                    )
                                                }
                                                placeholder="+237..."
                                                inputMode="tel"
                                            />
                                        </div>
                                    </Field>
                                </div>

                                <Field label="Website">
                                    <input
                                        value={
                                            form.website
                                        }
                                        onChange={(
                                            event
                                        ) =>
                                            updateField(
                                                "website",
                                                event
                                                    .target
                                                    .value
                                            )
                                        }
                                        placeholder="https://..."
                                        type="url"
                                    />
                                </Field>
                            </div>
                        </div>
                    </section>

                    <section className="nt-submit-section">
                        <div className="nt-submit-section-number">
                            03
                        </div>

                        <div className="nt-submit-section-content">
                            <div className="nt-submit-section-heading">
                                <span>
                                    VISUALS
                                </span>

                                <h2>
                                    Show us the
                                    place
                                </h2>

                                <p>
                                    Great photos help
                                    people understand
                                    what makes a place
                                    special.
                                </p>
                            </div>

                            <div className="nt-submit-upload">
                                <label className="nt-upload-main">
                                    <input
                                        type="file"
                                        accept="image/*"
                                        multiple
                                        onChange={
                                            handleImages
                                        }
                                    />

                                    <div className="nt-upload-icon">
                                        <ImagePlus
                                            size={
                                                23
                                            }
                                        />
                                    </div>

                                    <strong>
                                        Add photos
                                    </strong>

                                    <span>
                                        JPG, PNG or WEBP
                                        · up to 6 photos
                                    </span>

                                    <small>
                                        Photos are
                                        optional
                                    </small>
                                </label>

                                {imagePreviews.length >
                                    0 && (
                                        <div className="nt-upload-previews">
                                            {imagePreviews.map(
                                                (
                                                    preview,
                                                    index
                                                ) => (
                                                    <div
                                                        className="nt-upload-preview"
                                                        key={
                                                            preview
                                                        }
                                                    >
                                                        <img
                                                            src={
                                                                preview
                                                            }
                                                            alt={`Preview ${index + 1}`}
                                                        />

                                                        <button
                                                            type="button"
                                                            onClick={() =>
                                                                removeImage(
                                                                    index
                                                                )
                                                            }
                                                            aria-label={`Remove photo ${index + 1}`}
                                                        >
                                                            <X
                                                                size={
                                                                    13
                                                                }
                                                            />
                                                        </button>
                                                    </div>
                                                )
                                            )}

                                            <label className="nt-add-more">
                                                <input
                                                    type="file"
                                                    accept="image/*"
                                                    multiple
                                                    onChange={
                                                        handleImages
                                                    }
                                                />

                                                <Plus
                                                    size={
                                                        18
                                                    }
                                                />

                                                Add more
                                            </label>
                                        </div>
                                    )}
                            </div>
                        </div>
                    </section>

                    <section className="nt-submit-review">
                        <div className="nt-submit-review-icon">
                            <Sparkles
                                size={
                                    19
                                }
                            />
                        </div>

                        <div>
                            <strong>
                                A quick review
                            </strong>

                            <p>
                                Your submission will
                                be reviewed by the
                                NiceThings team before
                                it appears publicly.
                            </p>
                        </div>
                    </section>

                    <div className="nt-submit-actions">
                        <Link
                            href="/"
                            className="nt-submit-cancel"
                        >
                            Cancel
                        </Link>

                        <button
                            type="submit"
                            className="nt-submit-button"
                            disabled={
                                submitting
                            }
                        >
                            {submitting ? (
                                <>
                                    <span className="nt-submit-spinner" />
                                    Sending...
                                </>
                            ) : (
                                <>
                                    Submit place
                                    <Send
                                        size={
                                            16
                                        }
                                    />
                                </>
                            )}
                        </button>
                    </div>
                </form>
            </div>
        </main>
    );
}

function Field({
    label,
    required = false,
    children,
}: {
    label: string;
    required?: boolean;
    children: ReactNode;
}) {
    return (
        <div className="nt-submit-field">
            <label>
                {label}

                {required && (
                    <b>
                        *
                    </b>
                )}
            </label>

            {children}
        </div>
    );
}

function SuccessScreen({
    reset,
    router,
}: {
    reset: () => void;
    router: ReturnType<
        typeof useRouter
    >;
}) {
    return (
        <main className="nt-submit-page nt-submit-success-page">
            <motion.section
                className="nt-submit-success"
                initial={{
                    opacity: 0,
                    y: 25,
                }}
                animate={{
                    opacity: 1,
                    y: 0,
                }}
                transition={{
                    duration: 0.45,
                }}
            >
                <motion.div
                    className="nt-success-check"
                    initial={{
                        scale: 0.5,
                        opacity: 0,
                    }}
                    animate={{
                        scale: 1,
                        opacity: 1,
                    }}
                    transition={{
                        delay: 0.15,
                        type: "spring",
                        stiffness: 180,
                    }}
                >
                    <Check
                        size={
                            32
                        }
                    />
                </motion.div>

                <span className="nt-submit-eyebrow">
                    THANK YOU
                </span>

                <h1>
                    That's a nice
                    <br />
                    <em>
                        contribution.
                    </em>
                </h1>

                <p>
                    We've received your
                    submission. Our team will
                    review the details and make
                    sure everything looks great
                    before publishing it.
                </p>

                <div className="nt-success-note">
                    <Sparkles
                        size={
                            16
                        }
                    />

                    <span>
                        We'll take it from here.
                    </span>
                </div>

                <div className="nt-success-actions">
                    <button
                        type="button"
                        onClick={
                            reset
                        }
                    >
                        Submit another place
                        <Plus
                            size={
                                15
                            }
                        />
                    </button>

                    <button
                        type="button"
                        onClick={() =>
                            router.push(
                                "/"
                            )
                        }
                    >
                        Back to NiceThings
                        <ArrowRight
                            size={
                                15
                            }
                        />
                    </button>
                </div>
            </motion.section>
        </main>
    );
}