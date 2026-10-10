import type { Color } from "../types";

export interface GameSession {
    gameId: string;
    playerToken: string;
    color: Color;
}

const API_BASE = "";

async function request<T>(
    url: string,
    options?: RequestInit
): Promise<T> {
    const response = await fetch(
        `${API_BASE}${url}`,
        {
            headers: {
                "Content-Type": "application/json",
                ...(options?.headers ?? {}),
            },
            ...options,
        }
    );

    if (!response.ok) {
        let message =
            `Request failed: ${response.status}`;

        try {
            const body =
                await response.json();

            if (
                body &&
                typeof body.error === "string"
            ) {
                message = body.error;
            }
        } catch {
            // Keep the HTTP status message.
        }

        throw new Error(message);
    }

    return response.json() as Promise<T>;
}

export async function createGame():
    Promise<GameSession> {
    return request<GameSession>(
        "/api/games",
        {
            method: "POST",
            body: JSON.stringify({}),
        }
    );
}

export async function joinGame(
    gameId: string
): Promise<GameSession> {
    return request<GameSession>(
        `/api/games/${encodeURIComponent(gameId)}/join`,
        {
            method: "POST",
            body: JSON.stringify({}),
        }
    );
}
