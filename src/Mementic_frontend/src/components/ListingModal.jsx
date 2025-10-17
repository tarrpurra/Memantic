import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

const normalizeModes = (modes) => {
  if (!Array.isArray(modes) || modes.length === 0) {
    return ["fixed", "auction"];
  }
  const supported = new Set();
  modes.forEach((mode) => {
    if (!mode) return;
    const trimmed = String(mode).toLowerCase();
    if (trimmed === "fixed" || trimmed === "fixed_price") {
      supported.add("fixed");
    } else if (trimmed === "auction" || trimmed === "timed_auction") {
      supported.add("auction");
    }
  });
  if (supported.size === 0) {
    supported.add("fixed");
  }
  return Array.from(supported);
};

const ListingModal = ({
  isOpen,
  onClose,
  nft,
  onConfirm,
  isProcessing = false,
  error = null,
  allowedModes = ["fixed", "auction"],
  title = "Launch NFT Listing",
  confirmLabel = "List NFT",
}) => {
  const availableModes = useMemo(() => normalizeModes(allowedModes), [allowedModes]);
  const [mode, setMode] = useState(availableModes[0] ?? "fixed");
  const [price, setPrice] = useState("");
  const [startingBid, setStartingBid] = useState("");
  const [duration, setDuration] = useState("7"); // days
  const [royalties, setRoyalties] = useState("5");
  const [formError, setFormError] = useState(null);

  useEffect(() => {
    if (isOpen) {
      setMode(availableModes[0] ?? "fixed");
      setPrice("");
      setStartingBid("");
      setDuration("7");
      setRoyalties("5");
      setFormError(null);
    }
  }, [isOpen, availableModes]);

  useEffect(() => {
    if (!availableModes.includes(mode)) {
      setMode(availableModes[0] ?? "fixed");
    }
  }, [availableModes, mode]);

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

  const allowFixed = availableModes.includes("fixed");
  const allowAuction = availableModes.includes("auction");
  const showModeToggle = allowFixed && allowAuction;
  const gridColumns = showModeToggle ? "grid-cols-2" : "grid-cols-1";

  const resolvedTitle = title || (showModeToggle ? "Launch NFT Listing" : allowAuction ? "Launch auction" : "List on marketplace");
  const resolvedConfirmLabel = confirmLabel || (allowAuction && !allowFixed ? "Start auction" : "List NFT");

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? "" : "hidden"}`}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">{resolvedTitle}</h2>

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
            {showModeToggle ? (
              <div>
                <label className="text-sm font-medium">Listing Mode</label>
                <div className={`mt-2 grid ${gridColumns} gap-2 text-sm`}>
                  {allowFixed && (
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
                  )}
                  {allowAuction && (
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
                  )}
                </div>
              </div>
            ) : (
              <div>
                <label className="text-sm font-medium">Listing Mode</label>
                <div className={`mt-2 grid ${gridColumns} gap-2 text-sm`}>
                  {allowFixed && (
                    <div className="rounded-md border border-primary bg-primary/10 p-3 text-left text-primary">
                      <span className="block text-sm font-semibold">Fixed price</span>
                      <span className="block text-xs text-primary/80">
                        Marketplace listings close instantly with a buy-now price.
                      </span>
                    </div>
                  )}
                  {allowAuction && (
                    <div className="rounded-md border border-primary bg-primary/10 p-3 text-left text-primary">
                      <span className="block text-sm font-semibold">Auction</span>
                      <span className="block text-xs text-primary/80">
                        Bids will be managed from the auction arena.
                      </span>
                    </div>
                  )}
                </div>
              </div>
            )}

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

            {mode === "auction" && allowAuction && (
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
              {isProcessing ? "Listing…" : resolvedConfirmLabel}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default ListingModal;
