import { DurableObject } from "cloudflare:workers";

import {
    getGameStatus,
    makeMove,
    promotePawn,
} from "../src/game/engine";

import { initialGameState } from "../src/initialGameState";

import type {
    Color,
    GameState,
    PromotionPiece,
    Square,
} from "../src/types";

import type {
    ClientMessage,
    ServerMessage,
} from "../src/game/protocol";


interface PendingPromotion {
    square: Square;
    color: Color;
}


interface RoomRecord {
    gameId: string;
    gameState: GameState;
    whiteToken: string;
    blackToken: string | null;
    pendingPromotion: PendingPromotion | null;
}


interface ConnectionAttachment {
    color: Color | null;
}


interface CreateRoomRequest {
    gameId: string;
    playerToken: string;
}


interface JoinRoomRequest {
    playerToken: string;
}


const ROOM_STORAGE_KEY = "room";


export class GameRoom extends DurableObject<Env> {

    private async getRoom(): Promise<RoomRecord | null> {

        const room =
            await this.ctx.storage.get<RoomRecord>(
                ROOM_STORAGE_KEY
            );

        return room ?? null;
    }


    private async saveRoom(
        room: RoomRecord
    ): Promise<void> {

        await this.ctx.storage.put(
            ROOM_STORAGE_KEY,
            room
        );
    }


    async fetch(
        request: Request
    ): Promise<Response> {

        const url =
            new URL(request.url);


        /*
         * Internal room creation.
         */
        if (
            request.method === "POST" &&
            url.pathname === "/internal/create"
        ) {
            return this.createRoom(request);
        }


        /*
         * Internal room joining.
         */
        if (
            request.method === "POST" &&
            url.pathname === "/internal/join"
        ) {
            return this.joinRoom(request);
        }


        /*
         * WebSocket connection.
         */
        if (
            request.method === "GET" &&
            url.pathname === "/connect"
        ) {
            return this.connectWebSocket(request);
        }


        return new Response(
            "Not found",
            {
                status: 404,
            }
        );
    }


    private async createRoom(
        request: Request
    ): Promise<Response> {

        const body =
            await request.json() as CreateRoomRequest;


        const existingRoom =
            await this.getRoom();


        if (existingRoom) {

            return Response.json(
                {
                    error: "Game already exists.",
                },
                {
                    status: 409,
                }
            );
        }


        const room: RoomRecord = {

            gameId:
                body.gameId,

            gameState:
                structuredClone(
                    initialGameState
                ),

            whiteToken:
                body.playerToken,

            blackToken:
                null,

            pendingPromotion:
                null,
        };


        await this.saveRoom(room);


        return Response.json({
            gameId: room.gameId,
            playerToken: body.playerToken,
            color: "white",
        });
    }


    private async joinRoom(
        request: Request
    ): Promise<Response> {

        const body =
            await request.json() as JoinRoomRequest;


        const room =
            await this.getRoom();


        if (!room) {

            return Response.json(
                {
                    error: "Game does not exist.",
                },
                {
                    status: 404,
                }
            );
        }


        if (room.blackToken) {

            return Response.json(
                {
                    error:
                        "Game already has two players.",
                },
                {
                    status: 409,
                }
            );
        }


        room.blackToken =
            body.playerToken;


        await this.saveRoom(room);


        this.broadcast({
            type: "player_joined",
            color: "black",
        });


        return Response.json({
            gameId: room.gameId,
            playerToken: body.playerToken,
            color: "black",
        });
    }


    private async connectWebSocket(
        request: Request
    ): Promise<Response> {

        if (
            request.headers
                .get("Upgrade")
                ?.toLowerCase() !== "websocket"
        ) {

            return new Response(
                "Expected WebSocket upgrade.",
                {
                    status: 426,
                }
            );
        }


        const room =
            await this.getRoom();


        if (!room) {

            return Response.json(
                {
                    error:
                        "Game does not exist.",
                },
                {
                    status: 404,
                }
            );
        }


        const pair =
            new WebSocketPair();


        const client =
            pair[0];

        const server =
            pair[1];


        this.ctx.acceptWebSocket(server);


        server.serializeAttachment({
            color: null,
        } satisfies ConnectionAttachment);


        return new Response(
            null,
            {
                status: 101,
                webSocket: client,
            }
        );
    }


    webSocketMessage(
        ws: WebSocket,
        message: string | ArrayBuffer
    ): void {

        void this.handleWebSocketMessage(
            ws,
            message
        );
    }


    private async handleWebSocketMessage(
        ws: WebSocket,
        message: string | ArrayBuffer
    ): Promise<void> {

        /*
         * We currently only accept JSON text messages.
         */
        if (
            typeof message !== "string"
        ) {

            this.sendError(
                ws,
                "Binary WebSocket messages are not supported."
            );

            return;
        }


        let parsed: unknown;


        try {

            parsed =
                JSON.parse(message);

        } catch {

            this.sendError(
                ws,
                "Invalid JSON message."
            );

            return;
        }


        if (
            !this.isClientMessage(parsed)
        ) {

            this.sendError(
                ws,
                "Invalid game message."
            );

            return;
        }


        /*
         * Authentication is handled before
         * any other game action.
         */
        if (
            parsed.type === "authenticate"
        ) {

            await this.authenticate(
                ws,
                parsed.token
            );

            return;
        }


const attachment = ws.deserializeAttachment() as
    ConnectionAttachment | null;


        if (
            !attachment?.color
        ) {

            this.sendError(
                ws,
                "You must authenticate first."
            );

            return;
        }


        if (
            parsed.type === "move"
        ) {

            await this.handleMove(
                ws,
                attachment.color,
                parsed.from,
                parsed.to
            );

            return;
        }


        if (
            parsed.type === "promote"
        ) {

            await this.handlePromotion(
                ws,
                attachment.color,
                parsed.piece
            );

            return;
        }
    }


