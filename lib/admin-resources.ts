// What the admin API may read and change, per resource. Anything not listed
// here is rejected, so adding a column to the database never silently makes
// it writable from the admin UI.

export const SPOT_EDITABLE_FIELDS = [
    "name",
    "slug",
    "description",
    "category",
    "cuisine",
    "city",
    "neighborhood",
    "address",
    "landmark",
    "latitude",
    "longitude",
    "phone",
    "whatsapp",
    "website",
    "instagram",
    "average_price",
    "minimum_price",
    "maximum_price",
    "opening_time",
    "closing_time",
    "monday_open",
    "tuesday_open",
    "wednesday_open",
    "thursday_open",
    "friday_open",
    "saturday_open",
    "sunday_open",
    "vibes",
    "good_for",
    "amenities",
    "status",
    "verified",
    "featured",
    "last_verified_at",
] as const;

export const ADMIN_RESOURCES = {
    spots: {
        table: "nt_spots",
        patchable: SPOT_EDITABLE_FIELDS,
        statuses: ["DRAFT", "PENDING", "APPROVED", "REJECTED", "CLOSED"],
    },
    submissions: {
        table: "nt_spot_submissions",
        patchable: ["status"],
        statuses: ["PENDING", "APPROVED", "REJECTED"],
    },
    reports: {
        table: "nt_reports",
        patchable: ["status"],
        statuses: ["PENDING", "RESOLVED", "REJECTED"],
    },
} as const;

export type AdminResource = keyof typeof ADMIN_RESOURCES;

export function isAdminResource(value: string): value is AdminResource {
    return value in ADMIN_RESOURCES;
}
