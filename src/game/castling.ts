import type {
    GameState,
    Piece,
    Square,
} from "../types";

import {
    isSquareAttacked,
} from "./movement";


function getOpponentColor(
    color: "white" | "black"
): "white" | "black" {
    return color === "white"
        ? "black"
        : "white";
}


export function getCastlingMoves(
    piece: Piece,
    gameState: GameState
): Square[] {
    // Only kings can castle.
    if (piece.type !== "king") {
        return [];
    }

    // A king that has moved can never castle.
    if (piece.hasMoved) {
        return [];
    }

    const opponentColor =
        getOpponentColor(piece.color);

    const rank =
        piece.color === "white"
            ? 1
            : 8;

    const expectedKingSquare =
        `e${rank}` as Square;

    // The king must still be on its
    // original square.
    if (piece.square !== expectedKingSquare) {
        return [];
    }

    // The king cannot castle while in check.
    if (
        isSquareAttacked(
            piece.square,
            opponentColor,
            gameState.pieces
        )
    ) {
        return [];
    }

    const moves: Square[] = [];

    /*
     * Kingside castling
     *
     * King: e1 -> g1
     * Rook: h1 -> f1
     *
     * or
     *
     * King: e8 -> g8
     * Rook: h8 -> f8
     */

    const kingsideRookSquare =
        `h${rank}` as Square;

    const kingsideRook =
        gameState.pieces.find(
            (otherPiece) =>
                otherPiece.square ===
                    kingsideRookSquare &&
                otherPiece.type === "rook" &&
                otherPiece.color ===
                    piece.color
        );

    if (
        kingsideRook &&
        !kingsideRook.hasMoved
    ) {
        const fSquare =
            `f${rank}` as Square;

        const gSquare =
            `g${rank}` as Square;

        const squaresAreEmpty =
            !gameState.pieces.some(
                (otherPiece) =>
                    otherPiece.square ===
                        fSquare ||
                    otherPiece.square ===
                        gSquare
            );

        const kingPathIsSafe =
            !isSquareAttacked(
                fSquare,
                opponentColor,
                gameState.pieces
            ) &&
            !isSquareAttacked(
                gSquare,
                opponentColor,
                gameState.pieces
            );

        if (
            squaresAreEmpty &&
            kingPathIsSafe
        ) {
            moves.push(gSquare);
        }
    }

    /*
     * Queenside castling
     *
     * King: e1 -> c1
     * Rook: a1 -> d1
     *
     * or
     *
     * King: e8 -> c8
     * Rook: a8 -> d8
     */

    const queensideRookSquare =
        `a${rank}` as Square;

    const queensideRook =
        gameState.pieces.find(
            (otherPiece) =>
                otherPiece.square ===
                    queensideRookSquare &&
                otherPiece.type === "rook" &&
                otherPiece.color ===
                    piece.color
        );

    if (
        queensideRook &&
        !queensideRook.hasMoved
    ) {
        const bSquare =
            `b${rank}` as Square;

        const cSquare =
            `c${rank}` as Square;

        const dSquare =
            `d${rank}` as Square;

        const squaresAreEmpty =
            !gameState.pieces.some(
                (otherPiece) =>
                    otherPiece.square ===
                        bSquare ||
                    otherPiece.square ===
                        cSquare ||
                    otherPiece.square ===
                        dSquare
            );

        const kingPathIsSafe =
            !isSquareAttacked(
                dSquare,
                opponentColor,
                gameState.pieces
            ) &&
            !isSquareAttacked(
                cSquare,
                opponentColor,
                gameState.pieces
            );

        if (
            squaresAreEmpty &&
            kingPathIsSafe
        ) {
            moves.push(cSquare);
        }
    }

    return moves;
}