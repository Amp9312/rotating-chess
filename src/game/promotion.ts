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

import {
    recordPosition,
    isFivefoldRepetition,
    isInsufficientMaterial,
    isSeventyFiveMoveDraw,
} from "./draw";

import { getGameStatus } from "./rules";

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
    /*
     * Replace the pawn with the selected promotion piece.
     */
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

    /*
     * Construct the promoted game state.
     */
    const promotedGameState: GameState = {
        ...gameState,
        pieces,
    };

    /*
     * Determine the resulting game status.
     */
    const resultingStatus =
        getGameStatus(promotedGameState);

    /*
     * Record the completed position in history.
     */
    const stateWithHistory =
        recordPosition({
            ...promotedGameState,
            status: resultingStatus,
        });

    /*
     * Check automatic draw conditions.
     *
     * Checkmate and stalemate take precedence.
     */
    const isAutomaticDraw =
        resultingStatus !== "checkmate" &&
        resultingStatus !== "stalemate" &&
        (
            isFivefoldRepetition(stateWithHistory) ||
            isInsufficientMaterial(stateWithHistory) ||
            isSeventyFiveMoveDraw(stateWithHistory)
        );

    return {
        ...stateWithHistory,
        status: isAutomaticDraw
            ? "draw"
            : resultingStatus,
    };
}

