import type {
    Color,
    GameState,
    Piece,
    PromotionPiece,
    Rotation,
    Square,
} from "../types";

import {
    squareToCoordinates,
} from "./coordinates";

import {
    squareToPhysical,
} from "./rotation";


export function isPromotionSquare(
    square: Square,
    color: Color,
    rotation: Rotation
): boolean {
    const physical =
        squareToPhysical(
            square,
            rotation
        );

    /*
     * Physical rankIndex:
     *
     * 0 = top of the displayed board
     * 7 = bottom of the displayed board
     *
     * White promotes at the physical top.
     * Black promotes at the physical bottom.
     */
    if (color === "white") {
        return physical.rankIndex === 0;
    }

    return physical.rankIndex === 7;
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