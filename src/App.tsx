import { useState } from "react";

import ChessBoard from "./components/ChessBoard";
import { initialGameState } from "./initialGameState";
import {
    getLegalMoves,
    getGameStatus,
    makeMove,
} from "./game/rules";
import { promotePawn } from "./game/promotion";
import PromotionDialog from "./components/PromotionDialog";
import type {
    GameState,
    PromotionPiece,
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

    const [promotionSquare, setPromotionSquare] =
        useState<Square | null>(null);

    const selectedPiece =
        gameState.pieces.find(
            (piece) =>
                piece.square === selectedSquare
        );

    const legalMoves = selectedPiece
        ? getLegalMoves(
            selectedPiece,
            gameState
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
        const moveResult =
            makeMove(
                gameState,
                selectedSquare,
                square
            );

        if (moveResult.type === "move") {
            setGameState(
                moveResult.gameState
            );

            setSelectedSquare(null);

            return;
        }

        if (
            moveResult.type === "promotion"
        ) {
            setGameState(
                moveResult.gameState
            );

            setSelectedSquare(null);

            setPromotionSquare(
                moveResult.square
            );

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

    function handlePromotion(
        promotionPiece: PromotionPiece
    ) {
        if (!promotionSquare) {
            return;
        }

        const promotedGameState =
            promotePawn(
                gameState,
                promotionSquare,
                promotionPiece
            );

        setGameState({
            ...promotedGameState,
            status: getGameStatus(
                promotedGameState
            ),
        });

        setPromotionSquare(null);
    }

    return (
        <main>
            <h1>Rotating Chess</h1>

            <p>
                Turn: {gameState.turn}
            </p>

            <p>
                Status: {gameState.status}
            </p>

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

            {promotionSquare && (
                <PromotionDialog
                    onSelect={handlePromotion}
                />
            )}
        </main>
    );
}

export default App;