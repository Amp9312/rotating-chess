import {
    describe,
    expect,
    it,
} from "vitest";

import {
    initialGameState,
} from "../src/initialGameState";

import {
    makeMove,
} from "../src/game/rules";

import type {
    GameState,
} from "../src/types";


function move(
    state: GameState,
    from: any,
    to: any
): GameState {

    const result =
        makeMove(
            state,
            from,
            to
        );

    expect(
        result.type
    ).toBe("move");

    if (result.type !== "move") {
        throw new Error(
            `Expected ${from} → ${to} to be legal`
        );
    }

    return result.gameState;
}


describe("Special chess rules", () => {

    it("supports en passant", () => {

        let state =
            initialGameState;


        state =
            move(
                state,
                "e2",
                "e4"
            );


        state =
            move(
                state,
                "a7",
                "a6"
            );


        state =
            move(
                state,
                "e4",
                "e5"
            );


        state =
            move(
                state,
                "d7",
                "d5"
            );


        const result =
            makeMove(
                state,
                "e5",
                "d6"
            );


        expect(
            result.type
        ).toBe("move");


        if (result.type !== "move") {
            return;
        }


        expect(
            result.gameState.pieces.some(
                (piece) =>
                    piece.square === "d6" &&
                    piece.color === "white" &&
                    piece.type === "pawn"
            )
        ).toBe(true);


        expect(
            result.gameState.pieces.some(
                (piece) =>
                    piece.square === "d5" &&
                    piece.color === "black"
            )
        ).toBe(false);
    });


    it("supports kingside castling", () => {

        let state: GameState = {

            ...initialGameState,

            pieces:
                initialGameState.pieces.filter(
                    (piece) =>
                        ![
                            "white-pawn-f2",
                            "white-pawn-g2",
                            "white-bishop-f1",
                            "white-knight-g1",
                        ].includes(piece.id)
                ),
        };


        state =
            move(
                state,
                "e1",
                "g1"
            );


        expect(
            state.pieces.some(
                (piece) =>
                    piece.type === "king" &&
                    piece.color === "white" &&
                    piece.square === "g1"
            )
        ).toBe(true);


        expect(
            state.pieces.some(
                (piece) =>
                    piece.type === "rook" &&
                    piece.color === "white" &&
                    piece.square === "f1"
            )
        ).toBe(true);
    });

});
