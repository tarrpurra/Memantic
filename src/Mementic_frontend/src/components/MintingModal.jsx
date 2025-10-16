import { useState } from "react";
import { Button } from "./ui/Button";
import { Input } from "./ui/Input";
import { Textarea } from "./ui/Textarea";

const MintingModal = ({ isOpen, onClose, meme, onConfirm }) => {
  const [collectionName, setCollectionName] = useState("");
  const [collectionDescription, setCollectionDescription] = useState("");
  const [mintType, setMintType] = useState("single"); // "single" or "collection"

  const handleSubmit = (e) => {
    e.preventDefault();
    const collectionOptions = mintType === "collection" ? {
      collectionName: collectionName.trim() || null,
      collectionDescription: collectionDescription.trim() || null,
    } : {
      collectionName: null,
      collectionDescription: null,
    };

    onConfirm(meme.id, collectionOptions);
  };

  if (!isOpen || !meme) return null;

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center ${isOpen ? '' : 'hidden'}`}>
      <div className="fixed inset-0 bg-black/50" onClick={onClose} />
      <div className="relative bg-background rounded-lg shadow-lg max-w-md w-full mx-4 max-h-[90vh] overflow-y-auto">
        <div className="p-6">
          <h2 className="text-lg font-semibold mb-4">Mint Meme as NFT</h2>

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
                  />
                </div>
              </div>
            )}
          </div>

          <div className="flex gap-3 pt-4">
            <Button type="button" variant="outline" onClick={onClose} className="flex-1">
              Cancel
            </Button>
            <Button type="submit" className="flex-1 bg-gradient-to-r from-purple-500 to-pink-500">
              Mint NFT
            </Button>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default MintingModal;