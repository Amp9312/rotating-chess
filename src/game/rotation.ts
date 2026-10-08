import type {
    Color,
    Rotation,
    Square,
} from "../types";

import {
    coordinatesToSquare,
    squareToCoordinates,
} from "./coordinates";

export interface Coordinate {
    fileIndex: number;
    rankIndex: number;
}

/**
 * Convert a logical board coordinate into its
 * current physical/display coordinate.
 *
 * Logical coordinates never change.
 * Physical coordinates change with board rotation.
 */
export function logicalToPhysical(
    coordinate: Coordinate,
    rotation: Rotation
): Coordinate {
    const {
        fileIndex,
        rankIndex,
    } = coordinate;

    switch (rotation) {
        case 0:
            return {
                fileIndex,
                rankIndex,
            };

        case 90:
            return {
                fileIndex: 7 - rankIndex,
                rankIndex: fileIndex,
            };

        case 180:
            return {
                fileIndex: 7 - fileIndex,
                rankIndex: 7 - rankIndex,
            };

        case 270:
            return {
                fileIndex: rankIndex,
                rankIndex: 7 - fileIndex,
            };
    }
}

/**
 * Convert a physical/display coordinate back into
 * the persistent logical board coordinate.
 *
 * This is the inverse of logicalToPhysical().
 */
export function physicalToLogical(
    coordinate: Coordinate,
    rotation: Rotation
): Coordinate {
    const {
        fileIndex,
        rankIndex,
    } = coordinate;

    switch (rotation) {
        case 0:
            return {
                fileIndex,
                rankIndex,
            };

        case 90:
            return {
                fileIndex: rankIndex,
                rankIndex: 7 - fileIndex,
            };

        case 180:
            return {
                fileIndex: 7 - fileIndex,
                rankIndex: 7 - rankIndex,
            };

        case 270:
            return {
                fileIndex: 7 - rankIndex,
                rankIndex: fileIndex,
            };
    }
}

/**
 * Convenience function:
 * logical square → physical coordinate.
 */
export function squareToPhysical(
    square: Square,
    rotation: Rotation
): Coordinate {
    return logicalToPhysical(
        squareToCoordinates(square),
        rotation
    );
}

/**
 * Convenience function:
 * physical coordinate → logical square.
 */
export function physicalToSquare(
    coordinate: Coordinate,
    rotation: Rotation
): Square {
    const logical =
        physicalToLogical(
            coordinate,
            rotation
        );

    return coordinatesToSquare(
        logical.fileIndex,
        logical.rankIndex
    );
}

/**
 * Move one physical square in a direction.
 *
 * Physical coordinates use:
 *
 *      ↑ = rankIndex - 1
 *      ↓ = rankIndex + 1
 *      ← = fileIndex - 1
 *      → = fileIndex + 1
 */
export function movePhysical(
    coordinate: Coordinate,
    fileOffset: number,
    rankOffset: number
): Coordinate | null {
    const fileIndex =
        coordinate.fileIndex + fileOffset;

    const rankIndex =
        coordinate.rankIndex + rankOffset;

    if (
        fileIndex < 0 ||
        fileIndex >= 8 ||
        rankIndex < 0 ||
        rankIndex >= 8
    ) {
        return null;
    }

    return {
        fileIndex,
        rankIndex,
    };
}

export function movePhysicalToSquare(
    square: Square,
    rotation: Rotation,
    fileOffset: number,
    rankOffset: number
): Square | null {
    const physical =
        squareToPhysical(
            square,
            rotation
        );

    const destination =
        movePhysical(
            physical,
            fileOffset,
            rankOffset
        );

    if (!destination) {
        return null;
    }

    return physicalToSquare(
        destination,
        rotation
    );
}

export function getNextRotation(
    rotation: Rotation
): Rotation {
    switch (rotation) {
        case 0:
            return 90;

        case 90:
            return 180;

        case 180:
            return 270;

        case 270:
            return 0;
    }
}