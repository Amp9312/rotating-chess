import type {
    Color,
    GameState,
    PlayerRole,
    PromotionPiece,
    Square,
} from "../types";

import type {
    ClientMessage,
    ServerMessage,
} from "../game/protocol";

export interface GameConnectionHandlers {
    onAuthenticated?: (
        role: PlayerRole,
        color: Color | null,
        gameState: GameState
    ) => void;

    onGameState?: (
        gameState: GameState
    ) => void;

    onPromotionRequired?: (
        square: Square,
        color: Color,
        gameState: GameState
    ) => void;

    onPlayerJoined?: (
        color: Color
    ) => void;

    onError?: (
        message: string
    ) => void;

    onConnectionStatus?: (
    status:
        | "connecting"
        | "connected"
        | "reconnecting"
        | "disconnected"
) => void;

    onClose?: () => void;
}


export class GameConnection {
    private socket: WebSocket | null = null;

    private readonly gameId: string;
    private readonly playerToken: string;
    private readonly handlers: GameConnectionHandlers;

    // Reconnection state
    private stopped = false;
    private hasAuthenticatedBefore = false;
    private retryCount = 0;
    private reconnectTimer: ReturnType<typeof setTimeout> | null = null;

    private readonly maxRetries = 10;

    constructor(
        gameId: string,
        playerToken: string,
        handlers: GameConnectionHandlers
    ) {
        this.gameId = gameId;
        this.playerToken = playerToken;
        this.handlers = handlers;
    }

    connect(): void {
        // Allow an explicit connect() call to start again
        // after a previous connection was stopped.
        this.stopped = false;

        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        if (
            this.socket &&
            this.socket.readyState !== WebSocket.CLOSED
        ) {
            return;
        }

        this.openSocket();
    }

    private openSocket(): void {
        if (this.stopped) return;

        this.handlers.onConnectionStatus?.(
            this.hasAuthenticatedBefore
                ? "reconnecting"
                : "connecting"
        );

        const protocol =
            window.location.protocol === "https:"
                ? "wss:"
                : "ws:";

        const socketUrl =
            `${protocol}//${window.location.host}` +
            `/api/games/${encodeURIComponent(this.gameId)}/connect`;

        let socket: WebSocket;

        try {
            socket = new WebSocket(socketUrl);
        } catch {
            this.scheduleReconnect();
            return;
        }

        this.socket = socket;

        socket.addEventListener("open", () => {
            // Ignore events from an obsolete socket.
            if (this.socket !== socket || this.stopped) {
                socket.close();
                return;
            }

            // Authenticate with the SAME session token.
            // Do not create or join another game.
            socket.send(
                JSON.stringify({
                    type: "authenticate",
                    token: this.playerToken,
                } satisfies ClientMessage)
            );
        });

        socket.addEventListener("message", event => {
            if (this.socket !== socket || this.stopped) {
                return;
            }

            this.handleMessage(event.data);
        });

        socket.addEventListener("close", event => {
            if (this.socket !== socket) return;

            this.socket = null;

            if (this.stopped) return;

            // The server may use this close code for
            // a rejected authentication token.
// Authentication failure: this session token is invalid.
if (event.code === 4003) {
    this.stopped = true;

    this.handlers.onConnectionStatus?.(
        "disconnected"
    );

    this.handlers.onError?.(
        "Your session token was rejected. Rejoin the game."
    );

    this.handlers.onClose?.();
    return;
}

// This session has connected from another location.
// Do not automatically reconnect this connection.
if (event.code === 4001) {
    this.stopped = true;

    this.handlers.onConnectionStatus?.(
        "disconnected"
    );

    this.handlers.onError?.(
        "This session connected from another tab or browser."
    );

    this.handlers.onClose?.();
    return;
}

            this.scheduleReconnect();
        });

        socket.addEventListener("error", () => {
            if (this.socket !== socket || this.stopped) {
                return;
            }

            this.handlers.onError?.(
                "WebSocket connection failed. Attempting to reconnect."
            );

            // The close event schedules the retry.
        });
    }

    private scheduleReconnect(): void {
        if (this.stopped || this.reconnectTimer !== null) {
            return;
        }

        if (this.retryCount >= this.maxRetries) {
            this.stopped = true;

            this.handlers.onConnectionStatus?.(
                "disconnected"
            );

            this.handlers.onError?.(
                "Could not reconnect after several attempts. Check your connection and try again."
            );

            this.handlers.onClose?.();
            return;
        }

        // 1s, 2s, 4s, 8s, then capped at 15s.
        const delay = Math.min(
            1000 * 2 ** this.retryCount,
            15000
        );

        this.retryCount += 1;

        this.handlers.onConnectionStatus?.(
            "reconnecting"
        );

        this.reconnectTimer = setTimeout(() => {
            this.reconnectTimer = null;
            this.openSocket();
        }, delay);
    }

    sendMove(
        from: Square,
        to: Square
    ): void {
        this.send({
            type: "move",
            from,
            to,
        });
    }

    promote(
        piece: PromotionPiece
    ): void {
        this.send({
            type: "promote",
            piece,
        });
    }

    sendDrawClaim(): void {
    this.send({
        type: "claim_draw",
    });
}

    sendDrawOffer(): void {
        this.send({
            type: "offer_draw",
        });
    }

    acceptDrawOffer(): void {
        this.send({
            type: "accept_draw",
        });
    }

    declineDrawOffer(): void {
        this.send({
            type: "decline_draw",
        });
    }

    close(): void {
        // This is an intentional disconnect, so don't retry.
        this.stopped = true;

        if (this.reconnectTimer !== null) {
            clearTimeout(this.reconnectTimer);
            this.reconnectTimer = null;
        }

        const socket = this.socket;
        this.socket = null;

        socket?.close(1000, "Client disconnected");

        this.handlers.onConnectionStatus?.(
            "disconnected"
        );

        this.handlers.onClose?.();
    }

    get readyState(): number {
        return (
            this.socket?.readyState ??
            WebSocket.CLOSED
        );
    }

    private send(
        message: ClientMessage
    ): void {
        if (
            !this.socket ||
            this.socket.readyState !== WebSocket.OPEN
        ) {
            throw new Error(
                "WebSocket is not connected."
            );
        }

        this.socket.send(JSON.stringify(message));
    }

    private handleMessage(rawData: unknown): void {
        let message: ServerMessage;

        try {
            message = JSON.parse(
                String(rawData)
            ) as ServerMessage;
        } catch {
            this.handlers.onError?.(
                "Received invalid server message."
            );

            return;
        }

        switch (message.type) {
            case "authenticated":
                this.handlers.onAuthenticated?.(
                    message.role,
                    message.color,
                    message.gameState
                );

                // A connection is only considered restored
                // after the server confirms authentication.
                this.hasAuthenticatedBefore = true;
                this.retryCount = 0;

                this.handlers.onConnectionStatus?.(
                    "connected"
                );
                break;

            case "game_state":
                this.handlers.onGameState?.(
                    message.gameState
                );
                break;

            case "promotion_required":
                this.handlers.onPromotionRequired?.(
                    message.square,
                    message.color,
                    message.gameState
                );
                break;

            case "error":
                this.handlers.onError?.(
                    message.message
                );
                break;

            case "player_joined":
                // Add a handler when the lobby UI needs it.
                break;

            default:
                this.handlers.onError?.(
                    "Received unknown server message."
                );
        }
    }
}

