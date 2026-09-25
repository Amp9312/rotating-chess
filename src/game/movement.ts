import type { Piece, Square } from "../types";
import {
    coordinatesToSquare,
    squareToCoordinates,
} from "./coordinates";

interface Direction {
    file: number;
    rank: number;
}

const rookDirections: Direction[] = [
    { file: 1, rank: 0 },
    { file: -1, rank: 0 },
    { file: 0, rank: 1 },
    { file: 0, rank: -1 },
];

const bishopDirections: Direction[] = [
    { file: 1, rank: 1 },
    { file: 1, rank: -1 },
    { file: -1, rank: 1 },
    { file: -1, rank: -1 },
];

const knightOffsets: Direction[] = [
    { file: 1, rank: 2 },
    { file: 2, rank: 1 },
    { file: -1, rank: 2 },
    { file: -2, rank: 1 },
    { file: 1, rank: -2 },
    { file: 2, rank: -1 },
    { file: -1, rank: -2 },
    { file: -2, rank: -1 },
];

function getPieceAt(
    square: Square,
    pieces: Piece[]
): Piece | undefined {
    return pieces.find(
        (piece) => piece.square === square
    );
}

function isOccupied(
    square: Square,
    pieces: Piece[]
): boolean {
    return getPieceAt(square, pieces) !== undefined;
}

function getSlidingMoves(
    piece: Piece,
    pieces: Piece[],
    directions: Direction[]
): Square[] {
    const moves: Square[] = [];

    const { fileIndex, rankIndex } =
        squareToCoordinates(piece.square);

    for (const direction of directions) {
        let currentFile =
            fileIndex + direction.file;

        let currentRank =
            rankIndex + direction.rank;

        while (
            currentFile >= 0 &&
            currentFile < 8 &&
            currentRank >= 0 &&
            currentRank < 8
        ) {
            const square = coordinatesToSquare(
                currentFile,
                currentRank
            );

            const occupyingPiece =
                getPieceAt(square, pieces);

            if (!occupyingPiece) {
                moves.push(square);
            } else {
                if (
                    occupyingPiece.color !==
                    piece.color
                ) {
                    moves.push(square);
                }

                break;
            }

            currentFile += direction.file;
            currentRank += direction.rank;
        }
    }

    return moves;
}

function getKnightMoves(
    piece: Piece,
    pieces: Piece[]
): Square[] {
    const moves: Square[] = [];

    const { fileIndex, rankIndex } =
        squareToCoordinates(piece.square);

    for (const offset of knightOffsets) {
        const file =
            fileIndex + offset.file;

        const rank =
            rankIndex + offset.rank;

        if (
            file < 0 ||
            file >= 8 ||
            rank < 0 ||
            rank >= 8
        ) {
            continue;
        }

        const square =
            coordinatesToSquare(
                file,
                rank
            );

        const occupyingPiece =
            getPieceAt(square, pieces);

        if (
            !occupyingPiece ||
            occupyingPiece.color !== piece.color
        ) {
            moves.push(square);
        }
    }

    return moves;
}

function getKingMoves(
    piece: Piece,
    pieces: Piece[]
): Square[] {
    const moves: Square[] = [];

    const { fileIndex, rankIndex } =
        squareToCoordinates(piece.square);

    for (
        let fileOffset = -1;
        fileOffset <= 1;
        fileOffset++
    ) {
        for (
            let rankOffset = -1;
            rankOffset <= 1;
            rankOffset++
        ) {
            if (
                fileOffset === 0 &&
                rankOffset === 0
            ) {
                continue;
            }

            const file =
                fileIndex + fileOffset;

            const rank =
                rankIndex + rankOffset;

            if (
                file < 0 ||
                file >= 8 ||
                rank < 0 ||
                rank >= 8
            ) {
                continue;
            }

            const square =
                coordinatesToSquare(
                    file,
                    rank
                );

            const occupyingPiece =
                getPieceAt(square, pieces);

            if (
                !occupyingPiece ||
                occupyingPiece.color !== piece.color
            ) {
                moves.push(square);
            }
        }
    }

    return moves;
}

function getPawnMoves(
    piece: Piece,
    pieces: Piece[]
): Square[] {
    const moves: Square[] = [];

    const { fileIndex, rankIndex } =
        squareToCoordinates(piece.square);

    const direction =
        piece.color === "white" ? -1 : 1;

    const forwardRank = rankIndex + direction;

    // One-square forward move
    if (
        forwardRank >= 0 &&
        forwardRank < 8
    ) {
        const forwardSquare =
            coordinatesToSquare(
                fileIndex,
                forwardRank
            );

        if (!isOccupied(forwardSquare, pieces)) {
            moves.push(forwardSquare);

            // Two-square initial move
            if (!piece.hasMoved) {
                const doubleForwardRank =
                    rankIndex + direction * 2;

                if (
                    doubleForwardRank >= 0 &&
                    doubleForwardRank < 8
                ) {
                    const doubleForwardSquare =
                        coordinatesToSquare(
                            fileIndex,
                            doubleForwardRank
                        );

                    if (
                        !isOccupied(
                            doubleForwardSquare,
                            pieces
                        )
                    ) {
                        moves.push(
                            doubleForwardSquare
                        );
                    }
                }
            }
        }
    }

    // Diagonal captures
    for (const fileOffset of [-1, 1]) {
        const captureFile =
            fileIndex + fileOffset;

        if (
            captureFile < 0 ||
            captureFile >= 8 ||
            forwardRank < 0 ||
            forwardRank >= 8
        ) {
            continue;
        }

        const captureSquare =
            coordinatesToSquare(
                captureFile,
                forwardRank
            );

        const targetPiece =
            getPieceAt(
                captureSquare,
                pieces
            );

        if (
            targetPiece &&
            targetPiece.color !== piece.color
        ) {
            moves.push(captureSquare);
        }
    }

    return moves;
}

export function getLegalMoves(
    piece: Piece,
    pieces: Piece[]
): Square[] {
    switch (piece.type) {
        case "rook":
            return getSlidingMoves(
                piece,
                pieces,
                rookDirections
            );

        case "bishop":
            return getSlidingMoves(
                piece,
                pieces,
                bishopDirections
            );

        case "queen":
            return getSlidingMoves(
                piece,
                pieces,
                [
                    ...rookDirections,
                    ...bishopDirections,
                ]
            );

        case "knight":
            return getKnightMoves(
                piece,
                pieces
            );

        case "king":
            return getKingMoves(
                piece,
                pieces
            );

        case "pawn":
            return getPawnMoves(
                piece,
                pieces
            );

        default:
            return [];
    }
}