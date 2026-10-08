import type {
    GameState,
    Piece,
    Square,
} from "../types";

import {
    squareToCoordinates,
} from "./coordinates";

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
        previousPiece.color === movingPiece.color
    ) {
        return false;
    }

    /*
     * Get the logical coordinates of the
     * previous move.
     */
    const previousFrom =
        squareToCoordinates(
            gameState.lastMove.from
        );

    const previousTo =
        squareToCoordinates(
            gameState.lastMove.to
        );

    /*
     * Determine how the previous pawn was
     * oriented when it made its move.
     */
    const previousDirection =
        getPawnDirection(
            previousPiece.color,
            gameState.rotation
        );

    /*
     * A two-square pawn move must move exactly
     * two squares in its forward direction.
     */
    const fileDifference =
        previousTo.fileIndex -
        previousFrom.fileIndex;

    const rankDifference =
        previousTo.rankIndex -
        previousFrom.rankIndex;

    const expectedFileDifference =
        previousDirection.file * 2;

    const expectedRankDifference =
        previousDirection.rank * 2;

    if (
        fileDifference !==
            expectedFileDifference ||
        rankDifference !==
            expectedRankDifference
    ) {
        return false;
    }

    /*
     * Get the coordinates of the pawn attempting
     * the en passant capture.
     */
    const movingCoordinates =
        squareToCoordinates(
            movingPiece.square
        );

    const destinationCoordinates =
        squareToCoordinates(to);

    /*
     * The opposing pawn must currently be
     * immediately adjacent to the moving pawn.
     */
    const fileDistance =
        Math.abs(
            movingCoordinates.fileIndex -
            previousTo.fileIndex
        );

    const rankDistance =
        Math.abs(
            movingCoordinates.rankIndex -
            previousTo.rankIndex
        );

    /*
     * The pawns must be adjacent along the
     * axis perpendicular to their movement.
     */
    const expectedAdjacentFile =
        previousDirection.file === 0;

    if (expectedAdjacentFile) {
        if (fileDistance !== 1) {
            return false;
        }

        if (rankDistance !== 0) {
            return false;
        }
    } else {
        if (rankDistance !== 1) {
            return false;
        }

        if (fileDistance !== 0) {
            return false;
        }
    }

    /*
     * The destination must be one forward step
     * from the moving pawn.
     */
const movingDirection =
    getPawnDirection(
        movingPiece.color,
        gameState.rotation
    );

const expectedDestinationFile =
    previousTo.fileIndex +
    movingDirection.file;

const expectedDestinationRank =
    previousTo.rankIndex +
    movingDirection.rank;

if (
    destinationCoordinates.fileIndex !==
        expectedDestinationFile ||
    destinationCoordinates.rankIndex !==
        expectedDestinationRank
) {
    return false;
}

return true;
}