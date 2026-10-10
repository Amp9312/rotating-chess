import type {
    Color,
    GameState,
    PromotionPiece,
    Square,
} from "../types";

import type {
    ClientMessage,
    ServerMessage,
} from "../game/protocol";

export interface GameConnectionHandlers {
    onAuthenticated?: (
        color: Color,
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

    onError?: (
        message: string
    ) => void;

    onClose?: () => void;
}

export class GameConnection {
    private socket: WebSocket | null = null;

    private readonly gameId: string;
    private readonly playerToken: string;
    private readonly handlers: GameConnectionHandlers;

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
        if (
            this.socket &&
            this.socket.readyState !==
                WebSocket.CLOSED
        ) {
            return;
        }

        const protocol =
            window.location.protocol ===
            "https:"
                ? "wss:"
                : "ws:";

        const socketUrl =
            `${protocol}//${window.location.host}` +
            `/api/games/${encodeURIComponent(this.gameId)}/connect`;

        const socket =
            new WebSocket(socketUrl);

        this.socket = socket;

        socket.addEventListener(
            "open",
            () => {
                this.send({
                    type: "authenticate",
                    token: this.playerToken,
                });
            }
        );

        socket.addEventListener(
            "message",
            event => {
                this.handleMessage(
                    event.data
                );
            }
        );

        socket.addEventListener(
            "close",
            () => {
                this.socket = null;
                this.handlers.onClose?.();
            }
        );

        socket.addEventListener(
            "error",
            () => {
                this.handlers.onError?.(
                    "WebSocket connection failed."
                );
            }
        );
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

    close(): void {
        this.socket?.close();
        this.socket = null;
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
            this.socket.readyState !==
                WebSocket.OPEN
        ) {
            throw new Error(
                "WebSocket is not connected."
            );
        }

        this.socket.send(
            JSON.stringify(message)
        );
    }

    private handleMessage(
        rawData: unknown
    ): void {
        let message: ServerMessage;

        try {
            message =
                JSON.parse(
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
                    message.color,
                    message.gameState
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
                // We can add a handler for this
                // when the lobby UI needs it.
                break;

            default:
                this.handlers.onError?.(
                    "Received unknown server message."
                );
        }
    }
}
