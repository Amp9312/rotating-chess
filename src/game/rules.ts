import type { GameState, Square } from "../types";

export function makeMove(
    gameState: GameState,
    from: Square,
    to: Square
): GameState {
    const movingPiece = gameState.pieces.find(
        (piece) => piece.square === from
    );

    if (!movingPiece) {
        return gameState;
    }

    const updatedPieces = gameState.pieces
        .filter((piece) => piece.square !== to)
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