import {
    useCallback,
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
    loadGameSession,
    saveGameSession,
    clearGameSession,
} from "./multiplayer/api";

import type {
    GameSession,
} from "./multiplayer/api";

import {
    GameConnection,
} from "./multiplayer/GameConnection";

import type {
    Color,
    GameState,
    PromotionPiece,
    PlayerRole,
    Square,
} from "./types";

import {
    isThreefoldRepetition,
    isFiftyMoveDrawClaimable,
} from "./game/draw";

import "./App.css";

function App() {
    /*
     * --------------------------------------------------
     * Multiplayer state
     * --------------------------------------------------
     */

    type EndAnimationPhase =
    | "idle"
    | "collapsing"
    | "result"
    | "restoring"
    | "complete";

    function getEndReasonLabel(reason: GameState["endReason"]): string {
    switch (reason) {
        case "checkmate":
            return "by checkmate";
        case "stalemate":
            return "by stalemate";
        case "fivefold_repetition":
            return "by fivefold repetition";
        case "insufficient_material":
            return "by insufficient material";
        case "seventy_five_move_rule":
            return "by the 75-move rule";
        case "threefold_repetition_claim":
            return "by a threefold repetition claim";
        case "fifty_move_rule_claim":
            return "by the 50-move rule";
        case "agreement":
            return "by agreement";
        default:
            return "— game over";
    }
}

    const [gameState, setGameState] =
        useState<GameState | null>(null);

    const [playerColor, setPlayerColor] =
        useState<Color | null>(null);

    const [playerRole, setPlayerRole] =
        useState<PlayerRole | null>(null);

    const [gameId, setGameId] =
        useState<string | null>(null);


    const [endAnimationPhase, setEndAnimationPhase] =
        useState<EndAnimationPhase>("idle");

    const previousGameStatusRef =
        useRef<GameState["status"] | null>(null);

const handleVortexComplete = useCallback(() => {
    setEndAnimationPhase("result");
}, []);

const handleRestoreComplete = useCallback(() => {
    setEndAnimationPhase("complete");
}, []);

const [connectionStatus, setConnectionStatus] =
    useState<
        "disconnected" |
        "connecting" |
        "connected" |
        "reconnecting"
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
     * Connect to a game
     * --------------------------------------------------
     */

const connectToGame = useCallback((
    session: GameSession
) => {
    saveGameSession(session);
        /*
         * Close an existing connection before creating
         * another one.
         */
        setPromotionSquare(null);
setSelectedSquare(null);
previousGameStatusRef.current = null;
setEndAnimationPhase("idle");

        connectionRef.current?.close();

        setGameId(session.gameId);
        setPlayerColor(session.color);
        setConnectionError(null);
        setConnectionStatus("connecting");

        const connection =
            new GameConnection(
                session.gameId,
                session.sessionToken,
                {
                    onAuthenticated: (
                        role,
                        color,
                        state
                    ) => {
                        setPlayerRole(role);
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

                    onConnectionStatus: (status) => {
    setConnectionStatus(status);
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
    },[]);

    /*
     * --------------------------------------------------
     * Cleanup WebSocket when App unmounts
     * --------------------------------------------------
     */

useEffect(() => {
    const savedSession = loadGameSession();

    if (savedSession) {
        connectToGame(savedSession);
    }

    return () => {
        connectionRef.current?.close();
    };
}, [connectToGame]);

useEffect(() => {
    if (!gameState) {
        previousGameStatusRef.current = null;
        return;
    }

    const previousStatus =
        previousGameStatusRef.current;

    const wasActive =
        previousStatus === "playing" ||
        previousStatus === "check";

    const isEnded =
        gameState.status === "checkmate" ||
        gameState.status === "stalemate" ||
        gameState.status === "draw";

    if (wasActive && isEnded) {
        setEndAnimationPhase("collapsing");
    }

    previousGameStatusRef.current =
        gameState.status;

}, [gameState?.status]);

useEffect(() => {
    if (endAnimationPhase !== "result") {
        return;
    }

    const timeout = window.setTimeout(() => {
        setEndAnimationPhase("restoring");
    }, 2000);

    return () => window.clearTimeout(timeout);
}, [endAnimationPhase]);

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

const canClaimDraw =
    gameState !== null &&
    playerRole === "player" &&
    playerColor !== null &&
    playerColor === gameState.turn &&
    connectionStatus === "connected" &&
    promotionSquare === null &&
    (gameState.status === "playing" ||
        gameState.status === "check") &&
    (
        isThreefoldRepetition(gameState) ||
        isFiftyMoveDrawClaimable(gameState)
    );

const canOfferDraw =
    gameState !== null &&
    playerRole === "player" &&
    playerColor !== null &&
    playerColor === gameState.turn &&
    connectionStatus === "connected" &&
    promotionSquare === null &&
    (gameState.status === "playing" ||
        gameState.status === "check") &&
    gameState.drawOffer === null;

const canRespondToDraw =
    gameState !== null &&
    playerRole === "player" &&
    playerColor !== null &&
    connectionStatus === "connected" &&
    promotionSquare === null &&
    (gameState.status === "playing" ||
        gameState.status === "check") &&
    gameState.drawOffer !== null &&
    gameState.drawOffer !== playerColor;

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

if (playerRole !== "player" || !playerColor) {
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

function handleLeaveGame() {
    connectionRef.current?.close();
    connectionRef.current = null;

    clearGameSession();

    setGameState(null);
    setGameId(null);
    setPlayerColor(null);
    setPlayerRole(null);
    setSelectedSquare(null);
    setPromotionSquare(null);
    setConnectionError(null);
    setConnectionStatus("disconnected");
}

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

    function handleDrawClaim() {
    if (!canClaimDraw) {
        return;
    }

    try {
        connectionRef.current?.sendDrawClaim();
    } catch (error) {
        setConnectionError(
            error instanceof Error
                ? error.message
                : "Failed to claim draw."
        );
    }
}

function handleDrawOffer() {
    if (!canOfferDraw) {
        return;
    }

    try {
        connectionRef.current?.sendDrawOffer();
    } catch (error) {
        setConnectionError(
            error instanceof Error
                ? error.message
                : "Failed to offer a draw."
        );
    }
}

function handleAcceptDraw() {
    if (!canRespondToDraw) {
        return;
    }

    try {
        connectionRef.current?.acceptDrawOffer();
    } catch (error) {
        setConnectionError(
            error instanceof Error
                ? error.message
                : "Failed to accept draw offer."
        );
    }
}

function handleDeclineDraw() {
    if (!canRespondToDraw) {
        return;
    }

    try {
        connectionRef.current?.declineDrawOffer();
    } catch (error) {
        setConnectionError(
            error instanceof Error
                ? error.message
                : "Failed to decline draw offer."
        );
    }
}


    /*
     * --------------------------------------------------
     * Render
     * --------------------------------------------------
     */

    const isGameOver =
        gameState !== null &&
        (
            gameState.status === "checkmate" ||
            gameState.status === "stalemate" ||
            gameState.status === "draw"
        );

    const resultMessage = gameState
        ? gameState.winner
            ? `${gameState.winner === "white" ? "White" : "Black"} wins`
            : "Draw"
        : "";

    const resultDetail = gameState
        ? getEndReasonLabel(gameState.endReason)
        : "";

    return (
        <main>
            <h1>
                Rotating Chess
            </h1>

            {!gameState && !gameId && (
                <section>
                    <p>No game connected.</p>

                    <button onClick={handleCreateGame}>
                        Create Game
                    </button>

                    <button onClick={handleJoinGame}>
                        Join Game
                    </button>
                </section>
            )}

            {gameId && !gameState && (
                <p>
                    Reconnecting to game {gameId}...
                </p>
            )}

            {connectionError && (
                <p>
                    Error: {connectionError}
                </p>
            )}

            {gameState && (
                <div className="game-layout">

                    {/* LEFT COLUMN: BOARD */}

                    <section className="board-column">
                        <div className="board-stage">
                            {isGameOver && endAnimationPhase === "result" && (
                                <div className="end-result-reveal">
                                    <h2>{resultMessage}</h2>
                                    <p>{resultDetail}</p>
                                </div>
                            )}

                            <ChessBoard
                                pieces={gameState.pieces}
                                rotation={gameState.rotation}
                                selectedSquare={selectedSquare}
                                legalMoves={legalMoves}
                                onSquareClick={handleSquareClick}
                                showCoordinates={showRotationDebug}
                                showRotationDebug={showRotationDebug}
                                readOnly={
                                    playerRole !== "player" ||
                                    connectionStatus !== "connected" ||
                                    isGameOver
                                }
                                endAnimationPhase={endAnimationPhase}
                                onVortexComplete={handleVortexComplete}
                                onRestoreComplete={handleRestoreComplete}
                            />
                        </div>

                        {/* Developer options */}

                        <div className="rotation-debug">
                            <label>
                                <input
                                    type="checkbox"
                                    checked={showRotationDebug}
                                    onChange={event =>
                                        setShowRotationDebug(
                                            event.target.checked
                                        )
                                    }
                                />

                                {" "}
                                Show rotation debug
                            </label>

                            {showRotationDebug && (
                                <div>
                                    <button
                                        onClick={() =>
                                            setGameState(current =>
                                                current
                                                    ? { ...current, rotation: 0 }
                                                    : current
                                            )
                                        }
                                    >
                                        0°
                                    </button>

                                    <button
                                        onClick={() =>
                                            setGameState(current =>
                                                current
                                                    ? { ...current, rotation: 90 }
                                                    : current
                                            )
                                        }
                                    >
                                        90°
                                    </button>

                                    <button
                                        onClick={() =>
                                            setGameState(current =>
                                                current
                                                    ? { ...current, rotation: 180 }
                                                    : current
                                            )
                                        }
                                    >
                                        180°
                                    </button>

                                    <button
                                        onClick={() =>
                                            setGameState(current =>
                                                current
                                                    ? { ...current, rotation: 270 }
                                                    : current
                                            )
                                        }
                                    >
                                        270°
                                    </button>
                                </div>
                            )}
                        </div>
                    </section>

                    {/* RIGHT COLUMN: GAME INFORMATION */}

                    <aside className="game-sidebar">

                        {gameId && (
                            <section className="session-panel">
                                <div className="session-header">
                                    <div className="game-id-text">
                                        <span>Game ID</span>
                                        <strong>{gameId}</strong>
                                    </div>

                                    <div className="session-actions">
                                        {canOfferDraw && (
                                            <button
                                                className="offer-draw-button"
                                                onClick={handleDrawOffer}
                                            >
                                                Offer Draw
                                            </button>
                                        )}

                                        <button
                                            className="leave-game-button"
                                            onClick={handleLeaveGame}
                                        >
                                            Leave Game
                                        </button>
                                    </div>
                                </div>

                                <div className="session-center">
                                    <div
                                        className={`turn-piece ${gameState.turn}`}
                                        aria-label={`${gameState.turn} pawn`}
                                    >
                                        {gameState.turn === "white" ? "♙" : "♟"}
                                    </div>

                                    <div className="session-status-details">
                                        <strong>
                                            {gameState.turn === "white"
                                                ? "White to move"
                                                : "Black to move"}
                                        </strong>

                                        <span>
                                            {gameState.status === "playing"
                                                ? "Game in progress"
                                                : gameState.status === "check"
                                                    ? "Check"
                                                    : gameState.status.replace(/_/g, " ")}
                                        </span>

                                        <span className={`connection-indicator ${connectionStatus}`}>
                                            <span className="connection-dot" />
                                            {connectionStatus}
                                        </span>
                                    </div>
                                </div>

                                {playerColor && (
                                    <div className="session-player">
                                        Playing as: <strong>{playerColor}</strong>
                                    </div>
                                )}

                                <div className="game-info">
                                    <span>
                                        Rotation: <strong>{gameState.rotation}°</strong>
                                    </span>

                                    <span>
                                        Completed rounds:{" "}
                                        <strong>{gameState.completedRounds}</strong>
                                    </span>
                                </div>
                            </section>
                        )}

                        {/* Draw controls */}

                        {canClaimDraw && (
                            <div className="draw-controls">
                                <button onClick={handleDrawClaim}>
                                    Claim Draw (Threefold Repetition / 50-Move Rule)
                                </button>
                            </div>
                        )}

                        {canRespondToDraw && (
                            <div className="draw-response">
                                <p>
                                    Your opponent has offered a draw.
                                </p>

                                <button onClick={handleAcceptDraw}>
                                    Accept Draw
                                </button>

                                <button onClick={handleDeclineDraw}>
                                    Decline Draw
                                </button>
                            </div>
                        )}

                        {/* Final game result */}

                        {isGameOver && endAnimationPhase === "complete" && (
                            <div className="end-result-panel">
                                <strong>{resultMessage}</strong>
                                <span>{resultDetail}</span>
                            </div>
                        )}

                    </aside>

                    {/* Promotion dialog */}

                    {promotionSquare && (
                        <PromotionDialog
                            onSelect={handlePromotion}
                        />
                    )}

                </div>
            )}
        </main>
    );
}

export default App;