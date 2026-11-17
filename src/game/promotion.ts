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
const fivefoldRepetition =
    isFivefoldRepetition(stateWithHistory);

const insufficientMaterial =
    isInsufficientMaterial(stateWithHistory);

const seventyFiveMoveRule =
    isSeventyFiveMoveDraw(stateWithHistory);

let endReason: GameState["endReason"] = null;
let winner: Color | null = null;

if (resultingStatus === "checkmate") {
    endReason = "checkmate";
    winner = gameState.turn === "white" ? "black" : "white";
} else if (resultingStatus === "stalemate") {
    endReason = "stalemate";
} else if (fivefoldRepetition) {
    endReason = "fivefold_repetition";
} else if (insufficientMaterial) {
    endReason = "insufficient_material";
} else if (seventyFiveMoveRule) {
    endReason = "seventy_five_move_rule";
}

const isAutomaticDraw =
    endReason !== null &&
    endReason !== "checkmate" &&
    endReason !== "stalemate";

return {
    ...stateWithHistory,
    status: isAutomaticDraw
        ? "draw"
        : resultingStatus,
    winner,
    endReason,
};
}

