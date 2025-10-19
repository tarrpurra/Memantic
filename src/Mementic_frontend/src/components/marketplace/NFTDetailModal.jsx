import { X, Crown, Eye, Heart, ShoppingCart, Tag, TrendingUp, Sparkles, User } from "lucide-react";
import { Button } from "../ui/Button";

const NFTDetailModal = ({ nft, isOpen, onClose, onBuy, isBuying = false }) => {
  if (!isOpen || !nft) return null;

  const mintedCount = nft.mintedTokens?.length ?? 0;
  const isListed = nft.saleSnapshot?.isListed;
  const listingPrice = nft.saleSnapshot?.price ? (nft.saleSnapshot.price / 100000000).toFixed(4) : null;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/90 backdrop-blur-md p-4">
      <div 
        className="absolute inset-0" 
        onClick={onClose}
      />
      
      <div className="relative w-full max-w-5xl max-h-[95vh] overflow-hidden rounded-3xl border border-border/30 bg-background shadow-2xl">
        {/* Close Button */}
        <button
          onClick={onClose}
          className="absolute right-4 top-4 z-10 rounded-full bg-black/50 hover:bg-black/70 p-2.5 text-white transition-all hover:scale-110"
        >
          <X className="h-5 w-5" />
        </button>

        <div className="flex flex-col lg:flex-row max-h-[95vh] overflow-y-auto">
          {/* Left Side - Image */}
          <div className="lg:w-1/2 bg-muted/20 p-8 flex items-center justify-center">
            <div className="relative w-full max-w-lg">
              {nft.imageUrl ? (
                <img
                  src={nft.imageUrl}
                  alt={nft.title}
                  className="w-full h-auto rounded-2xl shadow-2xl border border-border/50"
                  loading="lazy"
                />
              ) : (
                <div className="aspect-square w-full flex items-center justify-center rounded-2xl bg-muted/40 text-9xl border border-border/50">
                  🖼️
                </div>
              )}
              
              {/* Rank Badge */}
              <div className="absolute -top-4 -right-4 bg-gradient-to-br from-amber-400 to-orange-500 text-white rounded-full w-16 h-16 flex items-center justify-center shadow-lg">
                <div className="text-center">
                  <Crown className="h-6 w-6 mx-auto" />
                  <span className="text-xs font-bold">#{nft.rank}</span>
                </div>
              </div>
            </div>
          </div>

          {/* Right Side - Details */}
          <div className="lg:w-1/2 flex flex-col">
            {/* Header */}
            <div className="p-8 border-b border-border/50">
              <div className="flex items-start justify-between gap-4 mb-4">
                <div className="flex-1">
                  <h2 className="text-3xl font-bold text-foreground mb-2 leading-tight">
                    {nft.title}
                  </h2>
                  <p className="text-muted-foreground flex items-center gap-2">
                    <User className="h-4 w-4" />
                    <span>by {nft.ownerUsername || "Anonymous"}</span>
                  </p>
                </div>
                
                {isListed && listingPrice && (
                  <div className="text-right">
                    <p className="text-sm text-muted-foreground">Price</p>
                    <p className="text-3xl font-bold text-primary">{listingPrice} ICP</p>
                  </div>
                )}
              </div>

              {/* Status Badges */}
              <div className="flex flex-wrap gap-2">
                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 px-3 py-1 text-sm font-semibold text-emerald-300 border border-emerald-500/30">
                  <Crown className="h-4 w-4" />
                  Week Winner
                </span>
                {mintedCount > 0 && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-purple-500/20 px-3 py-1 text-sm font-semibold text-purple-300 border border-purple-500/30">
                    <Tag className="h-4 w-4" />
                    {mintedCount} {mintedCount === 1 ? "Edition" : "Editions"}
                  </span>
                )}
                {isListed && (
                  <span className="inline-flex items-center gap-1 rounded-full bg-blue-500/20 px-3 py-1 text-sm font-semibold text-blue-300 border border-blue-500/30">
                    <ShoppingCart className="h-4 w-4" />
                    Listed for Sale
                  </span>
                )}
              </div>
            </div>

            {/* Stats Grid */}
            <div className="p-8 border-b border-border/50">
              <h3 className="text-lg font-semibold text-foreground mb-4">NFT Statistics</h3>
              <div className="grid grid-cols-2 gap-4">
                <div className="rounded-xl bg-gradient-to-br from-pink-500/10 to-rose-500/10 p-4 border border-pink-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Heart className="h-4 w-4 text-pink-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-pink-300/90">Total Votes</p>
                  </div>
                  <p className="text-2xl font-bold text-pink-100">{nft.upvotes?.toLocaleString() || 0}</p>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-blue-500/10 to-cyan-500/10 p-4 border border-blue-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Eye className="h-4 w-4 text-cyan-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-cyan-300/90">Views</p>
                  </div>
                  <p className="text-2xl font-bold text-cyan-100">{nft.meme?.views?.toLocaleString() || 0}</p>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-amber-500/10 to-orange-500/10 p-4 border border-amber-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <TrendingUp className="h-4 w-4 text-amber-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-amber-300/90">Rank</p>
                  </div>
                  <p className="text-2xl font-bold text-amber-100">#{nft.rank}</p>
                </div>

                <div className="rounded-xl bg-gradient-to-br from-purple-500/10 to-pink-500/10 p-4 border border-purple-500/20">
                  <div className="flex items-center gap-2 mb-2">
                    <Tag className="h-4 w-4 text-purple-400" />
                    <p className="text-xs font-semibold uppercase tracking-wide text-purple-300/90">Minted</p>
                  </div>
                  <p className="text-2xl font-bold text-purple-100">{mintedCount}</p>
                </div>
              </div>
            </div>

            {/* Description */}
            {nft.prompt && (
              <div className="p-8 border-b border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-3">Description</h3>
                <p className="text-muted-foreground leading-relaxed">
                  {nft.prompt}
                </p>
              </div>
            )}

            {/* Listing Details */}
            {isListed && (
              <div className="p-8 border-b border-border/50">
                <h3 className="text-lg font-semibold text-foreground mb-3">Listing Details</h3>
                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Status</span>
                    <span className="font-semibold text-emerald-400">Available for Purchase</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Price</span>
                    <span className="font-bold text-primary text-xl">{listingPrice} ICP</span>
                  </div>
                  <div className="flex justify-between items-center">
                    <span className="text-muted-foreground">Seller</span>
                    <span className="font-semibold text-foreground">{nft.ownerUsername || "Anonymous"}</span>
                  </div>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="p-8 mt-auto">
              <div className="flex gap-3">
                {isListed && listingPrice ? (
                  <Button
                    onClick={() => onBuy(nft)}
                    disabled={isBuying}
                    className="flex-1 h-14 bg-gradient-to-r from-primary to-secondary text-primary-foreground text-lg font-semibold shadow-lg hover:shadow-xl transition-all"
                  >
                    {isBuying ? (
                      <>
                        <div className="animate-spin h-5 w-5 border-2 border-current border-t-transparent rounded-full mr-2" />
                        Processing...
                      </>
                    ) : (
                      <>
                        <ShoppingCart className="h-5 w-5 mr-2" />
                        Buy Now for {listingPrice} ICP
                      </>
                    )}
                  </Button>
                ) : (
                  <div className="flex-1 rounded-xl bg-muted/50 p-4 text-center">
                    <p className="text-muted-foreground">This NFT is not currently listed for sale</p>
                  </div>
                )}
                <Button
                  variant="outline"
                  onClick={onClose}
                  className="px-6 h-14"
                >
                  Close
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
    
  );
};

export default NFTDetailModal;
