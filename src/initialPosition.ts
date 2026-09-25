import type { Piece } from "./types";


/**
 * The pieces in their standard starting positions.
 *
 * Notice that this is just data.
 *
 * We're deliberately NOT putting movement rules here.
 *
 * Phase 1 is concerned with:
 *     "Where is the piece?"
 *
 * Later phases will answer:
 *     "Where can the piece move?"
 */
export const initialPosition: Piece[] = [
    // Black back rank
    {
        id: "black-rook-a8",
        type: "rook",
        color: "black",
        square: "a8",
    },
    {
        id: "black-knight-b8",
        type: "knight",
        color: "black",
        square: "b8",
    },
    {
        id: "black-bishop-c8",
        type: "bishop",
        color: "black",
        square: "c8",
    },
    {
        id: "black-queen-d8",
        type: "queen",
        color: "black",
        square: "d8",
    },
    {
        id: "black-king-e8",
        type: "king",
        color: "black",
        square: "e8",
    },
    {
        id: "black-bishop-f8",
        type: "bishop",
        color: "black",
        square: "f8",
    },
    {
        id: "black-knight-g8",
        type: "knight",
        color: "black",
        square: "g8",
    },
    {
        id: "black-rook-h8",
        type: "rook",
        color: "black",
        square: "h8",
    },

    // Black pawns
    ...(["a", "b", "c", "d", "e", "f", "g", "h"] as const).map(
        (file) => ({
            id: `black-pawn-${file}7`,
            type: "pawn" as const,
            color: "black" as const,
            square: `${file}7` as const,
        })
    ),

    // White back rank
    {
        id: "white-rook-a1",
        type: "rook",
        color: "white",
        square: "a1",
    },
    {
        id: "white-knight-b1",
        type: "knight",
        color: "white",
        square: "b1",
    },
    {
        id: "white-bishop-c1",
        type: "bishop",
        color: "white",
        square: "c1",
    },
    {
        id: "white-queen-d1",
        type: "queen",
        color: "white",
        square: "d1",
    },
    {
        id: "white-king-e1",
        type: "king",
        color: "white",
        square: "e1",
    },
    {
        id: "white-bishop-f1",
        type: "bishop",
        color: "white",
        square: "f1",
    },
    {
        id: "white-knight-g1",
        type: "knight",
        color: "white",
        square: "g1",
    },
    {
        id: "white-rook-h1",
        type: "rook",
        color: "white",
        square: "h1",
    },

    // White pawns
    ...(["a", "b", "c", "d", "e", "f", "g", "h"] as const).map(
        (file) => ({
            id: `white-pawn-${file}2`,
            type: "pawn" as const,
            color: "white" as const,
            square: `${file}2` as const,
        })
    ),
];