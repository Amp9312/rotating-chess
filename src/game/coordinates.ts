import type { File, Rank, Square } from "../types";

export const files: File[] = [
    "a",
    "b",
    "c",
    "d",
    "e",
    "f",
    "g",
    "h",
];

export const ranks: Rank[] = [
    8,
    7,
    6,
    5,
    4,
    3,
    2,
    1,
];

export function squareToCoordinates(square: Square) {
    const file = square[0] as File;
    const rank = Number(square[1]) as Rank;

    return {
        fileIndex: files.indexOf(file),
        rankIndex: ranks.indexOf(rank),
    };
}

export function coordinatesToSquare(
    fileIndex: number,
    rankIndex: number
): Square {
    const file = files[fileIndex];
    const rank = ranks[rankIndex];

    return `${file}${rank}` as Square;
}