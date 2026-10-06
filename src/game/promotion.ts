import type {
    Color,
    GameState,
    PromotionPiece,
    Rotation,
    Square,
} from "../types";

import {
    squareToCoordinates,
} from "./coordinates";

export function isPromotionSquare(
    square: Square,
    color: Color,
    rotation: Rotation
): boolean {
    const { rankIndex } =
        squareToCoordinates(square);

    /*
     * At 0°:
     * White promotes at rank 8.
     * Black promotes at rank 1.
     *
     * Because the board will eventually rotate,
     * the promotion edge changes with rotation.
     */

    switch (rotation) {
        case 0:
            return color === "white"
                ? rankIndex === 0
                : rankIndex === 7;

        case 90:
            return false;

        case 180:
            return color === "white"
                ? rankIndex === 7
                : rankIndex === 0;

        case 270:
            return false;

        default:
            return false;
    }
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