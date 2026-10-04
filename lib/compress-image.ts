// Photos are resized on the phone before upload (JPEG, longest side
// `maxSide`), so uploads work on mobile data and storage stays small.
export async function compressImage(file: File, maxSide = 1600, quality = 0.82): Promise<File> {
    try {
        const bitmap = await createImageBitmap(file);
        const scale = Math.min(1, maxSide / Math.max(bitmap.width, bitmap.height));
        const canvas = document.createElement("canvas");
        canvas.width = Math.round(bitmap.width * scale);
        canvas.height = Math.round(bitmap.height * scale);
        canvas.getContext("2d")!.drawImage(bitmap, 0, 0, canvas.width, canvas.height);
        const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/jpeg", quality));
        return blob ? new File([blob], "photo.jpg", { type: "image/jpeg" }) : file;
    } catch {
        return file;
    }
}
