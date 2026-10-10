import type {
    Color,
    GameState,
    Piece,
    PromotionPiece,
    Rotation,
    Square,
} from "../types";

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
    const pieces =
        gameState.pieces.map(
            (piece: Piece) => {
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
        pieces,
    };
}