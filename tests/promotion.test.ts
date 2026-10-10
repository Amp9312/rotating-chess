import {
    describe,
    expect,
    it,
} from "vitest";

import {
    isPromotionSquare,
    promotePawn,
} from "../src/game/promotion";

import type {
    GameState,
    Piece,
} from "../src/types";


function createPawnState(
    square: "a1" | "a8",
    color: "white" | "black",
    rotation: 0 | 90 | 180 | 270
): GameState {

    const pawn: Piece = {

        id: `${color}-pawn-test`,

        type: "pawn",

        color,

        square,

        hasMoved: true,
    };


    return {

        pieces: [pawn],

        turn: color,

        rotation,

        completedRounds: 0,

        status: "playing",

        lastMove: null,
    };
}


describe("Pawn promotion", () => {

    it("promotes White on the physical top edge", () => {

        expect(
            isPromotionSquare(
                "a8",
                "white",
                0
            )
        ).toBe(true);
    });


    it("promotes Black on the physical bottom edge", () => {

        const state =
            createPawnState(
                "a1",
                "black",
                0
            );


        expect(
            isPromotionSquare(
                "a1",
                "black",
                0
            )
        ).toBe(true);
    });


    it("changes promotion behavior after rotation", () => {

        expect(
            isPromotionSquare(
                "a1",
                "white",
                180
            )
        ).toBe(true);


        expect(
            isPromotionSquare(
                "a8",
                "black",
                180
            )
        ).toBe(true);
    });


    it("changes a pawn into the selected piece", () => {

        const state =
            createPawnState(
                "a8",
                "white",
                0
            );


        const result =
            promotePawn(
                state,
                "a8",
                "queen"
            );


        const piece =
            result.pieces.find(
                (candidate) =>
                    candidate.square === "a8"
            );


        expect(
            piece?.type
        ).toBe("queen");
    });

});
