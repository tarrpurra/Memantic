import { useEffect, useMemo, useState } from "react";
import { Button } from "../ui/Button";
import { Input } from "../ui/Input";

const formatIcp = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "0.00 ICP";
  if (n >= 1) return `${n.toFixed(2)} ICP`;
  return `${n.toFixed(4)} ICP`;
};

const BidModal = ({ open, onClose, auction, onSubmit, isSubmitting = false }) => {
  const [bidValue, setBidValue] = useState("");
  const [error, setError] = useState("");

  const minimumBid = useMemo(() => {
    if (!auction) return 0;
    const values = [
      Number(auction.currentBidIcp ?? 0),
      Number(auction.highestBidIcp ?? 0),
      Number(auction.reserveIcp ?? 0),
      Number(auction.listingPriceIcp ?? 0),
    ].map((v) => (Number.isFinite(v) && v > 0 ? v : 0));
    return Math.max(0, ...values);
  }, [auction]);

  useEffect(() => {
    if (open && auction) {
      const suggested = minimumBid > 0 ? (minimumBid + 0.1).toFixed(2) : "";
      setBidValue(suggested);
      setError("");
    }
    if (!open) {
      setBidValue("");
      setError("");
    }
  }, [open, auction, minimumBid]);

  if (!open || !auction) {
    return null;
  }

  const handleSubmit = (event) => {
    event.preventDefault();
    setError("");

    const numeric = Number(bidValue);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      setError("Enter a valid bid amount greater than zero.");
      return;
    }

    if (numeric <= minimumBid) {
      const requirement = minimumBid > 0 ? formatIcp(minimumBid) : "0.00 ICP";
      setError(`Bids must be higher than ${requirement}.`);
      return;
    }

    onSubmit?.(numeric);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="fixed inset-0 bg-black/50" onClick={isSubmitting ? undefined : onClose} />
      <div className="relative mx-4 max-h-[90vh] w-full max-w-md overflow-y-auto rounded-xl border border-border/60 bg-background shadow-xl">
        <div className="flex items-center justify-between border-b border-border/60 px-6 py-4">
          <h2 className="text-lg font-semibold text-foreground">Place a bid</h2>
          <button
            type="button"
            className="text-sm text-muted-foreground hover:text-foreground"
            onClick={isSubmitting ? undefined : onClose}
          >
            Close
          </button>
        </div>
        <form onSubmit={handleSubmit} className="space-y-5 px-6 py-5">
          <div className="space-y-2">
            <p className="text-sm text-muted-foreground">You're bidding on</p>
            <div className="rounded-lg border border-border/50 bg-muted/30 p-3">
              <p className="text-sm font-semibold text-foreground">{auction.title}</p>
              <p className="text-xs text-muted-foreground">by @{auction.creator}</p>
            </div>
          </div>

          <div className="space-y-2">
            <label className="text-sm font-medium text-foreground" htmlFor="bid-amount">
              Bid amount (ICP)
            </label>
            <Input
              id="bid-amount"
              type="number"
              min="0"
              step="0.01"
              value={bidValue}
              onChange={(event) => setBidValue(event.target.value)}
              placeholder="0.00"
              disabled={isSubmitting}
              required
            />
            <p className="text-xs text-muted-foreground">
              Minimum bid {formatIcp(minimumBid || auction.reserveIcp || auction.listingPriceIcp || 0)}
            </p>
          </div>

          {error ? (
            <div className="rounded-lg border border-destructive/30 bg-destructive/10 p-3 text-xs text-destructive">
              {error}
            </div>
          ) : null}

          <div className="flex gap-3 pt-2">
            <Button
              type="button"
              variant="outline"
              className="flex-1"
              onClick={isSubmitting ? undefined : onClose}
              disabled={isSubmitting}
            >
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-primary to-secondary"
              disabled={isSubmitting}
            >
              {isSubmitting ? "Submitting…" : "Submit bid"}
            </Button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default BidModal;
