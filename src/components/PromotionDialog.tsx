import type { PromotionPiece } from "../types";

interface PromotionDialogProps {
    onSelect: (
        piece: PromotionPiece
    ) => void;
}

function PromotionDialog({
    onSelect,
}: PromotionDialogProps) {
    const pieces: PromotionPiece[] = [
        "queen",
        "rook",
        "bishop",
        "knight",
    ];

    return (
        <div className="promotion-dialog">
            <h2>Promote pawn</h2>

            <div className="promotion-options">
                {pieces.map((piece) => (
                    <button
                        key={piece}
                        onClick={() =>
                            onSelect(piece)
                        }
                    >
                        {piece}
                    </button>
                ))}
            </div>
        </div>
    );
}

export default PromotionDialog;