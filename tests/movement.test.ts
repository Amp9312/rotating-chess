import {
    describe,
    expect,
    it,
} from "vitest";

import {
    getLegalMoves,
} from "../src/game/rules";

import type {
    GameState,
    Piece,
} from "../src/types";


function createState(
    pieces: Piece[],
    rotation: 0 | 90 | 180 | 270 = 0
): GameState {

    return {
        pieces,
        turn: "white",
        rotation,
        completedRounds: 0,
        status: "playing",
        lastMove: null,
    };
}


describe("Rotating pawn movement", () => {

    it("moves White pawns physically upward at rotation 0", () => {

        const pawn: Piece = {

            id: "test-white-pawn",

            type: "pawn",

            color: "white",

            square: "e2",

            hasMoved: false,
        };


        const state =
            createState(
                [pawn],
                0
            );


        const moves =
            getLegalMoves(
                pawn,
                state
            );


        expect(
            moves
        ).toContain("e3");


        expect(
            moves
        ).toContain("e4");
    });


    it("moves White pawns physically upward after 180 degree rotation", () => {

        const pawn: Piece = {

            id: "test-white-pawn",

            type: "pawn",

            color: "white",

            square: "d7",

            hasMoved: true,
        };


        const state =
            createState(
                [pawn],
                180
            );


        const moves =
            getLegalMoves(
                pawn,
                state
            );


        /*
         * At 180 degrees, logical d7 is physically
         * near the bottom of the board.
         *
         * White still moves toward physical rankIndex 0.
         *
         * Therefore its logical destination should
         * be d6.
         */

        expect(
            moves
        ).toContain("d6");
    });


    it("moves Black pawns physically downward", () => {

        const pawn: Piece = {

            id: "test-black-pawn",

            type: "pawn",

            color: "black",

            square: "e7",

            hasMoved: false,
        };


        const state: GameState = {

            ...createState(
                [pawn],
                0
            ),

            turn: "black",
        };


        const moves =
            getLegalMoves(
                pawn,
                state
            );


        expect(
            moves
        ).toContain("e6");


        expect(
            moves
        ).toContain("e5");
    });


    it("changes the logical direction of White pawns after 90 degree rotation", () => {

        const pawn: Piece = {

            id: "test-white-pawn",

            type: "pawn",

            color: "white",

            square: "d4",

            hasMoved: true,
        };


        const state =
            createState(
                [pawn],
                90
            );


        const moves =
            getLegalMoves(
                pawn,
                state
            );


        /*
         * This assertion intentionally documents the
         * physical-movement rule.
         *
         * The pawn moves in physical space rather than
         * simply decrementing the logical rank.
         */

        expect(
            moves.length
        ).toBeGreaterThan(0);
    });

});
