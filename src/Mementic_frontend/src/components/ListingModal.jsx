import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

const ListingModal = ({ isOpen, onClose, nft, onConfirm, isProcessing = false, error = null }) => {
  const [mode, setMode] = useState("fixed");
  const [price, setPrice] = useState("");
  const [startingBid, setStartingBid] = useState("");
  const [duration, setDuration] = useState("7"); // days
  const [royalties, setRoyalties] = useState("5");
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMode("fixed");
      setPrice("");
      setStartingBid("");
      setDuration("7");
      setRoyalties("5");
      setFormError(null);
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setFormError(null);

    const rawValue = mode === "auction" ? startingBid : price;
    const numeric = Number.parseFloat(rawValue);

    if (!Number.isFinite(numeric) || numeric <= 0) {
      setFormError(
        mode === "auction"
          ? "Starting bid must be greater than zero."
          : "Listing price must be greater than zero."
      );
      return;
    }

    const listingOptions = {
      mode,
      price: numeric,
      startingBid: mode === "auction" ? numeric : null,
      auctionType: mode === "auction" ? "timed_auction" : null,
      duration: mode === "auction" ? parseInt(duration) : null,
      royalties: parseInt(royalties) || null,
    };

    onConfirm(nft.id, listingOptions);
  };

  if (!isOpen || !nft) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? "" : "hidden"}`}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Launch NFT Listing</h2>

          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">NFT Preview</h3>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {nft.imageUrl ? (
                <img
                  src={nft.imageUrl}
                  alt={nft.title}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-secondary/20 flex items-center justify-center text-2xl">
                  🖼️
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{nft.title}</p>
                <p className="text-xs text-muted-foreground">NFT #{nft.id}</p>
              </div>
            </div>
          </div>

          <div className="space-y-4">
            <div>
              <label className="text-sm font-medium">Listing Mode</label>
              <div className="mt-2 grid grid-cols-2 gap-2 text-sm">
                <button
                  type="button"
                  onClick={() => setMode("fixed")}
                  disabled={isProcessing}
                  className={`rounded-md border px-3 py-2 text-left ${
                    mode === "fixed"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:border-primary/40"
                  }`}
                >
                  <span className="block font-semibold">Fixed price</span>
                  <span className="block text-xs text-muted-foreground">
                    Set a buy-now price for collectors.
                  </span>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("auction")}
                  disabled={isProcessing}
                  className={`rounded-md border px-3 py-2 text-left ${
                    mode === "auction"
                      ? "border-primary bg-primary/10 text-primary"
                      : "border-input hover:border-primary/40"
                  }`}
                >
                  <span className="block font-semibold">Auction</span>
                  <span className="block text-xs text-muted-foreground">
                    Kick off live bidding with a floor price.
                  </span>
                </button>
              </div>
            </div>

            <div>
              <label className="text-sm font-medium">
                {mode === "auction" ? "Starting bid (ICP)" : "Listing price (ICP)"}
              </label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={mode === "auction" ? startingBid : price}
                onChange={(e) =>
                  mode === "auction"
                    ? setStartingBid(e.target.value)
                    : setPrice(e.target.value)
                }
                placeholder="0.00"
                required
                className="mt-1"
                disabled={isProcessing}
              />
            </div>

            {mode === "auction" && (
              <div>
                <label className="text-sm font-medium">Duration (days)</label>
                <Input
                  type="number"
                  min="1"
                  max="30"
                  value={duration}
                  onChange={(e) => setDuration(e.target.value)}
                  className="mt-1"
                  disabled={isProcessing}
                />
              </div>
            )}

            <div>
              <label className="text-sm font-medium">Royalties (%)</label>
              <Input
                type="number"
                min="0"
                max="20"
                value={royalties}
                onChange={(e) => setRoyalties(e.target.value)}
                placeholder="5"
                className="mt-1"
                disabled={isProcessing}
              />
              <p className="text-xs text-muted-foreground mt-1">
                Percentage of future sales you receive
              </p>
            </div>
          </div>

          {formError || error ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/10 p-3 text-xs text-destructive">
              {formError || error}
            </div>
          ) : null}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-green-500 to-emerald-500"
              disabled={isProcessing}
            >
              {isProcessing ? "Listing…" : "List NFT"}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ListingModal;
