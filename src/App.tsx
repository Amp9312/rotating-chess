import { useState } from "react";

import ChessBoard from "./components/ChessBoard";
import { initialGameState } from "./initialGameState";
import {
    getPseudoLegalMoves,
} from "./game/movement";
import { makeMove } from "./game/rules";
import type {
    GameState,
    Square,
} from "./types";
import "./App.css";

function App() {
    const [gameState, setGameState] =
        useState<GameState>(
            initialGameState
        );

    const [selectedSquare, setSelectedSquare] =
        useState<Square | null>(null);

    const selectedPiece =
        gameState.pieces.find(
            (piece) =>
                piece.square === selectedSquare
        );

    const legalMoves = selectedPiece
        ? getPseudoLegalMoves(
            selectedPiece,
            gameState.pieces
        )
        : [];

    function handleSquareClick(
        square: Square
    ) {
        const clickedPiece =
            gameState.pieces.find(
                (piece) =>
                    piece.square === square
            );

        // Nothing is currently selected.
        if (!selectedSquare) {
            if (!clickedPiece) {
                return;
            }

            if (
                clickedPiece.color !==
                gameState.turn
            ) {
                return;
            }

            setSelectedSquare(square);

            return;
        }

        // A piece is already selected.
        const newGameState =
            makeMove(
                gameState,
                selectedSquare,
                square
            );

        // The move was valid.
        if (newGameState) {
            setGameState(newGameState);
            setSelectedSquare(null);

            return;
        }

        // The clicked square contains
        // another piece belonging to the
        // current player.
        if (
            clickedPiece &&
            clickedPiece.color ===
                gameState.turn
        ) {
            setSelectedSquare(square);

            return;
        }

        // Otherwise clear the selection.
        setSelectedSquare(null);
    }

    return (
        <main>
            <h1>Rotating Chess</h1>

            <ChessBoard
                pieces={gameState.pieces}
                selectedSquare={
                    selectedSquare
                }
                legalMoves={legalMoves}
                onSquareClick={
                    handleSquareClick
                }
            />
        </main>
    );
}

export default App;