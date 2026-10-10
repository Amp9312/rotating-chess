import {
    useEffect,
    useRef,
    useState,
} from "react";

import ChessBoard from "./components/ChessBoard";
import PromotionDialog from "./components/PromotionDialog";

import {
    getLegalMoves,
} from "./game/rules";

import {
    createGame,
    joinGame,
} from "./multiplayer/api";

import {
    GameConnection,
} from "./multiplayer/GameConnection";

import type {
    Color,
    GameState,
    PromotionPiece,
    Square,
} from "./types";

import "./App.css";


function App() {
    /*
     * --------------------------------------------------
     * Multiplayer state
     * --------------------------------------------------
     */

    const [gameState, setGameState] =
        useState<GameState | null>(null);

    const [playerColor, setPlayerColor] =
        useState<Color | null>(null);

    const [gameId, setGameId] =
        useState<string | null>(null);

    const [connectionStatus, setConnectionStatus] =
        useState<
            "disconnected" |
            "connecting" |
            "connected"
        >("disconnected");

    const [connectionError, setConnectionError] =
        useState<string | null>(null);


    /*
     * Store the GameConnection outside React state.
     *
     * WebSocket objects are mutable objects and don't
     * belong in React's render state.
     */

    const connectionRef =
        useRef<GameConnection | null>(null);


    /*
     * --------------------------------------------------
     * Board/UI state
     * --------------------------------------------------
     */

    const [selectedSquare, setSelectedSquare] =
        useState<Square | null>(null);

    const [promotionSquare, setPromotionSquare] =
        useState<Square | null>(null);

    const [showRotationDebug, setShowRotationDebug] =
        useState(false);


    /*
     * --------------------------------------------------
     * Cleanup WebSocket when App unmounts
     * --------------------------------------------------
     */

    useEffect(() => {
        return () => {
            connectionRef.current?.close();
        };
    }, []);


    /*
     * --------------------------------------------------
     * Connect to a game
     * --------------------------------------------------
     */

    function connectToGame(
        session: {
            gameId: string;
            playerToken: string;
            color: Color;
        }
    ) {
        /*
         * Close an existing connection before creating
         * another one.
         */

        connectionRef.current?.close();

        setGameId(session.gameId);
        setPlayerColor(session.color);
        setConnectionError(null);
        setConnectionStatus("connecting");

        const connection =
            new GameConnection(
                session.gameId,
                session.playerToken,
                {
                    onAuthenticated: (
                        color,
                        state
                    ) => {
                        setPlayerColor(color);
                        setGameState(state);
                        setConnectionStatus(
                            "connected"
                        );
                    },

                    onGameState: (
                        state
                    ) => {
                        setGameState(state);

                        /*
                         * A new authoritative state means
                         * our previous selection may no
                         * longer make sense.
                         */
                        setSelectedSquare(null);
                    },

                    onPromotionRequired: (
                        square,
                        color,
                        state
                    ) => {
                        setGameState(state);

                        /*
                         * Only the player who owns the
                         * promotion should see the dialog.
                         */
                        if (
                            color ===
                            session.color
                        ) {
                            setPromotionSquare(
                                square
                            );
                        }

                        setSelectedSquare(null);
                    },

                    onError: (
                        message
                    ) => {
                        setConnectionError(
                            message
                        );
                    },

                    onClose: () => {
                        setConnectionStatus(
                            "disconnected"
                        );
                    },
                }
            );

        connectionRef.current =
            connection;

        connection.connect();
    }


    /*
     * --------------------------------------------------
     * Create a new game
     * --------------------------------------------------
     */

    async function handleCreateGame() {
        try {
            setConnectionError(null);

            const session =
                await createGame();

            connectToGame(session);
        } catch (error) {
            setConnectionError(
                error instanceof Error
                    ? error.message
                    : "Failed to create game."
            );
        }
    }


    /*
     * --------------------------------------------------
     * Join an existing game
     * --------------------------------------------------
     */

    async function handleJoinGame() {
        const enteredGameId =
            window.prompt(
                "Enter the game ID:"
            );

        if (!enteredGameId) {
            return;
        }

        try {
            setConnectionError(null);

            const session =
                await joinGame(
                    enteredGameId
                        .trim()
                        .toUpperCase()
                );

            connectToGame(session);
        } catch (error) {
            setConnectionError(
                error instanceof Error
                    ? error.message
                    : "Failed to join game."
            );
        }
    }


    /*
     * --------------------------------------------------
     * Legal moves
     * --------------------------------------------------
     */

    const selectedPiece =
        gameState &&
        selectedSquare
            ? gameState.pieces.find(
                piece =>
                    piece.square ===
                    selectedSquare
            )
            : undefined;

    const legalMoves =
        selectedPiece && gameState
            ? getLegalMoves(
                selectedPiece,
                gameState
            )
            : [];


    /*
     * --------------------------------------------------
     * Board interaction
     * --------------------------------------------------
     */

    function handleSquareClick(
        square: Square
    ) {
        if (!gameState) {
            return;
        }

        /*
         * Don't allow interaction until the WebSocket
         * connection is established.
         */

        if (
            connectionStatus !==
            "connected"
        ) {
            return;
        }

        /*
         * Don't allow the player to move while it
         * isn't their turn.
         */

        if (
            playerColor !==
            gameState.turn
        ) {
            return;
        }

        const clickedPiece =
            gameState.pieces.find(
                piece =>
                    piece.square ===
                    square
            );

        /*
         * Nothing is currently selected.
         */

        if (!selectedSquare) {
            if (!clickedPiece) {
                return;
            }

            if (
                clickedPiece.color !==
                playerColor
            ) {
                return;
            }

            setSelectedSquare(
                square
            );

            return;
        }

        /*
         * A piece is already selected.
         *
         * IMPORTANT:
         *
         * We do NOT call makeMove() here.
         *
         * The server is authoritative.
         */

        if (
            legalMoves.includes(square)
        ) {
            try {
                connectionRef.current?.sendMove(
                    selectedSquare,
                    square
                );

                /*
                 * Don't update gameState here.
                 *
                 * Wait for the server's
                 * game_state message.
                 */

                setSelectedSquare(null);

                return;
            } catch (error) {
                setConnectionError(
                    error instanceof Error
                        ? error.message
                        : "Failed to send move."
                );

                return;
            }
        }

        /*
         * The clicked square contains another
         * piece belonging to this player.
         *
         * Select that piece instead.
         */

        if (
            clickedPiece &&
            clickedPiece.color ===
                playerColor
        ) {
            setSelectedSquare(
                square
            );

            return;
        }

        /*
         * Otherwise clear the selection.
         */

        setSelectedSquare(null);
    }


    /*
     * --------------------------------------------------
     * Promotion
     * --------------------------------------------------
     */

    function handlePromotion(
        promotionPiece: PromotionPiece
    ) {
        if (!promotionSquare) {
            return;
        }

        try {
            connectionRef.current?.promote(
                promotionPiece
            );

            /*
             * The server will broadcast the resulting
             * GameState. Don't mutate it locally.
             */

            setPromotionSquare(null);
        } catch (error) {
            setConnectionError(
                error instanceof Error
                    ? error.message
                    : "Failed to promote pawn."
            );
        }
    }


    /*
     * --------------------------------------------------
     * Render
     * --------------------------------------------------
     */

    return (
        <main>
            <h1>
                Rotating Chess
            </h1>

            {!gameState && (
                <section>
                    <p>
                        No game connected.
                    </p>

                    <button
                        onClick={
                            handleCreateGame
                        }
                    >
                        Create Game
                    </button>

                    <button
                        onClick={
                            handleJoinGame
                        }
                    >
                        Join Game
                    </button>
                </section>
            )}

            {gameId && (
                <p>
                    Game ID:{" "}
                    <strong>
                        {gameId}
                    </strong>
                </p>
            )}

            {playerColor && (
                <p>
                    You are:{" "}
                    <strong>
                        {playerColor}
                    </strong>
                </p>
            )}

            <p>
                Connection:{" "}
                {connectionStatus}
            </p>

            {connectionError && (
                <p>
                    Error:{" "}
                    {connectionError}
                </p>
            )}

            {gameState && (
                <>
                    <p>
                        Turn:{" "}
                        {gameState.turn}
                    </p>

                    <p>
                        Status:{" "}
                        {gameState.status}
                    </p>

                    <p>
                        Legal moves:{" "}
                        {legalMoves.join(", ")}
                    </p>

                    <div className="game-info">
                        <p>
                            Rotation:{" "}
                            {gameState.rotation}°
                        </p>

                        <p>
                            Completed rounds:{" "}
                            {
                                gameState.completedRounds
                            }
                        </p>

                        <p>
                            Turn:{" "}
                            {gameState.turn}
                        </p>
                    </div>

                    <div className="rotation-debug">
                        <label>
                            <input
                                type="checkbox"
                                checked={
                                    showRotationDebug
                                }
                                onChange={
                                    event =>
                                        setShowRotationDebug(
                                            event.target.checked
                                        )
                                }
                            />

                            {" "}
                            Show rotation debug
                        </label>

                        {/*
                         * These buttons remain temporarily
                         * for development.
                         *
                         * They should NOT be used as part
                         * of an actual multiplayer game.
                         */}

                        {showRotationDebug && (
                            <div>
                                <button
                                    onClick={() =>
                                        setGameState(
                                            current =>
                                                current
                                                    ? {
                                                        ...current,
                                                        rotation: 0,
                                                    }
                                                    : current
                                        )
                                    }
                                >
                                    0°
                                </button>

                                <button
                                    onClick={() =>
                                        setGameState(
                                            current =>
                                                current
                                                    ? {
                                                        ...current,
                                                        rotation: 90,
                                                    }
                                                    : current
                                        )
                                    }
                                >
                                    90°
                                </button>

                                <button
                                    onClick={() =>
                                        setGameState(
                                            current =>
                                                current
                                                    ? {
                                                        ...current,
                                                        rotation: 180,
                                                    }
                                                    : current
                                        )
                                    }
                                >
                                    180°
                                </button>

                                <button
                                    onClick={() =>
                                        setGameState(
                                            current =>
                                                current
                                                    ? {
                                                        ...current,
                                                        rotation: 270,
                                                    }
                                                    : current
                                        )
                                    }
                                >
                                    270°
                                </button>
                            </div>
                        )}
                    </div>

                    <ChessBoard
                        pieces={
                            gameState.pieces
                        }
                        rotation={
                            gameState.rotation
                        }
                        selectedSquare={
                            selectedSquare
                        }
                        legalMoves={
                            legalMoves
                        }
                        onSquareClick={
                            handleSquareClick
                        }
                        showCoordinates={
                            showRotationDebug
                        }
                        showRotationDebug={
                            showRotationDebug
                        }
                    />

                    {promotionSquare && (
                        <PromotionDialog
                            onSelect={
                                handlePromotion
                            }
                        />
                    )}
                </>
            )}
        </main>
    );
}

export default App;