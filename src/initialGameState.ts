import { initialPosition } from "./initialPosition";
import type { GameState } from "./types";

export const initialGameState: GameState = {
    pieces: initialPosition,
    turn: "white",
    rotation: 0,
    completedRounds: 0,
    status: "playing",
};