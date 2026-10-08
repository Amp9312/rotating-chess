import type {
    GameState,
    Piece,
    Square,
} from "../types";

import {
    squareToPhysical,
    movePhysicalToSquare,
} from "./rotation";

export function isEnPassantCapture(
    gameState: GameState,
    movingPiece: Piece,
    to: Square
): boolean {
    /*
     * Only pawns can perform en passant.
     */
    if (movingPiece.type !== "pawn") {
        return false;
    }

    /*
     * En passant requires a previous move.
     */
    if (!gameState.lastMove) {
        return false;
    }

    /*
     * Find the piece that made the previous move.
     */
    const previousPiece =
        gameState.pieces.find(
            (piece) =>
                piece.id ===
                gameState.lastMove?.pieceId
        );

    if (!previousPiece) {
        return false;
    }

    /*
     * The previous piece must have been
     * an opposing pawn.
     */
    if (
        previousPiece.type !== "pawn" ||
        previousPiece.color ===
            movingPiece.color
    ) {
        return false;
    }

    /*
     * Convert the previous move into
     * PHYSICAL coordinates.
     */
    const previousFromPhysical =
        squareToPhysical(
            gameState.lastMove.from,
            gameState.rotation
        );

    const previousToPhysical =
        squareToPhysical(
            gameState.lastMove.to,
            gameState.rotation
        );

    /*
     * Determine the previous pawn's physical
     * forward direction.
     *
     * White moves toward physical rank 0.
     * Black moves toward physical rank 7.
     */
    const forward =
        previousPiece.color === "white"
            ? -1
            : 1;

    /*
     * Determine how far the previous pawn
     * actually moved in physical space.
     */
    const physicalFileDifference =
        previousToPhysical.fileIndex -
        previousFromPhysical.fileIndex;

    const physicalRankDifference =
        previousToPhysical.rankIndex -
        previousFromPhysical.rankIndex;

    /*
     * The previous move must have been
     * exactly two physical squares forward.
     */
    if (
        physicalFileDifference !== 0 ||
        physicalRankDifference !==
            forward * 2
    ) {
        console.log(
            "EN PASSANT FAILED: previous move was not a two-square pawn move"
        );

        return false;
    }

    /*
     * Get the physical positions of the
     * two pawns.
     */
    const movingPhysical =
        squareToPhysical(
            movingPiece.square,
            gameState.rotation
        );

    const previousPawnPhysical =
        previousToPhysical;

    /*
     * The pawns must be horizontally
     * adjacent on the physical board.
     */
    const fileDistance =
        Math.abs(
            movingPhysical.fileIndex -
            previousPawnPhysical.fileIndex
        );

    const rankDistance =
        Math.abs(
            movingPhysical.rankIndex -
            previousPawnPhysical.rankIndex
        );

    /*
     * Determine which diagonal direction
     * leads toward the pawn that just moved.
     */
    const fileDirection =
        previousPawnPhysical.fileIndex >
        movingPhysical.fileIndex
            ? 1
            : -1;

    /*
     * Calculate the physical diagonal
     * destination for the capturing pawn.
     */

    const movingForward =
    movingPiece.color === "white"
        ? -1
        : 1;

const expectedDiagonalDestination =
    movePhysicalToSquare(
        movingPiece.square,
        gameState.rotation,
        fileDirection,
        movingForward
    );


    /*
     * The pawns must be horizontally adjacent.
     */
    if (
        fileDistance !== 1 ||
        rankDistance !== 0
    ) {

        return false;
    }

    /*
     * The requested destination must be
     * the correct physical diagonal square.
     */
    if (
        expectedDiagonalDestination !== to
    ) {

        return false;
    }

    /*
     * All en-passant conditions have passed.
     */
    console.log(
        "EN PASSANT SUCCESS",
        {
            from: movingPiece.square,
            to,
            capturedPawn:
                previousPiece.square,
        }
    );

    return true;
}