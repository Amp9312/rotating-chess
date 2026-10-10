import type {
    Color,
    GameState,
    PromotionPiece,
    Square,
} from "../types";

/**
 * Messages sent from a browser to the server.
 *
 * The server still validates every message at runtime.
 * TypeScript types alone do not provide security.
 */
export type ClientMessage =
    | {
          type: "authenticate";
          token: string;
      }
    | {
          type: "move";
          from: Square;
          to: Square;
      }
    | {
          type: "promote";
          piece: PromotionPiece;
      };

/**
 * Messages sent from the server to a browser.
 */
export type ServerMessage =
    | {
          type: "authenticated";
          color: Color;
          gameState: GameState;
      }
    | {
          type: "game_state";
          gameState: GameState;
      }
    | {
          type: "promotion_required";
          square: Square;
          color: Color;
          gameState: GameState;
      }
    | {
          type: "player_joined";
          color: Color;
      }
    | {
          type: "error";
          message: string;
      };