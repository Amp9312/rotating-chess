import type {
    Piece,
    Square,
    Rotation,
} from "../types";

import {
    files,
    ranks,
    squareToCoordinates,
} from "../game/coordinates";

import {
    logicalToPhysical,
} from "../game/rotation";

import "./ChessBoard.css";

interface ChessBoardProps {
    pieces: Piece[];
    selectedSquare?: Square | null;
    legalMoves?: Square[];
    rotation?: Rotation;
    onSquareClick?: (
        square: Square
    ) => void;
    showCoordinates?: boolean;
    showRotationDebug?: boolean;
}

export function ChessBoard({
    pieces,
    selectedSquare,
    legalMoves = [],
    onSquareClick,
    rotation = 0,
    showCoordinates = false,
    showRotationDebug = false,
}: ChessBoardProps) {

    return (
        <div className="chess-board">
            {ranks.flatMap((rank) =>
                files.map((file) => {
                    const square =
                        `${file}${rank}` as Square;

                    const {
                        fileIndex,
                        rankIndex,
                    } =
                        squareToCoordinates(
                            square
                        );

                    /*
                     * Determine the square's color
                     * from its LOGICAL coordinates.
                     *
                     * Rotation changes where the square
                     * appears, not what color the square is.
                     */
                    const isLightSquare =
                        (fileIndex + rankIndex) % 2 === 0;

                    /*
                     * Determine where this logical square
                     * should appear visually.
                     */
                    const visual =
                        logicalToPhysical(
                            {
                                fileIndex,
                                rankIndex,
                            },
                            rotation
                        );

                    const piece =
                        pieces.find(
                            piece =>
                                piece.square ===
                                square
                        );

                    const isSelected =
                        selectedSquare === square;

                    const isLegalMove =
                        legalMoves.includes(
                            square
                        );

                    return (
                        <div
                            key={square}
                            className={[
                                "board-square",

                                isLightSquare
                                    ? "light-square"
                                    : "dark-square",

                                isSelected
                                    ? "selected-square"
                                    : "",

                                isLegalMove
                                    ? "legal-move-square"
                                    : "",
                            ].join(" ")}
                            style={{
                                gridColumn:
                                    visual.fileIndex + 1,

                                gridRow:
                                    visual.rankIndex + 1,
                            }}
                            onClick={() =>
                                onSquareClick?.(
                                    square
                                )
                            }
                        >
                            {showCoordinates && (
    <span className="square-coordinate">
        {square}
    </span>
)}

{showRotationDebug && (
    <span className="physical-coordinate">
        {visual.fileIndex},{visual.rankIndex}
    </span>
)}

{piece && (
    <span className="piece">
        {getPieceSymbol(piece)}
    </span>
)}
                        </div>
                    );
                })
            )}
        </div>
    );
}

/**
 * Converts our internal piece representation into
 * something the browser can display.
 */
function getPieceSymbol(
    piece: Piece
): string {

    const symbols = {
        white: {
            king: "♔",
            queen: "♕",
            rook: "♖",
            bishop: "♗",
            knight: "♘",
            pawn: "♙",
        },

        black: {
            king: "♚",
            queen: "♛",
            rook: "♜",
            bishop: "♝",
            knight: "♞",
            pawn: "♟",
        },
    };

    return symbols[
        piece.color
    ][piece.type];
}

export default ChessBoard;