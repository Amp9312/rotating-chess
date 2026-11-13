import type {
    Color,
    GameState,
    GameStatus,
    Piece,
    Square,
    Rotation,
} from "../types";

import {
    getPseudoLegalMoves,
    isSquareAttacked,
} from "./movement";

import {
    isPromotionSquare,
} from "./promotion";

import {
    isEnPassantCapture,
} from "./enPassant";

import {
    getNextRotation,
    movePhysicalToSquare,
} from "./rotation";

import {
    getCastlingMoves,
} from "./castling";

import {
    recordPosition,
    isFivefoldRepetition,
    isInsufficientMaterial,
    isSeventyFiveMoveDraw,
} from "./draw";

export type MoveResult =
    | {
        type: "invalid";
    }
    | {
        type: "move";
        gameState: GameState;
    }
    | {
        type: "promotion";
        gameState: GameState;
        square: Square;
    };


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
): MoveResult {
    /*
     * First make sure the requested move is legal.
     */
    if (!isValidMove(gameState, from, to)) {
        return {
            type: "invalid",
        };
    }

    /*
     * Find the piece being moved.
     */
    const movingPiece =
        gameState.pieces.find(
            piece => piece.square === from
        );

    if (!movingPiece) {
        return {
            type: "invalid",
        };
    }

    /*
     * Determine whether this move is an en passant capture.
     */
    const isEnPassant =
        isEnPassantCapture(
            gameState,
            movingPiece,
            to
        );

    const enPassantCapturedSquare =
        isEnPassant && gameState.lastMove
            ? gameState.lastMove.to
            : null;

    /*
     * Determine whether this move is castling.
     */
    const castlingRookMove =
        getCastlingRookMove(
            movingPiece,
            to
        );

    /*
     * Determine whether this move captures a piece.
     *
     * En passant is handled separately because
     * the captured pawn is not on the destination square.
     */
    const isCapture =
        gameState.pieces.some(
            piece =>
                piece.square === to &&
                piece.color !== movingPiece.color
        ) || Boolean(enPassantCapturedSquare);

    /*
     * Update the half-move clock.
     *
     * Pawn moves and captures reset the clock.
     * All other moves increment it.
     */
    const nextHalfMoveClock =
        movingPiece.type === "pawn" || isCapture
            ? 0
            : gameState.halfMoveClock + 1;

    /*
     * Move the pieces.
     */
    const updatedPieces =
        gameState.pieces
            .filter(piece => {
                // Remove a normally captured piece.
                if (piece.square === to) {
                    return false;
                }

                // Remove an en passant captured pawn.
                if (
                    enPassantCapturedSquare &&
                    piece.square === enPassantCapturedSquare
                ) {
                    return false;
                }

                return true;
            })
            .map(piece => {
                // Move the selected piece.
                if (piece.square === from) {
                    return {
                        ...piece,
                        square: to,
                        hasMoved: true,
                    };
                }

                // Move the rook if castling.
                if (
                    castlingRookMove &&
                    piece.square === castlingRookMove.from
                ) {
                    return {
                        ...piece,
                        square: castlingRookMove.to,
                        hasMoved: true,
                    };
                }

                return piece;
            });

    /*
     * Change whose turn it is.
     */
    const nextTurn =
        gameState.turn === "white"
            ? "black"
            : "white";

    /*
     * A round completes whenever Black finishes a move.
     */
    const roundCompleted =
        gameState.turn === "black";

    const nextCompletedRounds =
        roundCompleted
            ? gameState.completedRounds + 1
            : gameState.completedRounds;

    /*
     * Rotate the board after every fifth completed round.
     */
    const nextRotation =
        roundCompleted &&
        nextCompletedRounds % 5 === 0
            ? getNextRotation(gameState.rotation)
            : gameState.rotation;

    /*
     * Construct the new game state.
     */
    const newGameState: GameState = {
        ...gameState,

        pieces: updatedPieces,

        turn: nextTurn,

        completedRounds: nextCompletedRounds,

        rotation: nextRotation,

        halfMoveClock: nextHalfMoveClock,

        lastMove: {
            pieceId: movingPiece.id,
            from,
            to,
        },

        // A new move invalidates any outstanding draw offer.
        drawOffer: null,
    };

    /*
     * Check whether the pawn has reached its promotion edge.
     *
     * Do not record this position yet. The promotion
     * choice has not been finalized.
     */
    if (
        movingPiece.type === "pawn" &&
        isPromotionSquare(
            to,
            movingPiece.color,
            gameState.rotation
        )
    ) {
        return {
            type: "promotion",
            gameState: newGameState,
            square: to,
        };
    }

    /*
     * Record the completed position.
     */
const stateWithHistory =
    recordPosition(newGameState);

/*
 * Determine the resulting game status.
 *
 * Checkmate and stalemate take precedence over
 * automatic draw conditions.
 */
const resultingStatus =
    getGameStatus(stateWithHistory);

const isAutomaticDraw =
    resultingStatus !== "checkmate" &&
    resultingStatus !== "stalemate" &&
    (
        isFivefoldRepetition(stateWithHistory) ||
        isInsufficientMaterial(stateWithHistory) ||
        isSeventyFiveMoveDraw(stateWithHistory)
    );

return {
    type: "move",
    gameState: {
        ...stateWithHistory,
        status: isAutomaticDraw
            ? "draw"
            : resultingStatus,
    },
};
}


