import type {
    GameState,
    Piece,
    PieceType,
    Color,
} from "../types";

import { isEnPassantCapture } from "./enPassant";

import {
    movePhysicalToSquare,
} from "./rotation";

/**
 * Returns a stable identifier for a chess position.
 *
 * Includes:
 * - Piece locations and types
 * - Player to move
 * - Board rotation
 * - Castling availability
 * - En passant availability
 */
/**
 * Returns a stable identifier for a chess position.
 *
 * Includes:
 * - Piece locations and types
 * - Player to move
 * - Board rotation
 * - Castling availability
 * - En passant availability
 */
export function getPositionKey(
    gameState: GameState
): string {
    const pieceCodes: Record<PieceType, string> = {
        king: "K",
        queen: "Q",
        rook: "R",
        bishop: "B",
        knight: "N",
        pawn: "P",
    };

    const pieces = [...gameState.pieces]
        .sort((a, b) =>
            a.square.localeCompare(b.square)
        )
        .map(piece =>
            `${piece.color[0]}${pieceCodes[piece.type]}${piece.square}`
        )
        .join("|");

    const castlingRights =
        getCastlingRights(gameState.pieces);

    const enPassantAvailable =
        getEnPassantAvailability(gameState);

    return [
        pieces,
        gameState.turn,
        gameState.rotation,
        castlingRights,
        enPassantAvailable,
    ].join(";");
}

/**
 * Determines which castling rights remain available.
 *
 * A king and its corresponding rook must both
 * retain their original unmoved status.
 */
function getCastlingRights(
    pieces: Piece[]
): string {
    const rights: string[] = [];

    const configurations = [
        {
            color: "white" as Color,
            king: "e1",
            kingSideRook: "h1",
            queenSideRook: "a1",
            kingSide: "K",
            queenSide: "Q",
        },
        {
            color: "black" as Color,
            king: "e8",
            kingSideRook: "h8",
            queenSideRook: "a8",
            kingSide: "k",
            queenSide: "q",
        },
    ];

    for (const config of configurations) {
        const king = pieces.find(
            piece =>
                piece.color === config.color &&
                piece.type === "king" &&
                piece.square === config.king
        );

        if (!king || king.hasMoved) {
            continue;
        }

        const kingSideRook = pieces.find(
            piece =>
                piece.color === config.color &&
                piece.type === "rook" &&
                piece.square === config.kingSideRook
        );

        const queenSideRook = pieces.find(
            piece =>
                piece.color === config.color &&
                piece.type === "rook" &&
                piece.square === config.queenSideRook
        );

        if (kingSideRook && !kingSideRook.hasMoved) {
            rights.push(config.kingSide);
        }

        if (queenSideRook && !queenSideRook.hasMoved) {
            rights.push(config.queenSide);
        }
    }

    return rights.join("") || "-";
}

/**
 * Determines whether the player to move has
 * an actual en passant capture available.
 */

function getEnPassantAvailability(
    gameState: GameState
): string {
    const currentPlayer = gameState.turn;

    const pawns = gameState.pieces.filter(
        piece =>
            piece.type === "pawn" &&
            piece.color === currentPlayer
    );

    for (const pawn of pawns) {
        for (const fileOffset of [-1, 1]) {
            const forward =
                pawn.color === "white" ? -1 : 1;

            const target = movePhysicalToSquare(
                pawn.square,
                gameState.rotation,
                fileOffset,
                forward
            );

            if (
                target &&
                isEnPassantCapture(
                    gameState,
                    pawn,
                    target
                )
            ) {
                return target;
            }
        }
    }

    return "-";
}

/**
 * Counts how many times a position has occurred.
 */
export function countPositionOccurrences(
    positionHistory: string[],
    currentPosition: string
): number {
    return positionHistory.filter(
        position => position === currentPosition
    ).length;
}

/**
 * Records a completed position in the game's history.
 */
export function recordPosition(
    gameState: GameState
): GameState {
    const positionKey = getPositionKey(gameState);

    return {
        ...gameState,
        positionHistory: [
            ...(gameState.positionHistory ?? []),
            positionKey,
        ],
    };
}

export function isFivefoldRepetition(
    gameState: GameState
): boolean {
    const history = gameState.positionHistory ?? [];

    if (history.length === 0) {
        return false;
    }

    const currentPosition = history[history.length - 1];

    return countPositionOccurrences(
        history,
        currentPosition
    ) >= 5;
}

export function isThreefoldRepetition(
    gameState: GameState
): boolean {
    const history = gameState.positionHistory ?? [];

    if (history.length === 0) {
        return false;
    }

    const currentPosition =
        history[history.length - 1];

    return countPositionOccurrences(
        history,
        currentPosition
    ) >= 3;
}

/**
 * Determines whether neither player has sufficient
 * material to produce a checkmate.
 *
 * Initial supported cases:
 * - King vs. King
 * - King + Bishop vs. King
 * - King + Knight vs. King
 * - King + Bishop vs. King + Bishop,
 *   when both bishops are on the same square color
 */
export function isInsufficientMaterial(
    gameState: GameState
): boolean {
    const nonKings = gameState.pieces.filter(
        piece => piece.type !== "king"
    );

    // King vs. King
    if (nonKings.length === 0) {
        return true;
    }

    // Any pawn, rook, or queen means sufficient material.
    if (
        nonKings.some(
            piece =>
                piece.type === "pawn" ||
                piece.type === "rook" ||
                piece.type === "queen"
        )
    ) {
        return false;
    }

    // King + one bishop/knight vs. King
    if (nonKings.length === 1) {
        return (
            nonKings[0].type === "bishop" ||
            nonKings[0].type === "knight"
        );
    }

    // King + Bishop vs. King + Bishop
    if (
        nonKings.length === 2 &&
        nonKings.every(
            piece => piece.type === "bishop"
        )
    ) {
        const [first, second] = nonKings;

        return getSquareColor(first.square) ===
            getSquareColor(second.square);
    }

    return false;
}

/**
 * Returns the color of a square using its logical
 * coordinates.
 *
 * Board rotation does not change square color.
 */
function getSquareColor(
    square: string
): number {
    const file = square.charCodeAt(0) - 97;
    const rank = Number(square[1]) - 1;

    return (file + rank) % 2;
}

/**
 * Determines whether the 50-move rule can be claimed.
 *
 * A claim is available after 100 consecutive
 * half-moves without a pawn move or capture.
 */
export function isFiftyMoveDrawClaimable(
    gameState: GameState
): boolean {
    return gameState.halfMoveClock >= 100;
}

/**
 * Determines whether the 75-move rule automatically
 * ends the game in a draw.
 *
 * A draw occurs after 150 consecutive half-moves
 * without a pawn move or capture.
 */
export function isSeventyFiveMoveDraw(
    gameState: GameState
): boolean {
    return gameState.halfMoveClock >= 150;
}