/**
 * Public interface for the Rotating Chess game engine.
 *
 * The React frontend, multiplayer server, and any future
 * Telegram bot should use this module to access game logic.
 *
 * This file intentionally contains no React code.
 */

// Initial game state
export {
    initialGameState,
} from "../initialGameState";

// Core movement and rules
export {
    getGameStatus,
    getLegalMoves,
    hasLegalMoves,
    isKingInCheck,
    isValidMove,
    makeMove,
} from "./rules";

// Pawn promotion
export {
    isPromotionSquare,
    promotePawn,
} from "./promotion";

// Coordinate transformations
export {
    logicalToPhysical,
    physicalToLogical,
    squareToPhysical,
    physicalToSquare,
    movePhysical,
    movePhysicalToSquare,
    getNextRotation,
} from "./rotation";

// Public game types
export type {
    Color,
    File,
    GameState,
    GameStatus,
    LastMove,
    Piece,
    PieceType,
    PromotionPiece,
    Rank,
    Rotation,
    Square,
} from "../types";

// Move result
export type {
    MoveResult,
} from "./rules";