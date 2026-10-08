import type {
    Piece,
    Square,
    Color,
    Rotation,
} from "../types";

import {
    coordinatesToSquare,
    squareToCoordinates,
} from "./coordinates";

import {
    movePhysicalToSquare,
} from "./rotation";

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
    { file: 2, rank: -1 },
    { file: 1, rank: -2 },
    { file: -1, rank: -2 },
    { file: -2, rank: -1 },
    { file: -2, rank: 1 },
    { file: -1, rank: 2 },
];

function getPieceAt(
    square: Square,
    pieces: Piece[]
): Piece | undefined {
    return pieces.find(
        (piece) =>
            piece.square === square
    );
}

function isOccupied(
    square: Square,
    pieces: Piece[]
): boolean {
    return pieces.some(
        (piece) =>
            piece.square === square
    );
}

function getSlidingMoves(
    piece: Piece,
    pieces: Piece[],
    directions: Direction[]
): Square[] {
    const moves: Square[] = [];

    const {
        fileIndex,
        rankIndex,
    } = squareToCoordinates(
        piece.square
    );

    for (
        const direction of directions
    ) {
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
            const square =
                coordinatesToSquare(
                    currentFile,
                    currentRank
                );

            const targetPiece =
                getPieceAt(
                    square,
                    pieces
                );

            if (!targetPiece) {
                moves.push(square);
            } else {
                /*
                 * We can capture an enemy piece,
                 * but the path ends at that square.
                 */
                if (
                    targetPiece.color !==
                    piece.color
                ) {
                    moves.push(square);
                }

                break;
            }

            currentFile +=
                direction.file;

            currentRank +=
                direction.rank;
        }
    }

    return moves;
}

function getKnightMoves(
    piece: Piece,
    pieces: Piece[]
): Square[] {
    const moves: Square[] = [];

    const {
        fileIndex,
        rankIndex,
    } = squareToCoordinates(
        piece.square
    );

    for (
        const offset of knightOffsets
    ) {
        const targetFile =
            fileIndex + offset.file;

        const targetRank =
            rankIndex + offset.rank;

        if (
            targetFile < 0 ||
            targetFile >= 8 ||
            targetRank < 0 ||
            targetRank >= 8
        ) {
            continue;
        }

        const square =
            coordinatesToSquare(
                targetFile,
                targetRank
            );

        const targetPiece =
            getPieceAt(
                square,
                pieces
            );

        if (
            !targetPiece ||
            targetPiece.color !==
                piece.color
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

    const {
        fileIndex,
        rankIndex,
    } = squareToCoordinates(
        piece.square
    );

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

            const targetFile =
                fileIndex + fileOffset;

            const targetRank =
                rankIndex + rankOffset;

            if (
                targetFile < 0 ||
                targetFile >= 8 ||
                targetRank < 0 ||
                targetRank >= 8
            ) {
                continue;
            }

            const square =
                coordinatesToSquare(
                    targetFile,
                    targetRank
                );

            const targetPiece =
                getPieceAt(
                    square,
                    pieces
                );

            if (
                !targetPiece ||
                targetPiece.color !==
                    piece.color
            ) {
                moves.push(square);
            }
        }
    }

    return moves;
}

