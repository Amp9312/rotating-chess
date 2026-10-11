
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
    PlayerRole,
    PromotionPiece,
    Square,
} from "../src/types";

import type {
    ClientMessage,
    ServerMessage,
} from "../src/game/protocol";

interface RoomRecord {
    gameId: string;
    gameState: GameState;
    whiteToken: string;
    blackToken: string;
    spectatorTokens: string[];
    pendingPromotion: {
        square: Square;
        color: Color;
    } | null;
}

interface ConnectionAttachment {
    role: PlayerRole;
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
        const room = await this.ctx.storage.get<RoomRecord>(
            ROOM_STORAGE_KEY
        );

        return room ?? null;
    }

    private async saveRoom(room: RoomRecord): Promise<void> {
        await this.ctx.storage.put(ROOM_STORAGE_KEY, room);
    }

    async fetch(request: Request): Promise<Response> {
        const url = new URL(request.url);

        if (
            request.method === "POST" &&
            url.pathname === "/internal/create"
        ) {
            return this.createRoom(request);
        }

        if (
            request.method === "POST" &&
            url.pathname === "/internal/join"
        ) {
            return this.joinRoom(request);
        }

        if (
            request.method === "GET" &&
            url.pathname === "/connect"
        ) {
            return this.connectWebSocket(request);
        }

        return new Response("Not found", { status: 404 });
    }

    private async createRoom(request: Request): Promise<Response> {
        let body: CreateRoomRequest;

        try {
            body = await request.json() as CreateRoomRequest;
        } catch {
            return Response.json(
                { error: "Invalid request body." },
                { status: 400 }
            );
        }

        if (
            typeof body.gameId !== "string" ||
            typeof body.playerToken !== "string" ||
            !body.gameId ||
            !body.playerToken
        ) {
            return Response.json(
                { error: "Missing game ID or player token." },
                { status: 400 }
            );
        }

        const existingRoom = await this.getRoom();

        if (existingRoom) {
            return Response.json(
                { error: "Game already exists." },
                { status: 409 }
            );
        }

        const room: RoomRecord = {
            gameId: body.gameId,
            gameState: structuredClone(initialGameState),
            whiteToken: body.playerToken,
            blackToken: "",
            spectatorTokens: [],
            pendingPromotion: null,
        };

        await this.saveRoom(room);

        return Response.json({
            gameId: room.gameId,
            sessionToken: body.playerToken,
            role: "player",
            color: "white",
        });
    }

    private async joinRoom(request: Request): Promise<Response> {
        let body: JoinRoomRequest;

        try {
            body = await request.json() as JoinRoomRequest;
        } catch {
            return Response.json(
                { error: "Invalid request body." },
                { status: 400 }
            );
        }

        if (
            typeof body.playerToken !== "string" ||
            !body.playerToken
        ) {
            return Response.json(
                { error: "Missing player token." },
                { status: 400 }
            );
        }

        const room = await this.getRoom();

        if (!room) {
            return Response.json(
                { error: "Game does not exist." },
                { status: 404 }
            );
        }

        // The second session becomes Black.
        if (!room.blackToken) {
            room.blackToken = body.playerToken;

            await this.saveRoom(room);

            return Response.json({
                gameId: room.gameId,
                sessionToken: body.playerToken,
                role: "player",
                color: "black",
            });
        }

        // All subsequent sessions become spectators.
        room.spectatorTokens.push(body.playerToken);

        await this.saveRoom(room);

        return Response.json({
            gameId: room.gameId,
            sessionToken: body.playerToken,
            role: "spectator",
            color: null,
        });
    }

    private async connectWebSocket(
        request: Request
    ): Promise<Response> {
        if (
            request.headers.get("Upgrade")?.toLowerCase() !==
            "websocket"
        ) {
            return new Response(
                "Expected WebSocket upgrade.",
                { status: 426 }
            );
        }

        const room = await this.getRoom();

        if (!room) {
            return Response.json(
                { error: "Game does not exist." },
                { status: 404 }
            );
        }

        const pair = new WebSocketPair();
        const client = pair[0];
        const server = pair[1];

        this.ctx.acceptWebSocket(server);

        // No player identity is assigned until authentication succeeds.
        server.serializeAttachment({
            role: "spectator",
            color: null,
        } satisfies ConnectionAttachment);

        return new Response(null, {
            status: 101,
            webSocket: client,
        });
    }

    webSocketMessage(
        ws: WebSocket,
        message: string | ArrayBuffer
    ): void {
        void this.handleWebSocketMessage(ws, message);
    }

    private async handleWebSocketMessage(
        ws: WebSocket,
        message: string | ArrayBuffer
    ): Promise<void> {
        if (typeof message !== "string") {
            this.sendError(
                ws,
                "Binary WebSocket messages are not supported."
            );
            return;
        }

        let parsed: unknown;

        try {
            parsed = JSON.parse(message);
        } catch {
            this.sendError(ws, "Invalid JSON message.");
            return;
        }

        if (!this.isClientMessage(parsed)) {
            this.sendError(ws, "Invalid game message.");
            return;
        }

        // Authentication must happen before any game action.
        if (parsed.type === "authenticate") {
            await this.authenticate(ws, parsed.token);
            return;
        }

        const attachment =
            ws.deserializeAttachment() as
                ConnectionAttachment | null;

        if (!attachment) {
            this.sendError(ws, "You must authenticate first.");
            return;
        }

        // Enforce spectator restrictions on the server.
        if (attachment.role !== "player") {
            this.sendError(ws, "Spectators cannot make moves.");
            return;
        }

        if (!attachment.color) {
            this.sendError(ws, "You must authenticate first.");
            return;
        }

        if (parsed.type === "move") {
            await this.handleMove(
                ws,
                attachment.color,
                parsed.from,
                parsed.to
            );
            return;
        }

        if (parsed.type === "promote") {
            await this.handlePromotion(
                ws,
                attachment.color,
                parsed.piece
            );
        }
    }

    private async authenticate(
        ws: WebSocket,
        token: string
    ): Promise<void> {
        const room = await this.getRoom();

        if (!room) {
            this.sendError(ws, "Game does not exist.");
            return;
        }

        let role: PlayerRole;
        let color: Color | null;

        if (token === room.whiteToken) {
            role = "player";
            color = "white";
        } else if (
            room.blackToken &&
            token === room.blackToken
        ) {
            role = "player";
            color = "black";
        } else if (room.spectatorTokens.includes(token)) {
            role = "spectator";
            color = null;
        } else {
            this.sendError(ws, "Invalid authentication token.");
            return;
        }

        // Store the actual identity, including null for spectators.
        ws.serializeAttachment({
            role,
            color,
        } satisfies ConnectionAttachment);

        this.send(ws, {
            type: "authenticated",
            role,
            color,
            gameState: room.gameState,
        });
    }

    private async handleMove(
        ws: WebSocket,
        color: Color,
        from: Square,
        to: Square
    ): Promise<void> {
        const room = await this.getRoom();

        if (!room) {
            this.sendError(ws, "Game does not exist.");
            return;
        }

        if (room.gameState.turn !== color) {
            this.sendError(ws, "It is not your turn.");
            return;
        }

        if (
            room.gameState.status === "checkmate" ||
            room.gameState.status === "stalemate" ||
            room.gameState.status === "draw"
        ) {
            this.sendError(ws, "The game has ended.");
            return;
        }

        if (room.pendingPromotion) {
            this.sendError(
                ws,
                "Finish pawn promotion first."
            );
            return;
        }

        const result = makeMove(
            room.gameState,
            from,
            to
        );

        if (result.type === "invalid") {
            this.sendError(ws, "Illegal move.");
            return;
        }

        room.gameState = result.gameState;

        if (result.type === "promotion") {
            room.pendingPromotion = {
                square: result.square,
                color,
            };

            await this.saveRoom(room);

            this.broadcast({
                type: "promotion_required",
                square: result.square,
                color,
                gameState: room.gameState,
            });

            return;
        }

        room.gameState = {
            ...room.gameState,
            status: getGameStatus(room.gameState),
        };

        await this.saveRoom(room);

        this.broadcast({
            type: "game_state",
            gameState: room.gameState,
        });
    }

    private async handlePromotion(
        ws: WebSocket,
        color: Color,
        piece: PromotionPiece
    ): Promise<void> {
        const room = await this.getRoom();

        if (!room) {
            this.sendError(ws, "Game does not exist.");
            return;
        }

        if (!room.pendingPromotion) {
            this.sendError(
                ws,
                "No promotion is currently pending."
            );
            return;
        }

        if (room.pendingPromotion.color !== color) {
            this.sendError(
                ws,
                "You cannot complete this promotion."
            );
            return;
        }

        room.gameState = promotePawn(
            room.gameState,
            room.pendingPromotion.square,
            piece
        );

        room.gameState = {
            ...room.gameState,
            status: getGameStatus(room.gameState),
        };

        room.pendingPromotion = null;

        await this.saveRoom(room);

        this.broadcast({
            type: "game_state",
            gameState: room.gameState,
        });
    }

    webSocketClose(
        ws: WebSocket,
        code: number,
        reason: string,
        wasClean: boolean
    ): void {
        // Connection cleanup/reconnection will be implemented separately.
        void ws;
        void code;
        void reason;
        void wasClean;
    }

    private broadcast(message: ServerMessage): void {
        const encoded = JSON.stringify(message);

        for (const ws of this.ctx.getWebSockets()) {
            try {
                ws.send(encoded);
            } catch {
                // Ignore sockets that have already disconnected.
            }
        }
    }

    private send(
        ws: WebSocket,
        message: ServerMessage
    ): void {
        ws.send(JSON.stringify(message));
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

        const message = value as Record<string, unknown>;

        switch (message.type) {
            case "authenticate":
                return typeof message.token === "string";

            case "move":
                return (
                    typeof message.from === "string" &&
                    typeof message.to === "string"
                );

            case "promote":
                return (
                    message.piece === "queen" ||
                    message.piece === "rook" ||
                    message.piece === "bishop" ||
                    message.piece === "knight"
                );

            default:
                return false;
        }
    }
}
