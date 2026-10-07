import type {
    Color,
    GameState,
    GameStatus,
    Piece,
    Square,
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
    coordinatesToSquare,
    squareToCoordinates,
} from "./coordinates";

import {
    getCastlingMoves,
} from "./castling";

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
    if (
        !isValidMove(
            gameState,
            from,
            to
        )
    ) {
        return {
            type: "invalid",
        };
    }

    const movingPiece =
        gameState.pieces.find(
            (piece) =>
                piece.square === from
        );

    if (!movingPiece) {
        return {
            type: "invalid",
        };
    }

    const isEnPassant =
        isEnPassantCapture(
            gameState,
            movingPiece,
            to
        );

    const enPassantCapturedSquare =
        isEnPassant &&
        gameState.lastMove
            ? gameState.lastMove.to
            : null;

    const castlingRookMove =
        getCastlingRookMove(
            movingPiece,
            to
        );

    const updatedPieces =
        gameState.pieces
            .filter((piece) => {
                // Normal capture.
                if (
                    piece.square === to
                ) {
                    return false;
                }

                // En passant capture.
                if (
                    enPassantCapturedSquare &&
                    piece.square ===
                        enPassantCapturedSquare
                ) {
                    return false;
                }

                return true;
            })
            .map((piece) => {
                // Move the selected piece.
                if (
                    piece.square === from
                ) {
                    return {
                        ...piece,
                        square: to,
                        hasMoved: true,
                    };
                }

                // Move the rook during castling.
                if (
                    castlingRookMove &&
                    piece.square ===
                        castlingRookMove.from
                ) {
                    return {
                        ...piece,
                        square:
                            castlingRookMove.to,
                        hasMoved: true,
                    };
                }

                return piece;
            });

    const nextTurn =
        gameState.turn === "white"
            ? "black"
            : "white";

    const newGameState: GameState = {
        ...gameState,
        pieces: updatedPieces,
        turn: nextTurn,
        lastMove: {
            pieceId: movingPiece.id,
            from,
            to,
        },
    };

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

    return {
        type: "move",
        gameState: {
            ...newGameState,
            status: getGameStatus(
                newGameState
            ),
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
    pieces: Piece[]
): boolean {
    const king = findKing(
        color,
        pieces
    );

    if (!king) {
        return false;
    }

    const opponentColor =
        color === "white"
            ? "black"
            : "white";

    return isSquareAttacked(
        king.square,
        opponentColor,
        pieces
    );
}

function getEnPassantMoves(
    piece: Piece,
    gameState: GameState
): Square[] {
    if (piece.type !== "pawn") {
        return [];
    }

    const {
        fileIndex,
        rankIndex,
    } = squareToCoordinates(
        piece.square
    );

    const direction =
        piece.color === "white"
            ? -1
            : 1;

    const targetRank =
        rankIndex + direction;

    if (
        targetRank < 0 ||
        targetRank >= 8
    ) {
        return [];
    }

    const moves: Square[] = [];

    for (
        const fileOffset of [-1, 1]
    ) {
        const targetFile =
            fileIndex + fileOffset;

        if (
            targetFile < 0 ||
            targetFile >= 8
        ) {
            continue;
        }

        const targetSquare =
            coordinatesToSquare(
                targetFile,
                targetRank
            );

        if (
            isEnPassantCapture(
                gameState,
                piece,
                targetSquare
            )
        ) {
            moves.push(
                targetSquare
            );
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
            gameState.pieces
        );

    // --------------------------------------------------
    // 2. Get en-passant options.
    // --------------------------------------------------

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

        if (
            !isKingInCheck(
                piece.color,
                hypotheticalPieces
            )
        ) {
            legalMoves.push(
                destination
            );
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
            gameState.pieces
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