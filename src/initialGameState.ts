import { initialPosition } from "./initialPosition";
import type { GameState } from "./types";
import { getPositionKey } from "./game/draw";

export const initialGameState: GameState = {
    pieces: initialPosition,
    turn: "white",
    rotation: 0,
    completedRounds: 0,
    status: "playing",
    lastMove: null,
    halfMoveClock: 0,
    positionHistory: [],
    drawOffer: null,
};

initialGameState.positionHistory = [
    getPositionKey(initialGameState),
];