import { useState } from "react";

import ChessBoard from "./components/ChessBoard";
import { initialGameState } from "./initialGameState";
import { getLegalMoves } from "./game/movement";
import { makeMove } from "./game/rules";
import type { GameState, Square } from "./types";
import "./App.css";

function App() {
    const [gameState, setGameState] =
        useState<GameState>(initialGameState);

    const [selectedSquare, setSelectedSquare] =
        useState<Square | null>(null);

    const selectedPiece = gameState.pieces.find(
    (piece) => piece.square === selectedSquare);

    const legalMoves = selectedPiece
    ? getLegalMoves(
        selectedPiece,
        gameState.pieces
    )
    : [];

function handleSquareClick(square: Square) {
    const clickedPiece = gameState.pieces.find(
        (piece) => piece.square === square
    );

    // No piece is currently selected.
    if (!selectedSquare) {
        if (!clickedPiece) {
            return;
        }

        if (clickedPiece.color !== gameState.turn) {
            return;
        }

        console.log("Selected piece:", clickedPiece);
        setSelectedSquare(square);

        return;
    }

    const selectedPiece = gameState.pieces.find(
        (piece) => piece.square === selectedSquare
    );

    if (!selectedPiece) {
        setSelectedSquare(null);
        return;
    }

    const legalMoves = getLegalMoves(
        selectedPiece,
        gameState.pieces
    );

    // The clicked square is a legal destination.
    if (legalMoves.includes(square)) {
        const newGameState = makeMove(
            gameState,
            selectedSquare,
            square
        );

        setGameState(newGameState);
        setSelectedSquare(null);

        return;
    }

    // Clicking another piece changes the selection.
    if (
        clickedPiece &&
        clickedPiece.color === gameState.turn
    ) {
        setSelectedSquare(square);
        return;
    }

    // Clicking elsewhere clears the selection.
    setSelectedSquare(null);
}

    return (
        <main>
            <h1>Rotating Chess</h1>

            <ChessBoard
                pieces={gameState.pieces}
                selectedSquare={selectedSquare}
                legalMoves={legalMoves}
                onSquareClick={handleSquareClick}
            />
        </main>
    );
}

export default App;