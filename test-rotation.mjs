import WebSocket from "ws";

import {
    squareToPhysical,
} from "./src/game/rotation.ts";

const BASE_URL = "http://localhost:8787";

let passed = 0;
let failed = 0;

function assert(condition, message) {
    if (!condition) {
        failed++;
        throw new Error(`FAIL: ${message}`);
    }

    passed++;
    console.log(`  ✓ ${message}`);
}

async function createGame() {
    const response = await fetch(
        `${BASE_URL}/api/games`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        }
    );

    if (!response.ok) {
        throw new Error(
            `Create game failed: ${response.status} ${await response.text()}`
        );
    }

    return response.json();
}

async function joinGame(gameId) {
    const response = await fetch(
        `${BASE_URL}/api/games/${gameId}/join`,
        {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
            },
            body: JSON.stringify({}),
        }
    );

    if (!response.ok) {
        throw new Error(
            `Join game failed: ${response.status} ${await response.text()}`
        );
    }

    return response.json();
}

function waitForMessage(
    ws,
    predicate,
    description,
    timeout = 3000
) {
    return new Promise((resolve, reject) => {
        const timer = setTimeout(() => {
            cleanup();

            reject(
                new Error(
                    `Timed out waiting for ${description}`
                )
            );
        }, timeout);

        function cleanup() {
            clearTimeout(timer);
            ws.off("message", handleMessage);
        }

        function handleMessage(data) {
            let message;

            try {
                message = JSON.parse(
                    data.toString()
                );
            } catch {
                return;
            }

            if (predicate(message)) {
                cleanup();
                resolve(message);
            }
        }

        ws.on("message", handleMessage);
    });
}

async function connectPlayer(
    gameId,
    token,
    expectedColor,
    name
) {
    const ws = new WebSocket(
        `ws://localhost:8787/api/games/${gameId}/connect`
    );

    await new Promise((resolve, reject) => {
        ws.once("open", resolve);
        ws.once("error", reject);
    });

    console.log(
        `  ✓ ${name} WebSocket connected`
    );

    ws.send(
        JSON.stringify({
            type: "authenticate",
            token,
        })
    );

    const authenticated =
        await waitForMessage(
            ws,
            message =>
                message.type === "authenticated",
            `${name} authentication`
        );

    assert(
        authenticated.color === expectedColor,
        `${name} authenticated as ${expectedColor}`
    );

    return {
        ws,
        initialState: authenticated.gameState,
    };
}

function findPiece(
    gameState,
    color,
    type,
    square
) {
    return gameState.pieces.find(
        piece =>
            piece.color === color &&
            piece.type === type &&
            piece.square === square
    );
}

/*
 * Send a move and wait for BOTH players
 * to receive the resulting game state.
 */
async function playMove(
    whiteSocket,
    blackSocket,
    playerSocket,
    from,
    to
) {
    const whiteUpdatePromise =
        waitForMessage(
            whiteSocket,
            message =>
                message.type === "game_state",
            `White game_state after ${from}-${to}`
        );

    const blackUpdatePromise =
        waitForMessage(
            blackSocket,
            message =>
                message.type === "game_state",
            `Black game_state after ${from}-${to}`
        );

    playerSocket.send(
        JSON.stringify({
            type: "move",
            from,
            to,
        })
    );

    const [
        whiteUpdate,
        blackUpdate,
    ] = await Promise.all([
        whiteUpdatePromise,
        blackUpdatePromise,
    ]);

    assert(
        JSON.stringify(
            whiteUpdate.gameState
        ) ===
            JSON.stringify(
                blackUpdate.gameState
            ),
        `Both players received identical state after ${from}-${to}`
    );

    return whiteUpdate.gameState;
}

