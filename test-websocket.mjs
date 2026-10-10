import WebSocket from "ws";

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

function validateInitialState(
    gameState
) {
    assert(
        gameState.pieces.length === 32,
        "Initial position contains 32 pieces"
    );

    assert(
        gameState.turn === "white",
        "Initial turn is White"
    );

    assert(
        gameState.rotation === 0,
        "Initial rotation is 0"
    );

    assert(
        gameState.completedRounds === 0,
        "Initial completed rounds is 0"
    );

    assert(
        gameState.status === "playing",
        "Initial game status is playing"
    );

    assert(
        gameState.lastMove === null,
        "Initial lastMove is null"
    );

    assert(
        findPiece(
            gameState,
            "white",
            "king",
            "e1"
        ) !== undefined,
        "White king starts on e1"
    );

    assert(
        findPiece(
            gameState,
            "black",
            "king",
            "e8"
        ) !== undefined,
        "Black king starts on e8"
    );

    assert(
        findPiece(
            gameState,
            "white",
            "pawn",
            "e2"
        ) !== undefined,
        "White e-pawn starts on e2"
    );
}

function validateMoveState(
    gameState
) {
    const pawn =
        findPiece(
            gameState,
            "white",
            "pawn",
            "e4"
        );

    assert(
        pawn !== undefined,
        "White e-pawn moved to e4"
    );

    assert(
        pawn?.hasMoved === true,
        "White e-pawn is marked as moved"
    );

    assert(
        gameState.turn === "black",
        "Turn changed to Black"
    );

    assert(
        gameState.rotation === 0,
        "Rotation remains 0"
    );

    assert(
        gameState.completedRounds === 0,
        "Completed rounds remains 0"
    );

    assert(
        gameState.status === "playing",
        "Game remains in playing state"
    );

    assert(
        gameState.lastMove !== null,
        "lastMove is populated"
    );

    assert(
        gameState.lastMove?.from === "e2",
        "lastMove.from is e2"
    );

    assert(
        gameState.lastMove?.to === "e4",
        "lastMove.to is e4"
    );

    assert(
        gameState.lastMove?.pieceId ===
            "white-pawn-e2",
        "lastMove identifies the e-pawn"
    );
}

async function main() {
    console.log(
        "\n=== Rotating Chess WebSocket Regression Test ===\n"
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
            /^[A-F0-9]{8}$/.test(
                white.gameId
            ),
            "Game ID has valid format"
        );

        assert(
            typeof white.playerToken ===
                "string",
            "White received player token"
        );

        assert(
            white.color === "white",
            "Creator is assigned White"
        );

        console.log(
            `  Game ID: ${white.gameId}`
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

        assert(
            typeof black.playerToken ===
                "string",
            "Black received player token"
        );

        assert(
            black.playerToken !==
                white.playerToken,
            "White and Black have different tokens"
        );

        assert(
            black.color === "black",
            "Joiner is assigned Black"
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

        // --------------------------------------------------
        // 4. Validate initial state
        // --------------------------------------------------

        console.log(
            "\n4. Validating initial state..."
        );

        assert(
            JSON.stringify(
                whiteConnection.initialState
            ) ===
                JSON.stringify(
                    blackConnection.initialState
                ),
            "White and Black received identical initial game state"
        );

        validateInitialState(
            whiteConnection.initialState
        );

        // --------------------------------------------------
        // 5. White makes a move
        // --------------------------------------------------

        console.log(
            "\n5. White plays e2-e4..."
        );

        const whiteGameStatePromise =
            waitForMessage(
                whiteSocket,
                message =>
                    message.type ===
                    "game_state",
                "White game_state update"
            );

        const blackGameStatePromise =
            waitForMessage(
                blackSocket,
                message =>
                    message.type ===
                    "game_state",
                "Black game_state update"
            );

        whiteSocket.send(
            JSON.stringify({
                type: "move",
                from: "e2",
                to: "e4",
            })
        );

        const [
            whiteUpdate,
            blackUpdate,
        ] = await Promise.all([
            whiteGameStatePromise,
            blackGameStatePromise,
        ]);

        assert(
            whiteUpdate.type ===
                "game_state",
            "White received game_state"
        );

        assert(
            blackUpdate.type ===
                "game_state",
            "Black received game_state"
        );

        // --------------------------------------------------
        // 6. Verify synchronized state
        // --------------------------------------------------

        console.log(
            "\n6. Validating synchronized move state..."
        );

        assert(
            JSON.stringify(
                whiteUpdate.gameState
            ) ===
                JSON.stringify(
                    blackUpdate.gameState
                ),
            "White and Black received identical updated game state"
        );

        validateMoveState(
            whiteUpdate.gameState
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
        "REGRESSION TEST FAILED"
    );

    console.error(
        error.message
    );

    console.error(
        "========================================\n"
    );

    process.exitCode = 1;
});