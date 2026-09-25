import { useState } from "react";

import ChessBoard from "./components/ChessBoard";
import { initialPosition } from "./initialPosition";
import type { Piece, Square } from "./types";
import "./App.css";

function App() {
    const [pieces, setPieces] =
        useState<Piece[]>(initialPosition);

    const [selectedSquare, setSelectedSquare] =
        useState<Square | null>(null);

    function handleSquareClick(square: Square) {
        setSelectedSquare(square);
    }

    return (
        <main>
            <h1>Rotating Chess</h1>

            <ChessBoard
                pieces={pieces}
                selectedSquare={selectedSquare}
                onSquareClick={handleSquareClick}
            />
        </main>
    );
}

export default App;