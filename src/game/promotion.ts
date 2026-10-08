import type {
    GameState,
    PromotionPiece,
    Square,
} from "../types";

import {
    squareToCoordinates,
} from "./coordinates";


export function isPromotionSquare(
    square: Square,
    color: "white" | "black",
    rotation: 0 | 90 | 180 | 270
): boolean {
    const {
        fileIndex,
        rankIndex,
    } = squareToCoordinates(square);

    const direction =
        getPawnDirection(
            color,
            rotation
        );

    /*
     * A pawn promotes when it reaches the
     * edge it is moving toward.
     */

    if (direction.file === 1) {
        return fileIndex === 7;
    }

    if (direction.file === -1) {
        return fileIndex === 0;
    }

    if (direction.rank === 1) {
        return rankIndex === 7;
    }

    if (direction.rank === -1) {
        return rankIndex === 0;
    }

    return false;
}

export function promotePawn(
    gameState: GameState,
    square: Square,
    promotionPiece: PromotionPiece
): GameState {
    const updatedPieces =
        gameState.pieces.map(
            (piece) => {
                if (
                    piece.square === square &&
                    piece.type === "pawn"
                ) {
                    return {
                        ...piece,
                        type: promotionPiece,
                    };
                }

                return piece;
            }
        );

    return {
        ...gameState,
        pieces: updatedPieces,
    };
}