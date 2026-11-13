import type {
    GameState,
    Piece,
    Square,
} from "../types";

import {
    isSquareAttacked,
} from "./movement";

/**
 * Determine whether a king would be in check
 * if it occupied a particular square.
 *
 * This simulates the king's movement without
 * modifying the actual game state.
 */
function isKingSquareSafe(
    king: Piece,
    targetSquare: Square,
    gameState: GameState,
    opponentColor: "white" | "black"
): boolean {
    const hypotheticalPieces = gameState.pieces.map(piece => {
        if (piece.id === king.id) {
            return {
                ...piece,
                square: targetSquare,
            };
        }

        return piece;
    });

    return !isSquareAttacked(
        targetSquare,
        opponentColor,
        hypotheticalPieces,
        gameState.rotation
    );
}

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
            gameState.pieces,
            gameState.rotation
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
    isKingSquareSafe(
        piece,
        fSquare,
        gameState,
        opponentColor
    ) &&
    isKingSquareSafe(
        piece,
        gSquare,
        gameState,
        opponentColor
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
                gameState.pieces,
                gameState.rotation
            ) &&
            !isSquareAttacked(
                cSquare,
                opponentColor,
                gameState.pieces,
                gameState.rotation
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