function findKing(
    color: Color,
    pieces: Piece[]
): Piece | undefined {
    return pieces.find(
        (piece) =>
            piece.type === "king" &&
            piece.color === color
    );
}


export function isKingInCheck(
    color: Color,
    pieces: Piece[],
    rotation: Rotation
): boolean {
    const king =
        findKing(
            color,
            pieces
        );

    if (!king) {
        return false;
    }

    const opponent =
        color === "white"
            ? "black"
            : "white";

    return isSquareAttacked(
        king.square,
        opponent,
        pieces,
        rotation
    );
}

function getEnPassantMoves(
    piece: Piece,
    gameState: GameState
): Square[]{

    if (piece.type !== "pawn") {
        return [];
    }

    const forward =
        piece.color === "white"
            ? -1
            : 1;

    const moves: Square[] = [];

    for (const fileOffset of [-1, 1]) {
        const target =
            movePhysicalToSquare(
                piece.square,
                gameState.rotation,
                fileOffset,
                forward
            );

        if (!target) {
            continue;
        }

        if (
            isEnPassantCapture(
                gameState,
                piece,
                target
            )
        ) {
            moves.push(target);
        }
    }

    return moves;
}
export function getLegalMoves(
    piece: Piece,
    gameState: GameState
): Square[] {
    // --------------------------------------------------
    // 1. Get normal movement options.
    // --------------------------------------------------

const pseudoLegalMoves =
    getPseudoLegalMoves(
        piece,
        gameState.pieces,
        gameState.rotation
    );

const enPassantMoves =
    getEnPassantMoves(
        piece,
        gameState
    );

    // --------------------------------------------------
    // 3. Get castling options.
    // --------------------------------------------------

    const castlingMoves =
        getCastlingMoves(
            piece,
            gameState
        );

    // --------------------------------------------------
    // 4. Combine all possible moves.
    // --------------------------------------------------

    const candidateMoves = [
        ...pseudoLegalMoves,
        ...enPassantMoves,
        ...castlingMoves,
    ];

    const legalMoves: Square[] = [];

    // --------------------------------------------------
    // 5. Test every candidate move.
    // --------------------------------------------------

    for (
        const destination of candidateMoves
    ) {

        // A king is never captured.
// The game ends through checkmate instead.
const targetPiece = gameState.pieces.find(
    otherPiece => otherPiece.square === destination
);

if (targetPiece?.type === "king") {
    continue;
}

        // --------------------------------------------------
        // Determine whether this candidate is en passant.
        // --------------------------------------------------

        const isEnPassant =
            isEnPassantCapture(
                gameState,
                piece,
                destination
            );

        const enPassantCapturedSquare =
            isEnPassant &&
            gameState.lastMove
                ? gameState.lastMove.to
                : null;

        // --------------------------------------------------
        // Determine whether this candidate is castling.
        // --------------------------------------------------

        const castlingRookMove =
            getCastlingRookMove(
                piece,
                destination
            );

        // --------------------------------------------------
        // Create a hypothetical board representing
        // what the position would look like AFTER
        // this move.
        // --------------------------------------------------

        const hypotheticalPieces =
            gameState.pieces
                .filter((otherPiece) => {

                    // Normal capture:
                    //
                    // If another piece occupies the
                    // destination square, remove it.
                    if (
                        otherPiece.square ===
                        destination
                    ) {
                        return false;
                    }

                    // En-passant capture:
                    //
                    // The captured pawn is NOT on the
                    // destination square. It is on the
                    // square recorded by lastMove.
                    if (
                        enPassantCapturedSquare &&
                        otherPiece.square ===
                            enPassantCapturedSquare
                    ) {
                        return false;
                    }

                    return true;
                })
                .map((otherPiece) => {

                    // --------------------------------------------------
                    // Move the selected piece.
                    // --------------------------------------------------

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

                    // --------------------------------------------------
                    // If this is castling, move the rook too.
                    // --------------------------------------------------

                    if (
                        castlingRookMove &&
                        otherPiece.square ===
                            castlingRookMove.from
                    ) {
                        return {
                            ...otherPiece,
                            square:
                                castlingRookMove.to,
                            hasMoved: true,
                        };
                    }

                    return otherPiece;
                });

        // --------------------------------------------------
        // Finally, make sure this hypothetical position
        // does not leave our own king in check.
        // --------------------------------------------------

        const kingInCheck = isKingInCheck(
    piece.color,
    hypotheticalPieces,
    gameState.rotation
);

if (!kingInCheck) {
    legalMoves.push(destination);
}
    }

    return legalMoves;
}


