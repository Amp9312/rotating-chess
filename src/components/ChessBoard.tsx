import type { Piece, Square } from "../types";
import { files, ranks } from "../game/coordinates";
import "./ChessBoard.css";


interface ChessBoardProps {
    pieces: Piece[];
    selectedSquare?: Square | null;
    onSquareClick?: (square: Square) => void;
}





function ChessBoard({
    pieces,
    selectedSquare,
    onSquareClick,
}: ChessBoardProps) {

    return (
        <div className="chess-board">

            {ranks.map((rank) =>
                files.map((file) => {

                    const square = `${file}${rank}` as Square;

                    const piece = pieces.find(
                        (piece) => piece.square === square
                    );

                    return (
                        <div
    key={square}
    className={`board-square ${
        (files.indexOf(file) + ranks.indexOf(rank)) % 2 === 0
            ? "light-square"
            : "dark-square"
    } ${
        selectedSquare === square ? "selected-square" : ""
    }`}
    onClick={() => onSquareClick?.(square)}
>

                            {piece && (
                                <div className="piece">
                                    {getPieceSymbol(piece)}
                                </div>
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
 *
 * For Phase 1 we're using Unicode chess characters.
 *
 * Later we can replace this with SVG or image assets
 * without changing our underlying board model.
 */
function getPieceSymbol(piece: Piece): string {

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

    return symbols[piece.color][piece.type];
}


export default ChessBoard;