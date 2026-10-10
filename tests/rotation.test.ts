import {
    describe,
    expect,
    it,
} from "vitest";

import {
    files,
    ranks,
} from "../src/game/coordinates";

import {
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

    it(
        "converts every square back to itself",
        () => {

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

                        expect(restored).toBe(
                            square
                        );

                    }
                }
            }
        }
    );

});