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
    endAnimationPhase: 
    | "idle"
    | "collapsing"
    | "result"
    | "restoring"
    | "complete";

onVortexComplete: () => void;
onRestoreComplete: () => void;
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
    endAnimationPhase,
    onVortexComplete,
    onRestoreComplete,
}: ChessBoardProps) {

    const boardRef = useRef<HTMLDivElement>(null);
    const previousPositions = useRef<Map<string, DOMRect>>(new Map());
    const [isAnimating, setIsAnimating] = useState(false);
    const [isCollapsed, setIsCollapsed] = useState(false);
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
useLayoutEffect(() => {
    const board = boardRef.current;

    if (!board) return;

    // Wait for the existing rotation animation to finish.
    if (endAnimationPhase === "collapsing" && isAnimating) {
        return;
    }

    if (endAnimationPhase === "collapsing") {
        const squares = Array.from(
            board.querySelectorAll<HTMLElement>(".board-square")
        );

        // Reduced-motion users skip the vortex.
        if (
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            setIsCollapsed(true);
            onVortexComplete();
            return;
        }

        const boardRect = board.getBoundingClientRect();

        const centerX = boardRect.left + boardRect.width / 2;
        const centerY = boardRect.top + boardRect.height / 2;

        const animations: Animation[] = [];

        squares.forEach((square) => {
            const rect = square.getBoundingClientRect();

            const tileX = rect.left + rect.width / 2;
            const tileY = rect.top + rect.height / 2;

            const dx = centerX - tileX;
            const dy = centerY - tileY;

            const distance = Math.sqrt(dx * dx + dy * dy);
            const angle = Math.atan2(dy, dx);

            // Add a tangential offset to create the spiral.
            const tangentX = -Math.sin(angle) * distance * 0.35;
            const tangentY = Math.cos(angle) * distance * 0.35;

            const animation = square.animate(
                [
                    {
                        transform: "translate(0, 0) rotate(0deg) scale(1)",
                        opacity: 1,
                    },
                    {
                        transform: `
                            translate(
                                ${dx * 0.45 + tangentX}px,
                                ${dy * 0.45 + tangentY}px
                            )
                            rotate(180deg)
                            scale(0.65)
                        `,
                        opacity: 0.8,
                        offset: 0.55,
                    },
                    {
                        transform: `
                            translate(${dx}px, ${dy}px)
                            rotate(540deg)
                            scale(0)
                        `,
                        opacity: 0,
                    },
                ],
                {
                    duration: 1500,
                    delay: (distance / (boardRect.width * 0.71)) * 180,
                    easing: "cubic-bezier(0.45, 0, 0.8, 1)",
                    fill: "forwards",
                }
            );

            animations.push(animation);
        });

        Promise.all(
            animations.map(animation => animation.finished)
        ).then(() => {
            setIsCollapsed(true);

            // Remove the individual tile animations.
            animations.forEach(animation => animation.cancel());

            onVortexComplete();
        }).catch(() => {
            // Animation was interrupted.
        });

        return;
    }

    if (endAnimationPhase === "restoring") {
        setIsCollapsed(false);

        if (
            window.matchMedia(
                "(prefers-reduced-motion: reduce)"
            ).matches
        ) {
            onRestoreComplete();
            return;
        }

        const animation = board.animate(
            [
                { opacity: 0 },
                { opacity: 1 },
            ],
            {
                duration: 800,
                easing: "ease-out",
            }
        );

        animation.finished.then(() => {
            onRestoreComplete();
        }).catch(() => {
            // Animation was interrupted.
        });
    }

}, [
    endAnimationPhase,
    isAnimating,
    onVortexComplete,
    onRestoreComplete,
]);
    return (
<div
    className={[
        "chess-board",
        isCollapsed ? "board-collapsed" : "",
    ].join(" ")}
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