export type Json =
    | string
    | number
    | boolean
    | null
    | {
        [key: string]:
        | Json
        | undefined;
    }
    | Json[];

export type Database = {
    public: {
        Tables: {
            nt_visitors: {
                Row: {
                    id: string;
                    preferred_language:
                    | "en"
                    | "fr";
                };
                Insert: {
                    id: string;
                    preferred_language?:
                    | "en"
                    | "fr";
                };
                Update: {
                    id?: string;
                    preferred_language?:
                    | "en"
                    | "fr";
                };
                Relationships: [];
            };

            nt_spots: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_spot_photos: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_spot_menu: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_searches: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_saved_spots: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_arrivals: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_reviews: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_reports: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_consents: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_spot_submissions: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_access_passes: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };

            nt_payment_requests: {
                Row: Record<
                    string,
                    unknown
                >;
                Insert: Record<
                    string,
                    unknown
                >;
                Update: Record<
                    string,
                    unknown
                >;
                Relationships: [];
            };
        };

        Views: {
            [_ in never]: never;
        };

        Functions: {
            [_ in never]: never;
        };

        Enums: {
            [_ in never]: never;
        };

        CompositeTypes: {
            [_ in never]: never;
        };
    };
};

export type Tables<
    TableName extends keyof Database["public"]["Tables"]
> =
    Database["public"]["Tables"][TableName]["Row"];

export type Spot =
    Tables<"nt_spots">;

export type Visitor =
    Tables<"nt_visitors">;

export type Coordinates = {
    latitude: number;
    longitude: number;
};

export type Language =
    | "en"
    | "fr";

export type SpotStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

export type SubmissionStatus =
    | "PENDING"
    | "APPROVED"
    | "REJECTED";

export type ReviewRating =
    | 1
    | 2
    | 3
    | 4
    | 5;

export type SpotSummary = {
    id: string;
    name: string;

    slug?: string | null;

    description?: string | null;

    category?: string | null;
    cuisine?: string | null;

    city?: string | null;
    neighborhood?: string | null;
    address?: string | null;

    latitude?: number | null;
    longitude?: number | null;

    phone?: string | null;
    whatsapp?: string | null;
    website?: string | null;

    rating?: number | null;
    review_count?: number | null;

    verified?: boolean | null;
    featured?: boolean | null;

    minimum_price?: number | null;
    maximum_price?: number | null;
    average_price?: number | null;

    currency?: string | null;

    opening_time?: string | null;
    closing_time?: string | null;

    status?: string | null;

    created_at?: string | null;
    updated_at?: string | null;
};