import qrcode from "qrcode-generator";

// A QR code as one SVG path, drawn on the server: no script is sent to the
// browser for it. `size` is the side of the drawing in modules, quiet zone
// included (the white margin a scanner needs around the code).
const QUIET = 2;

export function qrPath(text: string) {
    const code = qrcode(0, "M");
    code.addData(text);
    code.make();
    const count = code.getModuleCount();
    let path = "";
    for (let row = 0; row < count; row++) {
        for (let column = 0; column < count; column++) {
            if (code.isDark(row, column)) path += `M${column + QUIET} ${row + QUIET}h1v1h-1z`;
        }
    }
    return { size: count + QUIET * 2, path };
}