async function main() {
    console.log(
        "\n=== Rotating Chess — Five Round Rotation Regression Test ===\n"
    );

    let whiteSocket = null;
    let blackSocket = null;

    try {
        // --------------------------------------------------
        // 1. Create game
        // --------------------------------------------------

        console.log("1. Creating game...");

        const white =
            await createGame();

        assert(
            typeof white.gameId ===
                "string",
            "Game was created"
        );

        // --------------------------------------------------
        // 2. Join game
        // --------------------------------------------------

        console.log("\n2. Joining game...");

        const black =
            await joinGame(
                white.gameId
            );

        assert(
            black.gameId ===
                white.gameId,
            "Black joined the same game"
        );

        // --------------------------------------------------
        // 3. Connect players
        // --------------------------------------------------

        console.log(
            "\n3. Connecting players..."
        );

        const whiteConnection =
            await connectPlayer(
                white.gameId,
                white.playerToken,
                "white",
                "WHITE"
            );

        const blackConnection =
            await connectPlayer(
                black.gameId,
                black.playerToken,
                "black",
                "BLACK"
            );

        whiteSocket =
            whiteConnection.ws;

        blackSocket =
            blackConnection.ws;

        let gameState =
            whiteConnection.initialState;

        assert(
            gameState.rotation === 0,
            "Game starts at rotation 0"
        );

        assert(
            gameState.completedRounds === 0,
            "Game starts with 0 completed rounds"
        );

        // --------------------------------------------------
        // Round 1
        // --------------------------------------------------

        console.log("\n4. Round 1");

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            whiteSocket,
            "e2",
            "e4"
        );

        assert(
            gameState.turn === "black",
            "After White's move, it is Black's turn"
        );

        assert(
            gameState.completedRounds === 0,
            "Round 1 is not complete after White moves"
        );

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            blackSocket,
            "e7",
            "e5"
        );

        assert(
            gameState.turn === "white",
            "After Black's move, it is White's turn"
        );

        assert(
            gameState.completedRounds === 1,
            "Completed rounds increased to 1"
        );

        assert(
            gameState.rotation === 0,
            "Board remains at rotation 0 after Round 1"
        );

        // --------------------------------------------------
        // Round 2
        // --------------------------------------------------

        console.log("\n5. Round 2");

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            whiteSocket,
            "g1",
            "f3"
        );

        assert(
            gameState.completedRounds === 1,
            "Completed rounds remains 1 after White's Round 2 move"
        );

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            blackSocket,
            "b8",
            "c6"
        );

        assert(
            gameState.completedRounds === 2,
            "Completed rounds increased to 2"
        );

        assert(
            gameState.rotation === 0,
            "Board remains at rotation 0 after Round 2"
        );

        // --------------------------------------------------
        // Round 3
        // --------------------------------------------------

        console.log("\n6. Round 3");

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            whiteSocket,
            "f1",
            "b5"
        );

        assert(
            gameState.completedRounds === 2,
            "Completed rounds remains 2 after White's Round 3 move"
        );

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            blackSocket,
            "a7",
            "a6"
        );

        assert(
            gameState.completedRounds === 3,
            "Completed rounds increased to 3"
        );

        assert(
            gameState.rotation === 0,
            "Board remains at rotation 0 after Round 3"
        );

        // --------------------------------------------------
        // Round 4
        // --------------------------------------------------

        console.log("\n7. Round 4");

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            whiteSocket,
            "b5",
            "a4"
        );

        assert(
            gameState.completedRounds === 3,
            "Completed rounds remains 3 after White's Round 4 move"
        );

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            blackSocket,
            "g8",
            "f6"
        );

        assert(
            gameState.completedRounds === 4,
            "Completed rounds increased to 4"
        );

        assert(
            gameState.rotation === 0,
            "Board remains at rotation 0 after Round 4"
        );

        // --------------------------------------------------
        // Round 5
        // --------------------------------------------------

        console.log("\n8. Round 5");

