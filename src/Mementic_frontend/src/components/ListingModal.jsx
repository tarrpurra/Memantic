import { useEffect, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";

const ListingModal = ({ isOpen, onClose, nft, onConfirm, isProcessing = false }) => {
  const [price, setPrice] = useState("");
  const [auctionType, setAuctionType] = useState("fixed_price");
  const [duration, setDuration] = useState("7"); // days
  const [royalties, setRoyalties] = useState("5");

  useEffect(() => {
    if (isOpen) {
      setPrice("");
      setAuctionType("fixed_price");
      setDuration("7");
      setRoyalties("5");
    }
  }, [isOpen]);

  const handleSubmit = (e) => {
    e.preventDefault();

    const listingOptions = {
      price: parseFloat(price),
      auctionType: auctionType === "fixed_price" ? null : auctionType,
      duration: auctionType === "timed_auction" ? parseInt(duration) : null,
      royalties: parseInt(royalties) || null,
    };

    onConfirm(nft.id, listingOptions);
  };

  if (!isOpen || !nft) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">List NFT on Marketplace</h2>

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
              <label className="text-sm font-medium">Price (ICP)</label>
              <Input
                type="number"
                step="0.01"
                min="0.01"
                value={price}
                onChange={(e) => setPrice(e.target.value)}
                placeholder="0.00"
                required
                className="mt-1"
                disabled={isProcessing}
              />
            </div>

            <div>
              <label className="text-sm font-medium">Auction Type</label>
              <select
                value={auctionType}
                onChange={(e) => setAuctionType(e.target.value)}
                className="w-full mt-1 px-3 py-2 border border-input bg-background rounded-md text-sm"
                disabled={isProcessing}
              >
                <option value="fixed_price">Fixed Price</option>
                <option value="timed_auction">Timed Auction</option>
              </select>
            </div>

            {auctionType === "timed_auction" && (
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
