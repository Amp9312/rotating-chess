import { describe, expect, it } from "vitest";

import {
    files,
    ranks,
} from "../src/game/coordinates";

import {
    logicalToPhysical,
    physicalToLogical,
    physicalToSquare,
    squareToPhysical,
} from "../src/game/rotation";

import type {
    Rotation,
    Square,
} from "../src/types";


const rotations: Rotation[] = [
    0,
    90,
    180,
    270,
];


describe("Board coordinate rotation", () => {

    it("converts every square to physical coordinates and back", () => {

        for (const rotation of rotations) {

            for (const file of files) {

                for (const rank of ranks) {

                    const square =
                        `${file}${rank}` as Square;

                    const physical =
                        squareToPhysical(
                            square,
                            rotation
                        );

                    const restored =
                        physicalToSquare(
                            physical,
                            rotation
                        );

                    expect(restored).toBe(square);
                }
            }
        }
    });


    it("converts every coordinate to physical coordinates and back", () => {

        for (const rotation of rotations) {

            for (let fileIndex = 0; fileIndex < 8; fileIndex++) {

                for (let rankIndex = 0; rankIndex < 8; rankIndex++) {

                    const physical =
                        logicalToPhysical(
                            {
                                fileIndex,
                                rankIndex,
                            },
                            rotation
                        );

                    const restored =
                        physicalToLogical(
                            physical,
                            rotation
                        );

                    expect(restored).toEqual({
                        fileIndex,
                        rankIndex,
                    });
                }
            }
        }
    });


    it("keeps coordinates unchanged at rotation 0", () => {

        const coordinate = {
            fileIndex: 3,
            rankIndex: 5,
        };

        expect(
            logicalToPhysical(
                coordinate,
                0
            )
        ).toEqual(coordinate);
    });


    it("rotates a square correctly at 180 degrees", () => {

        const physical =
            squareToPhysical(
                "a1",
                180
            );

        expect(physical).toEqual({
            fileIndex: 7,
            rankIndex: 0,
        });
    });


it("rotates a square correctly at 90 degrees", () => {

    const physical =
        squareToPhysical(
            "a1",
            90
        );

    expect(physical).toEqual({
        fileIndex: 0,
        rankIndex: 0,
    });
});


it("rotates a square correctly at 270 degrees", () => {

    const physical =
        squareToPhysical(
            "a1",
            270
        );

expect(physical).toEqual({
    fileIndex: 7,
    rankIndex: 7,
});
});

});