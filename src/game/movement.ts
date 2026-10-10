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

    /*
     * Pawns move according to the PHYSICAL board.
     *
     * White always moves visually upward.
     * Black always moves visually downward.
     *
     * We therefore:
     *
     * 1. Convert the logical square to its physical position.
     * 2. Move in physical space.
     * 3. Convert the physical destination back
     *    into a logical square.
     */

    const forward =
        piece.color === "white"
            ? -1
            : 1;

    const physicalOffsets = [
        {
            file: 0,
            rank: forward,
        },
    ];

    /*
     * One-square forward movement.
     */
    for (const offset of physicalOffsets) {
        const targetSquare =
            movePhysicalToSquare(
                piece.square,
                rotation,
                offset.file,
                offset.rank
            );

        if (
            targetSquare &&
            !isOccupied(
                targetSquare,
                pieces
            )
        ) {
            moves.push(targetSquare);

            /*
             * Two-square movement is available
             * only before the pawn has moved.
             */
            if (!piece.hasMoved) {
                const twoStepSquare =
                    movePhysicalToSquare(
                        piece.square,
                        rotation,
                        0,
                        forward * 2
                    );

                if (
                    twoStepSquare &&
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
     * White captures diagonally upward.
     * Black captures diagonally downward.
     */
    const captureOffsets = [
        {
            file: -1,
            rank: forward,
        },
        {
            file: 1,
            rank: forward,
        },
    ];

    for (
        const offset of captureOffsets
    ) {
        const targetSquare =
            movePhysicalToSquare(
                piece.square,
                rotation,
                offset.file,
                offset.rank
            );

        if (!targetSquare) {
            continue;
        }

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

        /*
     * Pawns attack one square diagonally
     * in their physical forward direction.
     *
     * These are attack squares rather than
     * actual capture moves, so we do not care
     * whether a piece occupies the destination.
     */
    const forward =
        piece.color === "white"
            ? -1
            : 1;

    const captureOffsets = [
        {
            file: -1,
            rank: forward,
        },
        {
            file: 1,
            rank: forward,
        },
    ];

    const attacks: Square[] = [];

    for (
        const offset of captureOffsets
    ) {
        const attackSquare =
            movePhysicalToSquare(
                piece.square,
                rotation,
                offset.file,
                offset.rank
            );

        if (attackSquare) {
            attacks.push(
                attackSquare
            );
        }
    }

    return attacks;
}