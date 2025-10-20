import { useEffect } from "react";
import { Button } from "../ui/Button";

export default function NFTDetailModal({ isOpen, nft, onClose, onBuy, isBuying = false }) {
  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose?.();
    };
    if (isOpen) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [isOpen, onClose]);

  if (!isOpen || !nft) return null;

  const title = nft.title || `Meme #${nft.id ?? nft.memeId ?? ""}`;
  const imageUrl = nft.imageUrl || nft.meme?.meme_data?.image_url || null;
  const owner = nft.ownerUsername || nft.ownerPrincipal || "Anonymous";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />

      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-[90vw] max-w-3xl max-h-[85vh] overflow-hidden">
        <div className="flex flex-col h-full">
          <div className="flex items-center justify-between px-4 py-3 border-b border-border">
            <div>
              <div className="font-semibold">{title}</div>
              <div className="text-xs text-muted-foreground">By {owner}</div>
            </div>
            <Button size="sm" variant="ghost" onClick={onClose} title="Close">
              Close
            </Button>
          </div>

          <div className="flex-1 overflow-y-auto p-4">
            {imageUrl ? (
              <img
                src={imageUrl}
                alt={title}
                className="w-full h-auto rounded-lg object-contain"
                loading="lazy"
              />
            ) : (
              <div className="text-sm text-muted-foreground">No image available</div>
            )}

            {nft.description ? (
              <p className="mt-4 text-sm text-muted-foreground">{nft.description}</p>
            ) : null}
          </div>

          <div className="px-4 py-3 border-t border-border flex items-center justify-end gap-2">
            <Button variant="secondary" onClick={onClose}>Close</Button>
            {onBuy ? (
              <Button onClick={() => onBuy(nft)} disabled={isBuying}>
                {isBuying ? "Processing..." : "Buy"}
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}

