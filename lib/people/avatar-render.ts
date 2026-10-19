import { createAvatar, type Style } from "@dicebear/core";
import * as avataaars from "@dicebear/avataaars";
import * as lorelei from "@dicebear/lorelei";
import * as micah from "@dicebear/micah";
import * as openPeeps from "@dicebear/open-peeps";
import { BACKDROPS, SKINS, parseAvatar, type AvatarChoice, type Family } from "./avatars";

// Draws an avatar code as an SVG picture (server only: the drawing sets stay
// out of the phone's download). Faces come from DiceBear's open sets; each
// family keeps to the hair, faces and colours chosen below, so every face
// it draws looks like someone from here and nobody looks angry or sick.

type Drawing = { style: Style<object>; options: Record<string, unknown>; frame: { x: number; y: number; size: number } };

const CLOTHES = ["d9572b", "0f7a5c", "f2c230", "1f2f5c", "c2416a", "e9e1d4", "2c2420", "5aa6d6", "8a4fbf"];

const DRAWINGS: Record<Family, (choice: AvatarChoice) => Drawing> = {
    pp: (choice) => ({
        style: openPeeps as unknown as Style<object>,
        options: {
            skinColor: [SKINS.pp[choice.skin]],
            head: ["afro", "bantuKnots", "cornrows", "cornrows2", "dreads1", "dreads2", "twists", "twists2", "longAfro", "hijab", "turban", "shaved1", "shaved2", "shaved3", "noHair1", "noHair2", "flatTop", "flatTopLong", "bun", "buns", "hatBeanie", "hatHip", "mohawk", "short1", "short2", "short3", "pomp", "longCurly"],
            face: ["calm", "cheeky", "cute", "driven", "eatingHappy", "explaining", "lovingGrin1", "lovingGrin2", "serious", "smile", "smileBig", "smileLOL", "smileTeethGap", "solemn", "awe"],
            accessories: ["glasses", "glasses2", "glasses3", "glasses4", "glasses5", "sunglasses", "sunglasses2"],
            accessoriesProbability: 18,
            facialHairProbability: 14,
            facialHair: ["chin", "full", "full2", "goatee1", "goatee2", "moustache1", "moustache2", "moustache3"],
            maskProbability: 0,
            clothingColor: CLOTHES,
        },
        frame: { x: 2, y: 6, size: 96 },
    }),
    tn: (choice) => ({
        style: avataaars as unknown as Style<object>,
        options: {
            skinColor: [SKINS.tn[choice.skin]],
            top: ["fro", "froBand", "dreads", "dreads01", "dreads02", "frizzle", "shortCurly", "shortRound", "shortFlat", "theCaesar", "theCaesarAndSidePart", "bigHair", "bun", "curly", "curvy", "hijab", "turban", "hat", "winterHat1", "sides", "shavedSides", "shortWaved"],
            hairColor: ["2c1b18", "2c1b18", "4a312c", "724133", "a55728"],
            hatColor: CLOTHES,
            eyes: ["default", "happy", "wink", "side", "squint", "hearts", "surprised"],
            eyebrows: ["defaultNatural", "raisedExcitedNatural", "flatNatural", "upDownNatural", "default", "raisedExcited"],
            mouth: ["default", "smile", "twinkle", "tongue", "serious", "eating"],
            facialHairProbability: 22,
            facialHairColor: ["2c1b18", "4a312c"],
            accessoriesProbability: 16,
            accessories: ["prescription01", "prescription02", "round", "sunglasses", "wayfarers", "kurt"],
            // No printed T-shirts: their words and skulls are not ours to put on people.
            clothing: ["blazerAndShirt", "blazerAndSweater", "collarAndSweater", "hoodie", "overall", "shirtCrewNeck", "shirtScoopNeck", "shirtVNeck"],
            clothesColor: CLOTHES,
        },
        frame: { x: 4, y: 6, size: 92 },
    }),
    mc: (choice) => ({
        style: micah as unknown as Style<object>,
        options: {
            baseColor: [SKINS.mc[choice.skin]],
            hair: ["fonze", "mrT", "dougFunny", "mrClean", "dannyPhantom", "full", "turban", "pixie"],
            hairColor: ["000000", "2c1b18"],
            mouth: ["laughing", "smile", "smirk", "surprised"],
            eyes: ["eyes", "round", "smiling", "smilingShadow", "eyesShadow"],
            earringsProbability: 30,
            glassesProbability: 20,
            facialHairProbability: 15,
            shirtColor: CLOTHES,
        },
        frame: { x: 4, y: 8, size: 92 },
    }),
    lo: (choice) => ({
        style: lorelei as unknown as Style<object>,
        options: {
            skinColor: [SKINS.lo[choice.skin]],
            hairColor: ["0e0e0e", "2c1b18"],
            mouth: ["happy01", "happy02", "happy03", "happy04", "happy05", "happy06", "happy07", "happy08", "happy09", "happy10", "happy11", "happy12", "happy13", "happy14", "happy15", "happy16", "happy17", "happy18"],
            beardProbability: 6,
            frecklesProbability: 0,
            earringsProbability: 22,
            glassesProbability: 12,
            hairAccessoriesProbability: 10,
        },
        frame: { x: 6, y: 8, size: 88 },
    }),
};

// One picture: the background, then the face drawn on top.
export function renderAvatar(code: string): string | null {
    const choice = parseAvatar(code);
    if (!choice) return null;
    const drawing = DRAWINGS[choice.family](choice);
    const face = createAvatar(drawing.style, { seed: choice.seed, ...drawing.options })
        .toString()
        .replace(/^<svg\b/, `<svg x="${drawing.frame.x}" y="${drawing.frame.y}" width="${drawing.frame.size}" height="${drawing.frame.size}"`);
    return `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 100 100" width="256" height="256">${BACKDROPS[choice.backdrop].svg}${face}</svg>`;
}
