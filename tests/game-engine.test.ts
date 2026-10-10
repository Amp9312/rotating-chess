import {
    describe,
    expect,
    it,
} from "vitest";

import {
    initialGameState,
} from "../src/initialGameState";

import {
    getLegalMoves,
    makeMove,
} from "../src/game/rules";

import type {
    GameState,
} from "../src/types";


describe("Rotating Chess game engine", () => {

    it(
        "allows White to move the e2 pawn to e4",
        () => {

            const pawn =
                initialGameState.pieces.find(
                    (piece) =>
                        piece.square === "e2"
                );

            expect(pawn).toBeDefined();

            if (!pawn) {
                return;
            }

            const legalMoves =
                getLegalMoves(
                    pawn,
                    initialGameState
                );

            expect(
                legalMoves
            ).toContain("e4");

        }
    );


    it(
        "changes the turn after a legal move",
        () => {

            const result =
                makeMove(
                    initialGameState,
                    "e2",
                    "e4"
                );

            expect(result.type).toBe("move");

            if (result.type !== "move") {
                return;
            }

            expect(
                result.gameState.turn
            ).toBe("black");

            expect(
                result.gameState.pieces.some(
                    (piece) =>
                        piece.square === "e4" &&
                        piece.color === "white" &&
                        piece.type === "pawn"
                )
            ).toBe(true);

        }
    );


    it(
        "rejects an illegal pawn move",
        () => {

            const result =
                makeMove(
                    initialGameState,
                    "e2",
                    "e5"
                );

            expect(
                result.type
            ).toBe("invalid");

        }
    );


    it(
        "does not modify the original game state",
        () => {

            const originalState =
                structuredClone(
                    initialGameState
                );

            makeMove(
                initialGameState,
                "e2",
                "e4"
            );

            expect(
                initialGameState
            ).toEqual(
                originalState
            );

        }
    );


    it(
        "rotates the board after five completed rounds",
        () => {

            const stateBeforeMove: GameState = {
                ...initialGameState,

                turn: "black",

                completedRounds: 4,

                rotation: 0,
            };

            const result =
                makeMove(
                    stateBeforeMove,
                    "e7",
                    "e5"
                );

            expect(
                result.type
            ).toBe("move");

            if (result.type !== "move") {
                return;
            }

            expect(
                result.gameState.completedRounds
            ).toBe(5);

            expect(
                result.gameState.rotation
            ).toBe(90);

            expect(
                result.gameState.turn
            ).toBe("white");

        }
    );

});