export function hasLegalMoves(
    gameState: GameState,
    color: Color
): boolean {
    const playerPieces =
        gameState.pieces.filter(
            (piece) =>
                piece.color === color
        );

    for (
        const piece of playerPieces
    ) {
        const legalMoves =
            getLegalMoves(
                piece,
                gameState
            );

        if (
            legalMoves.length > 0
        ) {
            return true;
        }
    }

    return false;
}


export function getGameStatus(
    gameState: GameState
): GameStatus {
    const playerToMove =
        gameState.turn;

    const inCheck =
        isKingInCheck(
            playerToMove,
            gameState.pieces,
            gameState.rotation
        );

    const canMove =
        hasLegalMoves(
            gameState,
            playerToMove
        );

    if (
        inCheck &&
        !canMove
    ) {
        return "checkmate";
    }

    if (
        !inCheck &&
        !canMove
    ) {
        return "stalemate";
    }

    if (inCheck) {
        return "check";
    }

    return "playing";
}

function getCastlingRookMove(
    piece: Piece,
    destination: Square
): {
    from: Square;
    to: Square;
} | null {
    if (piece.type !== "king") {
        return null;
    }

    if (
        piece.color === "white" &&
        destination === "g1"
    ) {
        return {
            from: "h1",
            to: "f1",
        };
    }

    if (
        piece.color === "white" &&
        destination === "c1"
    ) {
        return {
            from: "a1",
            to: "d1",
        };
    }

    if (
        piece.color === "black" &&
        destination === "g8"
    ) {
        return {
            from: "h8",
            to: "f8",
        };
    }

    if (
        piece.color === "black" &&
        destination === "c8"
    ) {
        return {
            from: "a8",
            to: "d8",
        };
    }

    return null;
}
