export type LatLng = { lat: number; lng: number };

// Great-circle distance in metres.
export function distanceMeters(a: LatLng, b: LatLng) {
    const rad = Math.PI / 180;
    const dLat = (b.lat - a.lat) * rad;
    const dLng = (b.lng - a.lng) * rad;
    const h =
        Math.sin(dLat / 2) ** 2 +
        Math.cos(a.lat * rad) * Math.cos(b.lat * rad) * Math.sin(dLng / 2) ** 2;
    return 6_371_000 * 2 * Math.asin(Math.sqrt(h));
}

// Centre of Yaoundé, used before we know where the visitor is.
export const YAOUNDE_CENTER: LatLng = { lat: 3.8667, lng: 11.5167 };

export const YAOUNDE_BOUNDS: [[number, number], [number, number]] = [
    [11.38, 3.72],
    [11.64, 4.02],
];