    private async authenticate(
        ws: WebSocket,
        token: string
    ): Promise<void> {

        const room =
            await this.getRoom();


        if (!room) {

            this.sendError(
                ws,
                "Game does not exist."
            );

            return;
        }


        let color: Color | null =
            null;


        if (
            token === room.whiteToken
        ) {

            color = "white";

        } else if (
            room.blackToken &&
            token === room.blackToken
        ) {

            color = "black";
        }


        if (!color) {

            this.sendError(
                ws,
                "Invalid player token."
            );

            return;
        }


        ws.serializeAttachment({
            color,
        } satisfies ConnectionAttachment);


        this.send(ws, {
            type: "authenticated",
            color,
            gameState:
                room.gameState,
        });
    }


    private async handleMove(
        ws: WebSocket,
        color: Color,
        from: Square,
        to: Square
    ): Promise<void> {

        const room =
            await this.getRoom();


        if (!room) {

            this.sendError(
                ws,
                "Game does not exist."
            );

            return;
        }


        /*
         * The server is authoritative.
         * A player can only move on their turn.
         */
        if (
            room.gameState.turn !== color
        ) {

            this.sendError(
                ws,
                "It is not your turn."
            );

            return;
        }


        /*
         * Do not allow moves after
         * the game has ended.
         */
        if (
            room.gameState.status ===
                "checkmate" ||
            room.gameState.status ===
                "stalemate" ||
            room.gameState.status ===
                "draw"
        ) {

            this.sendError(
                ws,
                "The game has ended."
            );

            return;
        }
        if (room.pendingPromotion) {
    this.sendError(
        ws,
        "Finish pawn promotion first."
    );
    return;
}

        /*
         * Use the existing chess engine.
         *
         * The engine's MoveResult is:
         *
         * invalid
         * move
         * promotion
         */
        const result =
            makeMove(
                room.gameState,
                from,
                to
            );


        /*
         * Illegal move.
         */
        if (
            result.type === "invalid"
        ) {

            this.sendError(
                ws,
                "Illegal move."
            );

            return;
        }


        /*
         * Both successful result types
         * contain the resulting GameState.
         */
        room.gameState =
            result.gameState;


        /*
         * Promotion requires another
         * client action before the move
         * is considered completely resolved.
         */
        if (
            result.type === "promotion"
        ) {

            room.pendingPromotion = {
                square:
                    result.square,

                color,
            };


            await this.saveRoom(room);


            this.broadcast({
                type:
                    "promotion_required",

                square:
                    result.square,

                color,

                gameState:
                    room.gameState,
            });


            return;
        }


        /*
         * Normal move.
         */
        room.gameState = {
            ...room.gameState,

            status:
                getGameStatus(
                    room.gameState
                ),
        };


        await this.saveRoom(room);


        this.broadcast({
            type:
                "game_state",

            gameState:
                room.gameState,
        });
    }


    private async handlePromotion(
        ws: WebSocket,
        color: Color,
        promotionPiece: PromotionPiece
    ): Promise<void> {

        const room =
            await this.getRoom();


        if (!room) {

            this.sendError(
                ws,
                "Game does not exist."
            );

            return;
        }


        const pending =
            room.pendingPromotion;


        if (!pending) {

            this.sendError(
                ws,
                "No promotion is currently pending."
            );

            return;
        }


        if (
            pending.color !== color
        ) {

            this.sendError(
                ws,
                "You cannot choose this promotion."
            );

            return;
        }


        room.gameState =
            promotePawn(
                room.gameState,
                pending.square,
                promotionPiece
            );


        room.gameState = {
            ...room.gameState,

            status:
                getGameStatus(
                    room.gameState
                ),
        };


        room.pendingPromotion =
            null;


        await this.saveRoom(room);


        this.broadcast({
            type:
                "game_state",

            gameState:
                room.gameState,
        });
    }


    webSocketClose(
        ws: WebSocket,
        code: number,
        reason: string,
        wasClean: boolean
    ): void {

        /*
         * The Durable Object manages
         * the WebSocket lifecycle.
         *
         * These values are intentionally
         * unused for now.
         */
        void ws;
        void code;
        void reason;
        void wasClean;
    }


    private broadcast(
        message: ServerMessage
    ): void {

        const encoded =
            JSON.stringify(message);


        for (
            const ws of
                this.ctx.getWebSockets()
        ) {

            try {

                ws.send(encoded);

            } catch {

                /*
                 * Ignore sockets that have
                 * already disconnected.
                 */
            }
        }
    }


    private send(
        ws: WebSocket,
        message: ServerMessage
    ): void {

        ws.send(
            JSON.stringify(message)
        );
    }


    private sendError(
        ws: WebSocket,
        message: string
    ): void {

        this.send(ws, {
            type: "error",
            message,
        });
    }


    private isClientMessage(
        value: unknown
    ): value is ClientMessage {

        if (
            typeof value !== "object" ||
            value === null ||
            !("type" in value)
        ) {

            return false;
        }


        const message =
            value as Record<
                string,
                unknown
            >;


        switch (message.type) {

            case "authenticate":

                return (
                    typeof message.token ===
                    "string"
                );


            case "move":

                return (
                    typeof message.from ===
                        "string" &&
                    typeof message.to ===
                        "string"
                );


            case "promote":

                return (
                    message.piece ===
                        "queen" ||
                    message.piece ===
                        "rook" ||
                    message.piece ===
                        "bishop" ||
                    message.piece ===
                        "knight"
                );


            default:

                return false;
        }
    }
}