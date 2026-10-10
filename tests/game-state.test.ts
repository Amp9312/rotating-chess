import {
    describe,
    expect,
    it,
} from "vitest";

import {
    initialGameState,
} from "../src/initialGameState";

import type {
    GameState,
} from "../src/types";


describe("GameState serialization", () => {

    it("can be serialized and restored without changing", () => {

        const serialized =
            JSON.stringify(
                initialGameState
            );

        const restored =
            JSON.parse(
                serialized
            ) as GameState;

        expect(
            restored
        ).toEqual(
            initialGameState
        );
    });


    it("preserves rotation", () => {

        const state: GameState = {

            ...initialGameState,

            rotation: 180,

        };


        const restored =
            JSON.parse(
                JSON.stringify(state)
            ) as GameState;


        expect(
            restored.rotation
        ).toBe(180);
    });


    it("preserves the last move", () => {

        const state: GameState = {

            ...initialGameState,

            lastMove: {

                pieceId: "white-pawn-e2",

                from: "e2",

                to: "e4",

            },

        };


        const restored =
            JSON.parse(
                JSON.stringify(state)
            ) as GameState;


        expect(
            restored.lastMove
        ).toEqual(
            state.lastMove
        );
    });

});
