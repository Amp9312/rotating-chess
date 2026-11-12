import type {
    Color,
    PlayerRole,
} from "../types";

export interface GameSession {
    gameId: string;
    sessionToken: string;
    role: PlayerRole;
    color: Color | null;
}

const API_BASE = "";

const SESSION_KEY = "rotating-chess-session";

export function saveGameSession(
    session: GameSession
): void {
    sessionStorage.setItem(
        SESSION_KEY,
        JSON.stringify(session)
    );
}

export function loadGameSession(): GameSession | null {
    const stored = sessionStorage.getItem(SESSION_KEY);

    if (!stored) return null;

    try {
        return JSON.parse(stored) as GameSession;
    } catch {
        sessionStorage.removeItem(SESSION_KEY);
        return null;
    }
}

export function clearGameSession(): void {
    sessionStorage.removeItem(SESSION_KEY);
}

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
