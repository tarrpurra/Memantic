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
} from "../components/ui/Icon";
import { useAuth } from "../hooks/useAuth";
import { useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";

// Import from the correct path
import {
  Mementic_backend as AnonBackendActor,
  createActor as createBackendActor,
  canisterId as BACKEND_CANISTER_ID,
} from "../../../declarations/Mementic_backend";

// for authenticated actor
import { HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";

// optional: if you keep a central config file for agent host / dev mode
// adjust the path if yours differs
// import { config } from "../config";

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

  // 👇 replace useBackend() with local actor state
  const [backend, setBackend] = useState(AnonBackendActor);
  const [backendReady, setBackendReady] = useState(false);

  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState("");

  // init actor based on auth state
  useEffect(() => {
    let mounted = true;

    (async () => {
      try {
        setBackendReady(false);

        if (!isAuthenticated) {
          // anonymous actor (still fine if you immediately redirect to /login)
          if (mounted) {
            setBackend(AnonBackendActor);
            setBackendReady(true);
          }
          return;
        }

        // build an agent from the authenticated identity
        const authClient = await AuthClient.create();
        const identity = authClient.getIdentity();

        const agent = new HttpAgent({
          host: config?.AGENT_HOST || "https://icp-api.io",
          identity,
        });

        // dev networks need root key
        if (config?.DEV_MODE) {
          try {
            await agent.fetchRootKey();
          } catch (e) {
            console.warn("fetchRootKey failed (ok on mainnet):", e);
          }
        }

        const actor = createBackendActor(BACKEND_CANISTER_ID, { agent });

        if (mounted) {
          setBackend(actor);
          setBackendReady(true);
        }
      } catch (e) {
        console.error("Failed to initialize backend actor:", e);
        if (mounted) {
          setBackend(AnonBackendActor);
          setBackendReady(true);
        }
      }
    })();

    return () => {
      mounted = false;
    };
  }, [isAuthenticated]);

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
    const votes = item?.votes?.upvotes ?? item?.votes ?? 0;
    const earnedIcpRaw =
      typeof item?.earned_icp === "number"
        ? item.earned_icp
        : Number(unopt(item?.earned_icp) ?? 0);

    return {
      id: String(item?.meme_id ?? item?.id ?? crypto.randomUUID()),
      title: memeData?.prompt || item?.title || "Untitled Meme",
      emoji: "🖼️",
      votes: Number(votes || 0),
      earnedIcp: Number.isFinite(earnedIcpRaw) ? earnedIcpRaw : 0,
      views: Number(item?.views || 0),
      status: item?.status || "unknown",
      imageUrl: memeData?.image_url,
    };
  };

  async function fetchData() {
    if (!backendReady || !backend) return;
    setLoading(true);
    setError("");
    try {
      // Expected: get_user_memes() -> [StoredMeme or PublicStoredMeme]
      const mine = await backend.get_user_memes();
      const ui = (mine || []).map(mapToUi);
      setNfts(ui);
    } catch (e) {
      console.error(e);
      setError("Failed to load your portfolio.");
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }

  useEffect(() => {
    if (backendReady && isAuthenticated) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [backendReady, isAuthenticated]);

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

  // Listing actions (wire to NFT module if available)
  const handleSell = async (nftId) => {
    try {
      // Example: await backend.list_nft_for_sale(BigInt(nftId), priceE8s);
      toast({
        title: "NFT listed for sale! 📈",
        description: "Your meme is now available on the marketplace.",
      });
    } catch (e) {
      toast({
        title: "Listing failed",
        description: e?.message || "Could not list this NFT.",
        variant: "destructive",
      });
    }
  };

  const handleKeep = async (nftId) => {
    try {
      // Example: await backend.cancel_listing(BigInt(nftId));
      toast({
        title: "NFT kept in portfolio 💎",
        description: "Your meme will continue earning from votes.",
      });
    } catch (e) {
      toast({
        title: "Action failed",
        description: e?.message || "Please try again.",
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
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  My Portfolio
                </h1>
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
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          {loading ? (
            <>
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
              <SkeletonStat />
            </>
          ) : (
            <>
              <Card>
                <CardContent className="p-6 text-center">
                  <Coins className="w-8 h-8 mx-auto mb-2 text-primary" />
                  <div className="text-2xl font-bold">
                    {totalEarnings.toFixed(2)} ICP
                  </div>
                  <p className="text-sm text-muted-foreground">Total Earned</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Crown className="w-8 h-8 mx-auto mb-2 text-red-500" />
                  <div className="text-2xl font-bold">{totalVotes}</div>
                  <p className="text-sm text-muted-foreground">Total Votes</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <Sparkles className="w-8 h-8 mx-auto mb-2 text-blue-500" />
                  <div className="text-2xl font-bold">
                    {totalViews.toLocaleString()}
                  </div>
                  <p className="text-sm text-muted-foreground">Total Views</p>
                </CardContent>
              </Card>
              <Card>
                <CardContent className="p-6 text-center">
                  <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
                  <div className="text-2xl font-bold">{nfts.length}</div>
                  <p className="text-sm text-muted-foreground">Active NFTs</p>
                </CardContent>
              </Card>
            </>
          )}
        </div>

        {/* My NFTs */}
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold">My Meme NFTs</h2>
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
          ) : nfts.length === 0 ? (
            <Card className="py-12 text-center">
              <CardContent>
                <CardTitle className="mb-2">No NFTs yet</CardTitle>
                <p className="text-sm text-muted-foreground mb-4">
                  Create your first meme and start earning from votes.
                </p>
                <Button onClick={() => navigate("/myplace")}>
                  Create Meme
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {nfts.map((nft) => (
                <Card key={nft.id} className="group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <div className="text-6xl mb-4 group-hover:animate-float">
                        {nft.emoji}
                      </div>
                      <h3 className="font-bold text-lg mb-2 line-clamp-2">
                        {nft.title}
                      </h3>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    {/* (Optional) image preview */}
                    {/* {nft.imageUrl && (
                      <img
                        src={nft.imageUrl}
                        alt={nft.title}
                        className="w-full h-48 object-cover rounded-xl"
                      />
                    )} */}

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Votes:</span>
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
                          {nft.earnedIcp.toFixed(2)} ICP
                        </span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button
                        variant="outline"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleSell(nft.id)}
                      >
                        Sell
                      </Button>
                      <Button
                        variant="default"
                        size="sm"
                        className="flex-1"
                        onClick={() => handleKeep(nft.id)}
                      >
                        Keep
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
