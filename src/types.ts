/**
 * The two possible chess colors.
 *
 * TypeScript will now prevent us from accidentally
 * assigning something like "green" to a piece's color.
 */
export type Color = "white" | "black";


/**
 * The six types of chess pieces.
 */
export type PieceType =
    | "king"
    | "queen"
    | "rook"
    | "bishop"
    | "knight"
    | "pawn";


/**
 * A chess file is one of the eight vertical columns.
 */
export type File = "a" | "b" | "c" | "d" | "e" | "f" | "g" | "h";


/**
 * A chess rank is one of the eight horizontal rows.
 */
export type Rank = 1 | 2 | 3 | 4 | 5 | 6 | 7 | 8;


/**
 * A Square combines a file and rank.
 *
 * Examples:
 *
 * "a1"
 * "e4"
 * "h8"
 *
 * TypeScript will use this definition to catch
 * invalid chess coordinates.
 */
export type Square = `${File}${Rank}`;


/**
 * Represents one chess piece on the board.
 */
export interface Piece {
    id: string;
    type: PieceType;
    color: Color;
    square: Square;
}