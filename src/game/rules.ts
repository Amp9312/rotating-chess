import type {
    GameState,
    Square,
} from "../types";

import {
    getPseudoLegalMoves,
} from "./movement";

export function isValidMove(
    gameState: GameState,
    from: Square,
    to: Square
): boolean {
    const movingPiece =
        gameState.pieces.find(
            (piece) => piece.square === from
        );

    // There must be a piece on the starting square.
    if (!movingPiece) {
        return false;
    }

    // The piece must belong to the player whose turn it is.
    if (movingPiece.color !== gameState.turn) {
        return false;
    }

    const pseudoLegalMoves =
        getPseudoLegalMoves(
            movingPiece,
            gameState.pieces
        );

    return pseudoLegalMoves.includes(to);
}

export function makeMove(
    gameState: GameState,
    from: Square,
    to: Square
): GameState | null {
    if (!isValidMove(gameState, from, to)) {
        return null;
    }

    const updatedPieces =
        gameState.pieces
            .filter(
                (piece) => piece.square !== to
            )
            .map((piece) => {
                if (piece.square === from) {
                    return {
                        ...piece,
                        square: to,
                        hasMoved: true,
                    };
                }

                return piece;
            });

    return {
        ...gameState,
        pieces: updatedPieces,
        turn:
            gameState.turn === "white"
                ? "black"
                : "white",
    };
}