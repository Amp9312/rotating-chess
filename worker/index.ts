import { GameRoom } from "./GameRoom";

export { GameRoom };



function jsonResponse(
    data: unknown,
    status = 200
): Response {

    return Response.json(
        data,
        { status }
    );
}


function getRoomStub(
    env: Env,
    gameId: string
) {
    const id = env.GAME_ROOM.idFromName(gameId);
    return env.GAME_ROOM.get(id);
}


function isValidGameId(
    gameId: string
): boolean {

    return /^[A-F0-9]{8}$/.test(gameId);
}


async function createGame(
    env: Env
): Promise<Response> {

    // Short room code for users to share.
    const gameId = crypto
        .randomUUID()
        .replace(/-/g, "")
        .slice(0, 8)
        .toUpperCase();

    // This is a bearer token. Treat it as a secret.
    const playerToken = crypto.randomUUID();

    const room = getRoomStub(
        env,
        gameId
    );

    const response = await room.fetch(
        "https://game-room.internal/internal/create",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                gameId,
                playerToken,
            }),
        }
    );

    if (!response.ok) {
        return response;
    }

    return response;
}


async function joinGame(
    env: Env,
    gameId: string
): Promise<Response> {

    if (!isValidGameId(gameId)) {
        return jsonResponse(
            { error: "Invalid game ID" },
            400
        );
    }

    const playerToken = crypto.randomUUID();

    const room = getRoomStub(
        env,
        gameId
    );

    return room.fetch(
        "https://game-room.internal/internal/join",
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                playerToken,
            }),
        }
    );
}


export default {
    async fetch(
        request: Request,
        env: Env
    ): Promise<Response> {

        const url = new URL(request.url);
        const path = url.pathname;

        try {

            // Health check.
            if (
                request.method === "GET" &&
                path === "/api/health"
            ) {
                return jsonResponse({
                    status: "ok",
                    application: "rotating-chess",
                    service: "cloudflare-worker",
                });
            }


            // Create a game.
            if (
                request.method === "POST" &&
                path === "/api/games"
            ) {
                return createGame(env);
            }


            // Join an existing game.
            const joinMatch =
                path.match(
                    /^\/api\/games\/([A-Fa-f0-9]{8})\/join$/
                );

            if (
                request.method === "POST" &&
                joinMatch
            ) {
                return joinGame(
                    env,
                    joinMatch[1].toUpperCase()
                );
            }


            // Connect to a room using WebSockets.
            const connectMatch =
                path.match(
                    /^\/api\/games\/([A-Fa-f0-9]{8})\/connect$/
                );

            if (
                request.method === "GET" &&
                connectMatch
            ) {

                if (
                    url.search.length > 2048
                ) {
                    return jsonResponse(
                        { error: "Invalid connection URL" },
                        400
                    );
                }

                if (
                    request.headers.get("Upgrade")?.toLowerCase() !==
                    "websocket"
                ) {
                    return jsonResponse(
                        {
                            error: "Expected WebSocket upgrade",
                        },
                        426
                    );
                }

                const gameId =
                    connectMatch[1].toUpperCase();

                const room = getRoomStub(
                    env,
                    gameId
                );

                const internalUrl = new URL(request.url);
internalUrl.pathname = "/connect";

return room.fetch(
    new Request(internalUrl, request)
);
            }


            if (path.startsWith("/api/")) {
                return jsonResponse(
                    { error: "API endpoint not found" },
                    404
                );
            }


            // Static assets and the React SPA are handled
            // by Cloudflare's asset routing.
            return new Response(
                "Not found",
                { status: 404 }
            );

        } catch (error) {

            console.error(
                "Worker request failed:",
                error
            );

            return jsonResponse(
                { error: "Internal server error" },
                500
            );
        }
    },
} satisfies ExportedHandler<Env>;
