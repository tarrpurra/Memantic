import { useEffect, useMemo, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import {
  TrendingUp,
  Coins,
  Crown,
  ArrowUp,
  ArrowDown,
  User,
  Sparkles,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";

import backendService from "../services/backendService";




/**
 * UI NFT shape (for reference)
 * {
 *   id: string,
 *   title: string,
 *   emoji: string,
 *   votes: number,
 *   earnedIcp: number,
 *   views: number,
 *   status: "earning" | "selling" | "minted" | "unknown",
 *   imageUrl?: string
 * }
 */

const SkeletonStat = () => (
  <Card>
    <CardContent className="p-6 text-center animate-pulse">
      <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-muted" />
      <div className="h-7 w-24 mx-auto bg-muted rounded mb-2" />
      <div className="h-4 w-20 mx-auto bg-muted rounded" />
    </CardContent>
  </Card>
);

const SkeletonTile = () => (
  <Card className="group">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="w-16 h-16 rounded bg-muted animate-pulse" />
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="h-6 w-48 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-full bg-muted rounded animate-pulse" />
        <div className="h-9 w-full bg-muted rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

const Portfolio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const {
    principal,
    logout,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();


  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState("");


  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  // Safely unwrap candid optionals that arrive as [] | [value]
  function unopt(v) {
    return Array.isArray(v) ? v[0] : v;
  }

  // Map canister records -> UI
  const mapToUi = (item) => {
    const memeData = unopt(item?.meme_data) || {};
    const marketData = item?.market_data || {};
    const votes = item?.votes?.upvotes ?? item?.votes ?? 0;

    // Handle bigint conversion for earned ICP (from market data)
    let earnedIcp = 0;
    if (marketData?.total_earned) {
      if (typeof marketData.total_earned === 'bigint') {
        earnedIcp = Number(marketData.total_earned) / 100000000; // Convert e8s to ICP
      } else {
        earnedIcp = Number(marketData.total_earned) / 100000000;
      }
    }

    // Determine status based on market data
    let status = "earning";
    if (marketData?.is_listed) {
      status = "selling";
    }

    return {
      id: String(item?.meme_id ?? item?.id ?? crypto.randomUUID()),
      title: memeData?.prompt || item?.title || "Untitled Meme",
      emoji: "🖼️",
      votes: Number(votes || 0),
      earnedIcp: Number.isFinite(earnedIcp) ? earnedIcp : 0,
      views: Number(item?.views || 0),
      status,
      imageUrl: memeData?.image_url,
      // Market data
      isListed: marketData?.is_listed || false,
      listingPrice: marketData?.listing_price ? Number(marketData.listing_price) / 100000000 : null,
      totalSales: Number(marketData?.total_sales || 0),
      lastSalePrice: marketData?.last_sale_price ? Number(marketData.last_sale_price) / 100000000 : null,
      listedAt: marketData?.listed_at,
      lastSaleAt: marketData?.last_sale_at,
      // isMinted will be set in fetchData after checking with backend
      isMinted: false, // default value, will be overridden
    };
  };

  async function fetchData() {
    if (!isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      // Ensure backend service is ready
      await backendService.ensureReady();

      // Use centralized backend service
      const mine = await backendService.getUserMemes();

      if (!mine || !Array.isArray(mine)) {
        console.warn("Invalid response from getUserMemes:", mine);
        setNfts([]);
        return;
      }

      // Check minting status for each meme
      const ui = await Promise.all(mine.map(async (item, index) => {
        const baseUi = mapToUi(item);
        try {
          // Add a small delay to avoid overwhelming the backend
          if (index > 0) {
            await new Promise(resolve => setTimeout(resolve, 100));
          }
          const isMinted = await backendService.isMemeMinted(BigInt(baseUi.id));
          return { ...baseUi, isMinted: Boolean(isMinted) };
        } catch (error) {
          console.warn(`Failed to check minting status for meme ${baseUi.id}:`, error);
          return { ...baseUi, isMinted: false };
        }
      }));

      setNfts(ui);
    } catch (e) {
      console.error("Error loading portfolio:", e);
      // Check if it's an authentication/storage error
      if (e.message && (e.message.includes('anchor_number') || e.message.includes('storage'))) {
        setError("Authentication issue. Please try logging out and back in.");
      } else {
        setError("Failed to load your portfolio. Please try again.");
      }
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  const totalEarnings = useMemo(
    () => nfts.reduce((sum, x) => sum + (x.earnedIcp || 0), 0),
    [nfts]
  );
  const totalVotes = useMemo(
    () => nfts.reduce((sum, x) => sum + (x.votes || 0), 0),
    [nfts]
  );
  const totalViews = useMemo(
    () => nfts.reduce((sum, x) => sum + (x.views || 0), 0),
    [nfts]
  );
  const totalSales = useMemo(
    () => nfts.reduce((sum, x) => sum + (x.totalSales || 0), 0),
    [nfts]
  );
  const listedCount = useMemo(
    () => nfts.filter(x => x.isListed).length,
    [nfts]
  );
  const mintedCount = useMemo(
    () => nfts.filter(x => x.isMinted).length,
    [nfts]
  );
  const generatedCount = useMemo(
    () => nfts.filter(x => !x.isMinted).length,
    [nfts]
  );

  // Separate memes into categories
  const generatedMemes = useMemo(
    () => nfts.filter(nft => !nft.isMinted),
    [nfts]
  );
  const mintedNFTs = useMemo(
    () => nfts.filter(nft => nft.isMinted),
    [nfts]
  );

  const handleLogout = async () => {
    try {
      const success = await logout();
      if (success) {
        toast({
          title: "Logged Out Successfully 👋",
          description: "You have been safely logged out of your account.",
        });
        navigate("/");
      } else {
        toast({
          title: "Logout Error",
          description: "There was an issue logging out. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred during logout.",
        variant: "destructive",
      });
    }
  };

  // Listing actions
  const handleSell = async (nftId) => {
    try {
      // For now, use a default price. In a real app, you'd show a price input dialog
      const defaultPriceE8s = 100000000; // 1 ICP in e8s
      await backendService.listMemeForSale(BigInt(nftId), defaultPriceE8s);

      toast({
        title: "Meme listed for sale! 📈",
        description: "Your meme is now available on the marketplace.",
      });

      // Refresh data
      await fetchData();
    } catch (e) {
      console.error("Sell error:", e);
      toast({
        title: "Listing failed",
        description: e?.message || "Could not list this meme for sale.",
        variant: "destructive",
      });
    }
  };

  const handleKeep = async (nftId) => {
    try {
      await backendService.removeMemeFromMarket(BigInt(nftId));

      toast({
        title: "Meme kept in portfolio 💎",
        description: "Your meme will continue earning from votes.",
      });

      // Refresh data
      await fetchData();
    } catch (e) {
      console.error("Keep error:", e);
      toast({
        title: "Action failed",
        description: e?.message || "Could not remove from marketplace.",
        variant: "destructive",
      });
    }
  };

  // Loading gate
  if (authLoading || !isAuthenticated) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-muted-foreground">
            Loading your portfolio...
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/marketplace")}
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-3 mb-2">
                  <Sparkles className="w-8 h-8 text-primary" />
                  <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                    My Portfolio
                  </h1>
                </div>
                <p className="text-muted-foreground">
                  Manage your meme NFTs and earnings
                </p>
              </div>
            </div>

            {/* User Info + Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
                <User className="w-4 h-4 text-muted-foreground" />
                <span
                  className="text-sm font-mono text-muted-foreground"
                  title={principal || ""}
                >
                  {principal
                    ? `${principal.slice(0, 8)}...${principal.slice(-4)}`
                    : "Unknown"}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
              >
                <ArrowDown className="w-4 h-4 mr-2" />
                <span className="hidden sm:inline">Logout</span>
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Account Info Card - Mobile */}
        <Card className="mb-6 sm:hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Logged in as:</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {principal
                      ? `${principal.slice(0, 12)}...${principal.slice(-6)}`
                      : "Unknown"}
                  </p>
                </div>
              </div>
              <Button
                variant="outline"
                size="sm"
                onClick={handleLogout}
                className="text-red-600 bg-gradient-to-t from-red-500 to-red-50 border-red-200 hero-button"
              >
                <ArrowDown className="w-4 h-4 mr-2" />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Error banner */}
        {error && (
          <Card className="mb-6 border-destructive/30 bg-destructive/5">
            <CardContent className="p-4 text-sm">{error}</CardContent>
          </Card>
        )}

        {/* Stats Overview */}
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-6 gap-4 mb-8">
          {loading ? (
            Array.from({ length: 6 }).map((_, i) => (
              <SkeletonStat key={i} />
            ))
          ) : (
            <>
              <Card>
                <CardContent className="p-4 text-center">
                  <Coins className="w-6 h-6 mx-auto mb-2 text-primary" />
                  <div className="text-lg font-bold">
                    {totalEarnings.toFixed(2)} ICP
                  </div>
                  <p className="text-xs text-muted-foreground">Total Earned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Crown className="w-6 h-6 mx-auto mb-2 text-red-500" />
                  <div className="text-lg font-bold">{totalVotes}</div>
                  <p className="text-xs text-muted-foreground">Total Votes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-lg font-bold">
                    {totalViews.toLocaleString()}
                  </div>
                  <p className="text-xs text-muted-foreground">Total Views</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Sparkles className="w-6 h-6 mx-auto mb-2 text-blue-500" />
                  <div className="text-lg font-bold">{generatedCount}</div>
                  <p className="text-xs text-muted-foreground">Generated Memes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <Crown className="w-6 h-6 mx-auto mb-2 text-purple-500" />
                  <div className="text-lg font-bold">{mintedCount}</div>
                  <p className="text-xs text-muted-foreground">Minted NFTs</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <ArrowUp className="w-6 h-6 mx-auto mb-2 text-orange-500" />
                  <div className="text-lg font-bold">{totalSales}</div>
                  <p className="text-xs text-muted-foreground">Total Sales</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-4 text-center">
                  <User className="w-6 h-6 mx-auto mb-2 text-green-500" />
                  <div className="text-lg font-bold">{listedCount}</div>
                  <p className="text-xs text-muted-foreground">Listed for Sale</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Generated Memes & Marketplace Section */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Generated Memes</h2>
            <Button onClick={() => navigate("/myplace")}>
              Create New Meme
            </Button>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : generatedMemes.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <CardTitle className="mb-2">No Generated Memes yet</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first meme and start earning from votes or list it for sale.
                </p>
                <Button onClick={() => navigate("/myplace")}>
                  Create Meme
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {generatedMemes.map((nft) => (
                <Card key={nft.id} className="group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      {nft.imageUrl ? (
                        <img
                          src={nft.imageUrl}
                          alt={nft.title}
                          className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="text-4xl mb-4 group-hover:animate-float">
                          {nft.emoji}
                        </div>
                      )}
                      <div className="flex-1 ml-4">
                        <h3 className="font-bold text-lg mb-1 line-clamp-2">
                          {nft.title}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Crown className="w-4 h-4" />
                          <span>{nft.votes} likes</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">❤️ Likes:</span>
                         <span className="font-medium">{nft.votes}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Views:</span>
                         <span className="font-medium">
                           {nft.views.toLocaleString()}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Earned:</span>
                         <span className="font-bold text-primary">
                           {nft.earnedIcp.toFixed(4)} ICP
                         </span>
                       </div>

                       {/* Market Information */}
                       {nft.isListed && (
                         <div className="flex justify-between">
                           <span className="text-muted-foreground">Listed Price:</span>
                           <span className="font-medium text-green-600">
                             {nft.listingPrice?.toFixed(2)} ICP
                           </span>
                         </div>
                       )}

                       {nft.totalSales > 0 && (
                         <>
                           <div className="flex justify-between">
                             <span className="text-muted-foreground">Total Sales:</span>
                             <span className="font-medium">{nft.totalSales}</span>
                           </div>
                           {nft.lastSalePrice && (
                             <div className="flex justify-between">
                               <span className="text-muted-foreground">Last Sale:</span>
                               <span className="font-medium text-blue-600">
                                 {nft.lastSalePrice.toFixed(2)} ICP
                               </span>
                             </div>
                           )}
                         </>
                       )}

                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Status:</span>
                         <span className={`font-medium ${nft.isListed ? 'text-green-600' : 'text-blue-600'}`}>
                           {nft.isListed ? 'Listed for Sale' : 'Earning from Votes'}
                         </span>
                       </div>
                     </div>

                    <div className="flex gap-2">
                      {nft.isListed ? (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleKeep(nft.id)}
                          >
                            Remove from Market
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate("/marketplace")}
                          >
                            View in Market
                          </Button>
                        </>
                      ) : (
                        <>
                          <Button
                            variant="outline"
                            size="sm"
                            className="flex-1"
                            onClick={() => handleSell(nft.id)}
                          >
                            List for Sale
                          </Button>
                          <Button
                            variant="default"
                            size="sm"
                            className="flex-1"
                            onClick={() => navigate("/marketplace")}
                          >
                            View Market
                          </Button>
                        </>
                      )}
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>

        {/* Minted NFTs Section */}
        <div className="space-y-6 mt-12">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Minted NFTs</h2>
            <div className="text-sm text-muted-foreground">
              NFTs that have been minted as collectibles
            </div>
          </div>

          {loading ? (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : mintedNFTs.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <CardTitle className="mb-2">No Minted NFTs yet</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">
                  Your top-performing memes will be minted as NFTs automatically.
                </p>
                <Button variant="outline" onClick={() => navigate("/marketplace")}>
                  View Marketplace
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {mintedNFTs.map((nft) => (
                <Card key={nft.id} className="group border-purple-200">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      {nft.imageUrl ? (
                        <img
                          src={nft.imageUrl}
                          alt={nft.title}
                          className="w-16 h-16 object-cover rounded-lg group-hover:scale-105 transition-transform"
                        />
                      ) : (
                        <div className="text-4xl mb-4 group-hover:animate-float">
                          {nft.emoji}
                        </div>
                      )}
                      <div className="flex-1 ml-4">
                        <h3 className="font-bold text-lg mb-1 line-clamp-2">
                          {nft.title}
                        </h3>
                        <div className="flex items-center gap-1 text-sm text-muted-foreground">
                          <Crown className="w-4 h-4" />
                          <span>{nft.votes} likes</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">❤️ Likes:</span>
                         <span className="font-medium">{nft.votes}</span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Views:</span>
                         <span className="font-medium">
                           {nft.views.toLocaleString()}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Earned:</span>
                         <span className="font-bold text-primary">
                           {nft.earnedIcp.toFixed(4)} ICP
                         </span>
                       </div>

                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Status:</span>
                         <span className="font-medium text-purple-600">
                           🏆 Minted NFT
                         </span>
                       </div>
                     </div>

                    <div className="flex gap-2">
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => navigate("/marketplace")}
                      >
                        View NFT
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Portfolio;
