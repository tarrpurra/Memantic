import { useEffect, useMemo, useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";

const MintingModal = ({ isOpen, onClose, meme, entitlement, onConfirm, isMinting = false }) => {
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [mintType, setMintType] = useState("single"); // "single" or "collection"
  const [collectionSupply, setCollectionSupply] = useState("10");
  const [error, setError] = useState("");

  useEffect(() => {
    if (isOpen) {
      setMintType("single");
      setCollectionName("");
      setCollectionDescription("");
      setCollectionSupply("10");
      setError("");
    }
  }, [isOpen]);

  useEffect(() => {
    setError("");
  }, [mintType]);

  const countdownLabel = useMemo(() => {
    if (!entitlement?.expiresAtMs) return null;
    const remaining = entitlement.expiresAtMs - Date.now();
    if (remaining <= 0) return "Mint window expired";
    const minutes = Math.floor(remaining / 60000);
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${hours}h remaining`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m remaining`;
    }
    return `${minutes}m remaining`;
  }, [entitlement?.expiresAtMs]);

  const deadlineLabel = useMemo(() => {
    if (!entitlement?.expiresAtMs) return null;
    try {
      return new Date(entitlement.expiresAtMs).toLocaleString("en-IN", {
        timeZone: "Asia/Kolkata",
        dateStyle: "medium",
        timeStyle: "short",
      });
    } catch {
      return null;
    }
  }, [entitlement?.expiresAtMs]);

  const handleSubmit = (e) => {
    e.preventDefault();
    setError("");

    let editions = 1;
    if (mintType === "collection") {
      editions = Number(collectionSupply);
      if (!Number.isInteger(editions) || editions < 2 || editions > 50) {
        setError("Collection supply must be between 2 and 50 editions.");
        return;
      }
    }

    onConfirm({
      memeId: meme.id,
      mintType,
      editions,
      collectionName: collectionName.trim() || null,
      collectionDescription: collectionDescription.trim() || null,
    });
  };

  if (!isOpen || !meme) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Mint Meme as NFT</h2>

          {entitlement && (
            <div className="mb-4 rounded-lg border border-amber-400/50 bg-amber-500/10 px-4 py-3 text-sm text-amber-900 dark:text-amber-100">
              <p className="font-semibold">
                🏆 Week {entitlement.weekId} — #{entitlement.rank}
              </p>
              <p className="text-xs">
                {countdownLabel}
                {deadlineLabel ? ` • Mint before ${deadlineLabel}` : ""}
              </p>
            </div>
          )}

          <form onSubmit={handleSubmit} className="space-y-4">
          <div className="space-y-2">
            <h3 className="font-semibold text-sm">Meme Preview</h3>
            <div className="flex items-center gap-3 p-3 bg-muted rounded-lg">
              {meme.imageUrl ? (
                <img
                  src={meme.imageUrl}
                  alt={meme.title}
                  className="h-16 w-16 rounded-lg object-cover"
                />
              ) : (
                <div className="h-16 w-16 rounded-lg bg-primary/20 flex items-center justify-center text-2xl">
                  🖼️
                </div>
              )}
              <div className="flex-1">
                <p className="font-medium text-sm">{meme.title}</p>
                <p className="text-xs text-muted-foreground">{meme.votes} votes</p>
              </div>
            </div>
          </div>

          <div className="space-y-3">
            <div className="flex items-center space-x-4">
              <label className="flex items-center">
                <input
                  type="radio"
                  value="single"
                  checked={mintType === "single"}
                  onChange={(e) => setMintType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Mint as single NFT</span>
              </label>
              <label className="flex items-center">
                <input
                  type="radio"
                  value="collection"
                  checked={mintType === "collection"}
                  onChange={(e) => setMintType(e.target.value)}
                  className="mr-2"
                />
                <span className="text-sm">Create new collection</span>
              </label>
            </div>

            {mintType === "collection" && (
              <div className="space-y-3">
                <div>
                  <label className="text-sm font-medium">Collection Name</label>
                  <Input
                    value={collectionName}
                    onChange={(e) => setCollectionName(e.target.value)}
                    placeholder="e.g. My Winning Memes"
                    maxLength={50}
                    className="mt-1"
                    disabled={isMinting}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Collection Description (Optional)</label>
                  <Textarea
                    value={collectionDescription}
                    onChange={(e) => setCollectionDescription(e.target.value)}
                    placeholder="Describe your collection..."
                    maxLength={200}
                    rows={3}
                    className="mt-1"
                    disabled={isMinting}
                  />
                </div>
                <div>
                  <label className="text-sm font-medium">Edition Supply</label>
                  <Input
                    type="number"
                    min="2"
                    max="50"
                    value={collectionSupply}
                    onChange={(e) => setCollectionSupply(e.target.value)}
                    className="mt-1"
                    disabled={isMinting}
                  />
                  <p className="text-xs text-muted-foreground mt-1">Between 2 and 50 editions.</p>
                </div>
              </div>
            )}
          </div>

          {error && <p className="text-xs text-destructive">{error}</p>}

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button
              type="submit"
              className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500"
              disabled={isMinting}
            >
              {isMinting ? "Minting…" : "Mint NFT"}
            </Button>
          </div>
          </form>
        </div>
      </div>
    </div>
  );
};

export default MintingModal;
