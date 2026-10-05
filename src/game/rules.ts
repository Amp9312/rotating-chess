import type {
    GameState,
    Square,
} from "../types";

import {
    getPseudoLegalMoves,
    isSquareAttacked,
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

    if (!movingPiece) {
        return false;
    }

    if (
        movingPiece.color !==
        gameState.turn
    ) {
        return false;
    }

    const legalMoves =
        getLegalMoves(
            movingPiece,
            gameState
        );

    return legalMoves.includes(to);
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

function findKing(
    color: "white" | "black",
    pieces: Piece[]
): Piece | undefined {
    return pieces.find(
        (piece) =>
            piece.type === "king" &&
            piece.color === color
    );
}

export function isKingInCheck(
    color: "white" | "black",
    pieces: Piece[]
): boolean {
    const king = findKing(
        color,
        pieces
    );

    if (!king) {
        return false;
    }

    const opponentColor =
        color === "white"
            ? "black"
            : "white";

    return isSquareAttacked(
        king.square,
        opponentColor,
        pieces
    );
}

export function getLegalMoves(
    piece: Piece,
    gameState: GameState
): Square[] {
    const pseudoLegalMoves =
        getPseudoLegalMoves(
            piece,
            gameState.pieces
        );

    const legalMoves: Square[] = [];

    for (const destination of pseudoLegalMoves) {
        const hypotheticalPieces =
            gameState.pieces
                .filter(
                    (otherPiece) =>
                        otherPiece.square !==
                        destination
                )
                .map((otherPiece) => {
                    if (
                        otherPiece.square ===
                        piece.square
                    ) {
                        return {
                            ...otherPiece,
                            square: destination,
                            hasMoved: true,
                        };
                    }

                    return otherPiece;
                });

        if (
            !isKingInCheck(
                piece.color,
                hypotheticalPieces
            )
        ) {
            legalMoves.push(
                destination
            );
        }
    }

    return legalMoves;
}