function getPawnMoves(
    piece: Piece,
    pieces: Piece[],
    rotation: Rotation
): Square[] {
    const moves: Square[] = [];

    const {
        fileIndex,
        rankIndex,
    } = squareToCoordinates(
        piece.square
    );

    /*
     * This is the important rotation-aware
     * part of pawn movement.
     */
    const direction =
        getPawnDirection(
            piece.color,
            rotation
        );

    /*
     * One-square movement.
     */
    const oneStepFile =
        fileIndex + direction.file;

    const oneStepRank =
        rankIndex + direction.rank;

    if (
        oneStepFile < 0 ||
        oneStepFile >= 8 ||
        oneStepRank < 0 ||
        oneStepRank >= 8
    ) {
        return moves;
    }

    const oneStepSquare =
        coordinatesToSquare(
            oneStepFile,
            oneStepRank
        );

    if (
        !isOccupied(
            oneStepSquare,
            pieces
        )
    ) {
        moves.push(oneStepSquare);

        /*
         * Two-square movement.
         *
         * We use hasMoved rather than assuming
         * the pawn is on rank 2 or rank 7 because
         * the board can now rotate.
         */
        if (!piece.hasMoved) {
            const twoStepFile =
                fileIndex +
                direction.file * 2;

            const twoStepRank =
                rankIndex +
                direction.rank * 2;

            if (
                twoStepFile >= 0 &&
                twoStepFile < 8 &&
                twoStepRank >= 0 &&
                twoStepRank < 8
            ) {
                const twoStepSquare =
                    coordinatesToSquare(
                        twoStepFile,
                        twoStepRank
                    );

                if (
                    !isOccupied(
                        twoStepSquare,
                        pieces
                    )
                ) {
                    moves.push(
                        twoStepSquare
                    );
                }
            }
        }
    }

    /*
     * Pawn captures.
     *
     * These are perpendicular to the pawn's
     * forward direction.
     */
    const captureDirections: Direction[] = [
        {
            file: -direction.rank,
            rank: direction.file,
        },
        {
            file: direction.rank,
            rank: -direction.file,
        },
    ];

    for (
        const captureDirection
        of captureDirections
    ) {
        const targetFile =
            fileIndex +
            direction.file +
            captureDirection.file;

        const targetRank =
            rankIndex +
            direction.rank +
            captureDirection.rank;

        if (
            targetFile < 0 ||
            targetFile >= 8 ||
            targetRank < 0 ||
            targetRank >= 8
        ) {
            continue;
        }

        const targetSquare =
            coordinatesToSquare(
                targetFile,
                targetRank
            );

        const targetPiece =
            getPieceAt(
                targetSquare,
                pieces
            );

        if (
            targetPiece &&
            targetPiece.color !==
                piece.color
        ) {
            moves.push(targetSquare);
        }
    }

    return moves;
}

export function getPseudoLegalMoves(
    piece: Piece,
    pieces: Piece[],
    rotation: Rotation
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
                pieces,
                rotation
            );
    }
}

export function isSquareAttacked(
    square: Square,
    attackingColor: Color,
    pieces: Piece[],
    rotation: Rotation
): boolean {
    return pieces
        .filter(
            (piece) =>
                piece.color ===
                attackingColor
        )
        .some(
            (piece) =>
                getAttackSquares(
                    piece,
                    pieces,
                    rotation
                ).includes(square)
        );
}

export function getAttackSquares(
    piece: Piece,
    pieces: Piece[],
    rotation: Rotation
): Square[] {
    /*
     * Non-pawns retain their normal attack geometry.
     */
    if (piece.type !== "pawn") {
        return getPseudoLegalMoves(
            piece,
            pieces,
            rotation
        );
    }

    const {
        fileIndex,
        rankIndex,
    } = squareToCoordinates(
        piece.square
    );

    const direction =
        getPawnDirection(
            piece.color,
            rotation
        );

    /*
     * Pawn attacks one square diagonally
     * relative to its current direction.
     */
    const captureDirections: Direction[] = [
        {
            file: -direction.rank,
            rank: direction.file,
        },
        {
            file: direction.rank,
            rank: -direction.file,
        },
    ];

    const attacks: Square[] = [];

    for (
        const captureDirection
        of captureDirections
    ) {
        const attackFile =
            fileIndex +
            direction.file +
            captureDirection.file;

        const attackRank =
            rankIndex +
            direction.rank +
            captureDirection.rank;

        if (
            attackFile < 0 ||
            attackFile >= 8 ||
            attackRank < 0 ||
            attackRank >= 8
        ) {
            continue;
        }

        attacks.push(
            coordinatesToSquare(
                attackFile,
                attackRank
            )
        );
    }

    return attacks;
}