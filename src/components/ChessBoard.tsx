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

import { useLayoutEffect, useRef, useState } from "react";


import "./ChessBoard.css";

interface ChessBoardProps {
    pieces: Piece[];
    selectedSquare?: Square | null;
    legalMoves?: Square[];
    readOnly?: boolean;
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
    readOnly = false,
}: ChessBoardProps) {

    const boardRef = useRef<HTMLDivElement>(null);
    const previousPositions = useRef<Map<string, DOMRect>>(new Map());
    const [isAnimating, setIsAnimating] = useState(false);

    useLayoutEffect(() => {
        const board = boardRef.current;
        if (!board) return;

        const squares = Array.from(
            board.querySelectorAll<HTMLElement>(".board-square")
        );

        const newPositions = new Map<string, DOMRect>();

        squares.forEach((square) => {
            const squareName = square.dataset.square;

            if (squareName) {
                newPositions.set(
                    squareName,
                    square.getBoundingClientRect()
                );
            }
        });

        const oldPositions = previousPositions.current;

        // Don't animate the initial render.
        if (oldPositions.size === 0) {
            previousPositions.current = newPositions;
            return;
        }

        // Respect reduced-motion preferences.
        if (
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            previousPositions.current = newPositions;
            return;
        }

        const animations: Animation[] = [];

        squares.forEach((square) => {
            const squareName = square.dataset.square;
            if (!squareName) return;

            const oldPosition = oldPositions.get(squareName);
            const newPosition = newPositions.get(squareName);

            if (!oldPosition || !newPosition) return;

            const deltaX = oldPosition.left - newPosition.left;
            const deltaY = oldPosition.top - newPosition.top;

            if (deltaX === 0 && deltaY === 0) return;

            const animation = square.animate(
                [
                    {
                        transform: `translate(${deltaX}px, ${deltaY}px)`,
                    },
                    {
                        transform: "translate(0, 0)",
                    },
                ],
                {
                    duration: 700,
                    easing: "ease-in-out",
                }
            );

            animations.push(animation);
        });

        previousPositions.current = newPositions;

        if (animations.length === 0) return;

        setIsAnimating(true);

        Promise.all(
            animations.map(animation => animation.finished)
        ).then(() => {
            setIsAnimating(false);
        }).catch(() => {
            setIsAnimating(false);
        });

    }, [rotation]);

    return (
        <div
            className="chess-board"
            ref={boardRef}
            aria-busy={isAnimating}
        >
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
const boardRef = useRef<HTMLDivElement>(null);
const previousPositions = useRef<Map<string, DOMRect>>(new Map());
const [isAnimating, setIsAnimating] = useState(false);

useLayoutEffect(() => {
    const board = boardRef.current;
    if (!board) return;

    const squares = Array.from(
        board.querySelectorAll<HTMLElement>(".board-square")
    );

    const newPositions = new Map<string, DOMRect>();

    squares.forEach((square) => {
        const squareName = square.dataset.square;
        if (squareName) {
            newPositions.set(squareName, square.getBoundingClientRect());
        }
    });

    const oldPositions = previousPositions.current;

    // Don't animate the initial render.
    if (oldPositions.size === 0) {
        previousPositions.current = newPositions;
        return;
    }

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    previousPositions.current = newPositions;
    return;
}

    const animations: Animation[] = [];

    squares.forEach((square) => {
        const squareName = square.dataset.square;
        if (!squareName) return;

        const oldPosition = oldPositions.get(squareName);
        const newPosition = newPositions.get(squareName);

        if (!oldPosition || !newPosition) return;

        const deltaX = oldPosition.left - newPosition.left;
        const deltaY = oldPosition.top - newPosition.top;

        if (deltaX === 0 && deltaY === 0) return;

        const animation = square.animate(
            [
                {
                    transform: `translate(${deltaX}px, ${deltaY}px)`,
                },
                {
                    transform: "translate(0, 0)",
                },
            ],
            {
                duration: 700,
                easing: "ease-in-out",
            }
        );

        animations.push(animation);
    });

    previousPositions.current = newPositions;

    if (animations.length === 0) return;

    setIsAnimating(true);

    Promise.all(
        animations.map(animation => animation.finished)
    ).then(() => {
        setIsAnimating(false);
    }).catch(() => {
        setIsAnimating(false);
    });

}, [rotation]);
                    return (
                        <div
                            key={square}
                            data-square={square}
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
onClick={() => {
    if (readOnly || isAnimating) return;
    onSquareClick?.(square);
}}
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