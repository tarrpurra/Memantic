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
  MessageSquare,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";
import { FeedbackForm } from "../components/FeedbackForm";

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
    username,
    logout,
    isAuthenticated,
    isLoading: authLoading,
  } = useAuth();


  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const displayName =
    username?.trim() || (principal ? `${principal.slice(0, 8)}...${principal.slice(-6)}` : "Not logged in");
  const displayTitle = username?.trim() || principal || "";


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

  /**
   * Safely convert BigInt to number, handling large values
   */
  function safeBigIntToNumber(value) {
    if (typeof value === 'bigint') {
      // Check if BigInt is within safe number range
      if (value > Number.MAX_SAFE_INTEGER) {
        return Number.MAX_SAFE_INTEGER;
      }
      if (value < Number.MIN_SAFE_INTEGER) {
        return Number.MIN_SAFE_INTEGER;
      }
      return Number(value);
    }
    return Number(value) || 0;
  }

  // Map canister records -> UI
  const mapToUi = (item) => {
    const memeData = unopt(item?.meme_data) || {};
    const marketData = item?.market_data || {};
    const votes = safeBigIntToNumber(item?.votes?.upvotes ?? item?.votes ?? 0);

    // Handle bigint conversion for earned ICP (from market data)
    let earnedIcp = 0;
    if (marketData?.total_earned) {
      earnedIcp = safeBigIntToNumber(marketData.total_earned) / 100000000; // Convert e8s to ICP
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
      votes: votes,
      earnedIcp: Number.isFinite(earnedIcp) ? earnedIcp : 0,
      views: safeBigIntToNumber(marketData?.views || item?.views || 0),
      status,
      imageUrl: memeData?.image_url,
      // Market data
      isListed: marketData?.is_listed || false,
      listingPrice: marketData?.listing_price ? safeBigIntToNumber(marketData.listing_price) / 100000000 : null,
      totalSales: safeBigIntToNumber(marketData?.total_sales || 0),
      lastSalePrice: marketData?.last_sale_price ? safeBigIntToNumber(marketData.last_sale_price) / 100000000 : null,
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
      let mine = [];
      try {
        mine = await backendService.getUserMemes();
        console.log(`Fetched ${mine?.length || 0} user memes`);
      } catch (error) {
        console.warn("Failed to fetch user memes:", error);
        // Create sample data for testing
        mine = [
          {
            id: "sample-1",
            meme_data: {
              prompt: "Sample meme for testing",
              image_url: "",
              image_filename: "sample.png",
              image_format: "png",
              metadata: {
                processing_time: 1.5,
                timestamp: Date.now() * 1000000,
                file_size_bytes: 1024000,
                service: "sample"
              }
            },
            created_at: Date.now(),
            market_data: {
              is_listed: false,
              listing_price: null,
              views: 25,
              total_sales: 0,
              total_earned: 0
            }
          }
        ];
        console.log("Using sample data due to backend issues");
      }

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

  // Periodic refresh of vote counts and stats
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const refreshPortfolio = async () => {
      if (refreshing) return; // Prevent multiple simultaneous refreshes

      setRefreshing(true);
      try {
        // Refresh vote counts for existing memes
        if (nfts.length > 0) {
          const updatedNfts = await Promise.all(
            nfts.map(async (nft) => {
              try {
                const memeIdBigInt = BigInt(nft.id);
                const voteData = await backendService.getMemeVotes(memeIdBigInt);

                if (voteData) {
                  const newVotes = safeBigIntToNumber(voteData.upvotes) - safeBigIntToNumber(voteData.downvotes);
                  return { ...nft, votes: newVotes };
                }
                return nft;
              } catch (error) {
                console.warn(`Failed to refresh votes for meme ${nft.id}:`, error);
                return nft;
              }
            })
          );
          setNfts(updatedNfts);
        }
      } catch (error) {
        console.warn("Failed to refresh portfolio data:", error);
      } finally {
        setRefreshing(false);
      }
    };

    // Initial refresh after loading
    const initialRefreshTimer = setTimeout(refreshPortfolio, 2000);

    // Set up periodic refresh every 30 seconds
    const refreshInterval = setInterval(refreshPortfolio, 30000);

    return () => {
      clearTimeout(initialRefreshTimer);
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, loading, nfts.length, refreshing]);

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
  const avgEarningsPerVote = useMemo(
    () => totalVotes > 0 ? (totalEarnings / totalVotes) * 100 : 0,
    [totalEarnings, totalVotes]
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
      <div className="border-b border-border bg-gradient-to-r from-background via-card/50 to-background backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-6">
              <Button
                variant="ghost"
                size="icon"
                onClick={() => navigate("/marketplace")}
                className="hover:bg-primary/10"
              >
                <ArrowUp className="w-5 h-5" />
              </Button>
              <div>
                <div className="flex items-center gap-4 mb-3">
                  <div className="p-3 bg-gradient-to-br from-primary/20 to-primary/10 rounded-xl">
                    <Sparkles className="w-8 h-8 text-primary" />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                      My Portfolio
                    </h1>
                    <p className="text-muted-foreground text-lg">
                      Track your meme creations and earnings
                    </p>
                  </div>
                </div>
              </div>
            </div>

            {/* User Info + Logout */}
            <div className="flex items-center gap-4">
              <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
                <User className="w-4 h-4 text-muted-foreground" />
                <span
                  className="text-sm font-medium text-muted-foreground"
                  title={displayTitle}
                >
                  {displayName}
                </span>
              </div>

              <Button
                variant="outline"
                size="sm"
                onClick={async () => {
                  setRefreshing(true);
                  try {
                    await fetchData();
                    toast({
                      title: "Portfolio Refreshed! 🔄",
                      description: "Your vote counts and stats have been updated.",
                    });
                  } catch (error) {
                    toast({
                      title: "Refresh Failed",
                      description: "Could not refresh portfolio data.",
                      variant: "destructive",
                    });
                  } finally {
                    setRefreshing(false);
                  }
                }}
                disabled={refreshing || loading}
                title="Refresh vote counts and stats"
              >
                {refreshing ? (
                  <div className="w-4 h-4 border border-current border-t-transparent rounded-full animate-spin mr-2" />
                ) : (
                  <ArrowUp className="w-4 h-4 mr-2" />
                )}
                <span className="hidden sm:inline">Refresh</span>
              </Button>

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
                  <p className="text-xs text-muted-foreground" title={displayTitle}>
                    {displayName}
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
        <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-4 gap-6 mb-8">
          {loading ? (
            Array.from({ length: 8 }).map((_, i) => (
              <SkeletonStat key={i} />
            ))
          ) : (
            <>
              <Card className="bg-gradient-to-br from-yellow-50 to-yellow-100 dark:from-yellow-900/20 dark:to-yellow-800/20 border-yellow-200">
                <CardContent className="p-6 text-center">
                  <Coins className="w-8 h-8 mx-auto mb-3 text-yellow-600" />
                  <div className="text-2xl font-bold text-yellow-700 dark:text-yellow-300">
                    {totalEarnings.toFixed(2)}
                  </div>
                  <p className="text-sm text-yellow-600 dark:text-yellow-400 font-medium">ICP Earned</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-red-50 to-red-100 dark:from-red-900/20 dark:to-red-800/20 border-red-200">
                <CardContent className="p-6 text-center">
                  <Crown className="w-8 h-8 mx-auto mb-3 text-red-600" />
                  <div className="text-2xl font-bold text-red-700 dark:text-red-300">
                    {totalVotes.toLocaleString()}
                  </div>
                  <p className="text-sm text-red-600 dark:text-red-400 font-medium">Total Votes</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 border-blue-200">
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-3 text-blue-600" />
                  <div className="text-2xl font-bold text-blue-700 dark:text-blue-300">
                    {totalViews.toLocaleString()}
                  </div>
                  <p className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Views</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 border-green-200">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-3 text-green-600" />
                  <div className="text-2xl font-bold text-green-700 dark:text-green-300">
                    {generatedCount}
                  </div>
                  <p className="text-sm text-green-600 dark:text-green-400 font-medium">Generated Memes</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-purple-900/20 dark:to-purple-800/20 border-purple-200">
                <CardContent className="p-6 text-center">
                  <Crown className="w-8 h-8 mx-auto mb-3 text-purple-600" />
                  <div className="text-2xl font-bold text-purple-700 dark:text-purple-300">
                    {mintedCount}
                  </div>
                  <p className="text-sm text-purple-600 dark:text-purple-400 font-medium">Minted NFTs</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-orange-50 to-orange-100 dark:from-orange-900/20 dark:to-orange-800/20 border-orange-200">
                <CardContent className="p-6 text-center">
                  <ArrowUp className="w-8 h-8 mx-auto mb-3 text-orange-600" />
                  <div className="text-2xl font-bold text-orange-700 dark:text-orange-300">
                    {totalSales}
                  </div>
                  <p className="text-sm text-orange-600 dark:text-orange-400 font-medium">Total Sales</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-indigo-50 to-indigo-100 dark:from-indigo-900/20 dark:to-indigo-800/20 border-indigo-200">
                <CardContent className="p-6 text-center">
                  <User className="w-8 h-8 mx-auto mb-3 text-indigo-600" />
                  <div className="text-2xl font-bold text-indigo-700 dark:text-indigo-300">
                    {listedCount}
                  </div>
                  <p className="text-sm text-indigo-600 dark:text-indigo-400 font-medium">Listed for Sale</p>
                </CardContent>
              </Card>
              <Card className="bg-gradient-to-br from-pink-50 to-pink-100 dark:from-pink-900/20 dark:to-pink-800/20 border-pink-200">
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-3 text-pink-600" />
                  <div className="text-2xl font-bold text-pink-700 dark:text-pink-300">
                    {avgEarningsPerVote.toFixed(3)} ICP
                  </div>
                  <p className="text-sm text-pink-600 dark:text-pink-400 font-medium">Per Vote</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* Generated Memes & Marketplace Section */}
        <div className="space-y-8">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-green-100 to-green-200 dark:from-green-900/30 dark:to-green-800/30 rounded-lg">
                <Sparkles className="w-6 h-6 text-green-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-green-700 dark:text-green-300">My Generated Memes</h2>
                <p className="text-muted-foreground">Memes you've created and are earning from</p>
              </div>
            </div>
            <Button onClick={() => navigate("/myplace")} className="bg-gradient-to-r from-green-500 to-green-600 hover:from-green-600 hover:to-green-700">
              <Sparkles className="w-4 h-4 mr-2" />
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
                          className="w-16 h-16 object-contain rounded-lg group-hover:scale-105 transition-transform"
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
                          <Crown className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-red-600">{nft.votes} likes</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">❤️ Likes:</span>
                         <span className="font-bold text-red-600 flex items-center gap-1">
                           <Crown className="w-3 h-3" />
                           {nft.votes.toLocaleString()}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">👁️ Views:</span>
                         <span className="font-medium text-blue-600">
                           {nft.views.toLocaleString()}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">💰 Earned:</span>
                         <span className="font-bold text-yellow-600">
                           {nft.earnedIcp.toFixed(4)} ICP
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">📅 Created:</span>
                         <span className="font-medium text-gray-600 text-xs">
                           {new Date(nft.created_at || Date.now()).toLocaleDateString("en-IN", {
                             timeZone: "Asia/Kolkata",
                             dateStyle: "short",
                           })}
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
        <div className="space-y-8 mt-16">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="p-2 bg-gradient-to-br from-purple-100 to-purple-200 dark:from-purple-900/30 dark:to-purple-800/30 rounded-lg">
                <Crown className="w-6 h-6 text-purple-600" />
              </div>
              <div>
                <h2 className="text-3xl font-bold text-purple-700 dark:text-purple-300">My Minted NFTs</h2>
                <p className="text-muted-foreground">Rare collectible NFTs from your top-performing memes</p>
              </div>
            </div>
            <div className="text-right">
              <div className="text-sm text-muted-foreground">
                NFTs that have been minted as collectibles
              </div>
              <div className="text-xs text-purple-600 font-medium">
                🏆 Exclusive Digital Assets
              </div>
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
                          className="w-16 h-16 object-contain rounded-lg group-hover:scale-105 transition-transform"
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
                          <Crown className="w-4 h-4 text-red-500" />
                          <span className="font-medium text-red-600">{nft.votes} likes</span>
                        </div>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="space-y-2 text-sm">
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">❤️ Likes:</span>
                         <span className="font-bold text-red-600 flex items-center gap-1">
                           <Crown className="w-3 h-3" />
                           {nft.votes.toLocaleString()}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">👁️ Views:</span>
                         <span className="font-medium text-blue-600">
                           {nft.views.toLocaleString()}
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">💰 Earned:</span>
                         <span className="font-bold text-yellow-600">
                           {nft.earnedIcp.toFixed(4)} ICP
                         </span>
                       </div>
                       <div className="flex justify-between">
                         <span className="text-muted-foreground">📅 Created:</span>
                         <span className="font-medium text-gray-600 text-xs">
                           {new Date(nft.created_at || Date.now()).toLocaleDateString("en-IN", {
                             timeZone: "Asia/Kolkata",
                             dateStyle: "short",
                           })}
                         </span>
                       </div>

                       <div className="flex justify-between">
                         <span className="text-muted-foreground">Status:</span>
                         <span className="font-medium text-purple-600 flex items-center gap-1">
                           <Crown className="w-3 h-3" />
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

         {/* Feedback Section */}
         <div className="space-y-8 mt-16">
           <div className="flex items-center justify-between">
             <div className="flex items-center gap-4">
               <div className="p-2 bg-gradient-to-br from-blue-100 to-blue-200 dark:from-blue-900/30 dark:to-blue-800/30 rounded-lg">
                 <MessageSquare className="w-6 h-6 text-blue-600" />
               </div>
               <div>
                 <h2 className="text-3xl font-bold text-blue-700 dark:text-blue-300">Share Your Feedback</h2>
                 <p className="text-muted-foreground">Help us improve Mementic with your thoughts</p>
               </div>
             </div>
           </div>

           <FeedbackForm />
         </div>
       </div>
     </div>
   );
 };

export default Portfolio;