gameState = await playMove(
    whiteSocket,
    blackSocket,
    whiteSocket,
    "d2",
    "d3"
);

        assert(
            gameState.completedRounds === 4,
            "Completed rounds remains 4 after White's Round 5 move"
        );

        /*
         * This is the important move.
         *
         * Black's move should:
         *
         * 1. Be applied successfully.
         * 2. Complete Round 5.
         * 3. Trigger the 90° rotation.
         */

        gameState = await playMove(
            whiteSocket,
            blackSocket,
            blackSocket,
            "f8",
            "e7"
        );

        console.log(
            "\n9. Validating rotation..."
        );

        assert(
            gameState.completedRounds === 5,
            "Completed rounds reached 5"
        );

        assert(
            gameState.rotation === 90,
            "Board rotated to 90° after five completed rounds"
        );

        assert(
            gameState.rotation === 90,
            "Movement test begins with 90° rotation"
        );

        assert(
            gameState.turn === "white",
            "Turn returned to White after Black completed Round 5"
        );

        // --------------------------------------------------
// Movement after rotation
// --------------------------------------------------

console.log(
    "\n10. Testing movement after 90° rotation..."
);

assert(
    gameState.rotation === 90,
    "Post-rotation movement test starts at 90°"
);

const whitePawn =
    findPiece(
        gameState,
        "white",
        "pawn",
        "e4"
    );

assert(
    whitePawn !== undefined,
    "White e-pawn is still on logical e4"
);

const physicalPawnPosition =
    squareToPhysical(
        "e4",
        gameState.rotation
    );

assert(
    physicalPawnPosition.fileIndex === 3 &&
    physicalPawnPosition.rankIndex === 4,
    "Logical e4 corresponds to physical d4 at 90°"
);

gameState = await playMove(
    whiteSocket,
    blackSocket,
    whiteSocket,
    "e4",
    "e3"
);

assert(
    gameState.rotation === 90,
    "Rotation remains 90° after White's move"
);

assert(
    findPiece(
        gameState,
        "white",
        "pawn",
        "e3"
    ) !== undefined,
    "White pawn successfully moved e4-e3 after rotation"
);

assert(
    gameState.turn === "black",
    "Turn changed to Black after post-rotation move"
);

        // --------------------------------------------------
        // Verify final move survived rotation
        // --------------------------------------------------

        assert(
            gameState.lastMove !== null,
            "Final move is recorded"
        );

        assert(
            gameState.lastMove?.from === "f8",
            "Final move originated from f8"
        );

        assert(
            gameState.lastMove?.to === "e7",
            "Final move ended on e7"
        );

        assert(
            findPiece(
                gameState,
                "black",
                "bishop",
                "e7"
            ) !== undefined,
            "Black bishop remains on e7 after rotation"
        );

        // --------------------------------------------------
        // Verify pieces were NOT rewritten
        // --------------------------------------------------

        assert(
            findPiece(
                gameState,
                "white",
                "pawn",
                "e4"
            ) !== undefined,
            "White e-pawn still has logical square e4"
        );

        assert(
            findPiece(
                gameState,
                "black",
                "pawn",
                "e5"
            ) !== undefined,
            "Black e-pawn still has logical square e5"
        );

        // --------------------------------------------------
        // Finished
        // --------------------------------------------------

        console.log(
            "\n========================================"
        );

        if (failed === 0) {
            console.log(
                `PASS — ${passed} assertions succeeded.`
            );
        } else {
            console.log(
                `FAIL — ${failed} assertions failed.`
            );
        }

        console.log(
            "========================================\n"
        );
    } finally {
        if (whiteSocket) {
            whiteSocket.close();
        }

        if (blackSocket) {
            blackSocket.close();
        }
    }
}

main().catch(error => {
    console.error(
        "\n========================================"
    );

    console.error(
        "ROTATION REGRESSION TEST FAILED"
    );

    console.error(
        error.message
    );

    console.error(
        "========================================\n"
    );

    process.exitCode = 1;
});
