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

    // 1. The moving piece must be a pawn.
    if (movingPiece.type !== "pawn") {
        return false;
    }

    // 2. There must be a previous move.
    if (!gameState.lastMove) {
        return false;
    }

    // 3. Find the piece that made the previous move.
    const previousPiece =
        gameState.pieces.find(
            (piece) =>
                piece.id ===
                gameState.lastMove?.pieceId
        );

    if (!previousPiece) {
        return false;
    }

    // 4. The previous piece must be
    //    an enemy pawn.
    if (
        previousPiece.type !== "pawn" ||
        previousPiece.color === movingPiece.color
    ) {
        return false;
    }

    // 5. Get the coordinates of the
    //    previous move.
    const previousFrom =
        squareToCoordinates(
            gameState.lastMove.from
        );

    const previousTo =
        squareToCoordinates(
            gameState.lastMove.to
        );

    // 6. The previous pawn must have
    //    moved exactly two squares.
    const previousRankDistance =
        Math.abs(
            previousFrom.rankIndex -
            previousTo.rankIndex
        );

    if (previousRankDistance !== 2) {
        return false;
    }

    // 7. Get the coordinates of the
    //    current pawn and destination.
    const movingCoordinates =
        squareToCoordinates(
            movingPiece.square
        );

    const destinationCoordinates =
        squareToCoordinates(to
        );

    const previousCoordinates =
        squareToCoordinates(
            previousPiece.square
        );

    // 8. The enemy pawn must now be
    //    directly beside our pawn.
    const fileDistance =
        Math.abs(
            movingCoordinates.fileIndex -
            previousCoordinates.fileIndex
        );

    if (fileDistance !== 1) {
        return false;
    }

    // 9. The destination must be one
    //    square forward for our pawn.
    const direction =
        movingPiece.color === "white"
            ? -1
            : 1;

    const expectedDestinationRank =
        movingCoordinates.rankIndex +
        direction;

    if (
        destinationCoordinates.rankIndex !==
        expectedDestinationRank
    ) {
        return false;
    }

    // 10. The destination must be on
    //     the enemy pawn's file.
    if (
        destinationCoordinates.fileIndex !==
        previousCoordinates.fileIndex
    ) {
        return false;
    }

    return true;
}