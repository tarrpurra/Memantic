import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
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
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";
import { FeedbackForm } from "../components/FeedbackForm";
import Navigation from "../components/Navigation";

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
  const location = useLocation();
  const { toast } = useToast();
  const {
    principal,
    username,
    logout,
    isAuthenticated,
    isLoading: authLoading,
    updateUsername,
  } = useAuth();

  const locationState = location.state ?? {};
  const requestedFrom = locationState?.from;
  const requireUsername = Boolean(locationState?.requireUsername);

  const sanitizedUsername = typeof username === "string" ? username.trim() : "";
  const hasUsername = sanitizedUsername.length > 0;

  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [usernameInput, setUsernameInput] = useState(sanitizedUsername);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [showUsernameEditor, setShowUsernameEditor] = useState(!hasUsername || requireUsername);

  const redirectAfterSaveRef = useRef(requestedFrom || null);

  const displayName =
    sanitizedUsername || (principal ? `${principal.slice(0, 8)}...${principal.slice(-6)}` : "Not logged in");
  const principalPreview = principal
    ? `${principal.slice(0, 8)}...${principal.slice(-6)}`
    : "";

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    setUsernameInput(sanitizedUsername);
    if (sanitizedUsername) {
      setShowUsernameEditor(false);
    }
  }, [sanitizedUsername]);

  useEffect(() => {
    if (requestedFrom) {
      redirectAfterSaveRef.current = requestedFrom;
    }
  }, [requestedFrom]);

  useEffect(() => {
    if (!requireUsername) return;

    setShowUsernameEditor(true);
    if (requestedFrom) {
      redirectAfterSaveRef.current = requestedFrom;
    }

    navigate(location.pathname, {
      replace: true,
      state: requestedFrom ? { from: requestedFrom } : undefined,
    });
  }, [requireUsername, requestedFrom, location.pathname, navigate]);

  const handleEditUsername = () => {
    setShowUsernameEditor(true);
    setUsernameSaved(false);
    setUsernameError("");
    setUsernameInput(sanitizedUsername);
  };

  const handleCancelUsername = () => {
    setShowUsernameEditor(false);
    setUsernameError("");
    setUsernameInput(sanitizedUsername);
  };

  const handleUsernameSubmit = async (event) => {
    event.preventDefault();
    const trimmed = typeof usernameInput === "string" ? usernameInput.trim() : "";

    if (trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters long.");
      return;
    }

    if (trimmed.length > 32) {
      setUsernameError("Username must be 32 characters or fewer.");
      return;
    }

    try {
      setSavingUsername(true);
      await updateUsername(trimmed);
      setUsernameSaved(true);
      setShowUsernameEditor(false);
      setUsernameError("");
      toast({
        title: "Profile updated",
        description: "Your username is live across the marketplace and creator studio.",
      });

      const target = redirectAfterSaveRef.current;
      if (target) {
        redirectAfterSaveRef.current = null;
        setTimeout(() => {
          navigate(target, { replace: true });
        }, 400);
      }
    } catch (error) {
      console.error("Failed to update username:", error);
      setUsernameError("Failed to save username. Please try again.");
    } finally {
      setSavingUsername(false);
    }
  };

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

  
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#060714] via-[#0a0f27] to-[#190924] text-slate-100">
      <Navigation />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10">
        <div className="grid gap-6 lg:grid-cols-[1.75fr,1fr]">
          <Card className="border-indigo-500/20 bg-gradient-to-br from-indigo-900/40 via-indigo-900/20 to-purple-900/30 text-slate-100 shadow-lg shadow-indigo-500/20">
            <CardContent className="flex flex-col gap-6 p-8">
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-indigo-200/70">Creator Profile</p>
                  <h1 className="text-3xl font-semibold md:text-4xl">
                    {displayName || "Anonymous"}
                  </h1>
                  <p className="max-w-md text-sm text-indigo-100/70">
                    Track your meme creations, earnings, and momentum across the Mementic universe.
                  </p>
                </div>
                <div className="flex h-20 w-20 items-center justify-center rounded-2xl bg-indigo-500/20 text-4xl font-semibold uppercase shadow-inner shadow-indigo-500/30">
                  {sanitizedUsername ? sanitizedUsername.charAt(0) : "🪄"}
                </div>
              </div>

              <div className="grid gap-4 sm:grid-cols-2">
                <div className="rounded-2xl border border-indigo-400/30 bg-indigo-500/10 p-4 text-sm text-indigo-100">
                  <span className="text-xs uppercase tracking-wide text-indigo-200/70">Principal</span>
                  <span className="mt-2 block text-base font-semibold" title={principal}>
                    {principal ? principalPreview : "Not connected"}
                  </span>
                </div>
                <div className="rounded-2xl border border-purple-400/30 bg-purple-500/10 p-4 text-sm text-indigo-100">
                  <span className="text-xs uppercase tracking-wide text-indigo-200/70">Memes Created</span>
                  <span className="mt-2 block text-2xl font-semibold text-purple-100">{nfts.length}</span>
                </div>
              </div>

              {usernameSaved && !showUsernameEditor && (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-200">
                  Username updated successfully.
                </div>
              )}

              {showUsernameEditor ? (
                <form onSubmit={handleUsernameSubmit} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-indigo-100/70">
                    <User className="h-4 w-4 text-indigo-200" />
                    <span>Choose how you appear to other creators</span>
                  </div>
                  <Input
                    value={usernameInput}
                    onChange={(event) => {
                      setUsernameInput(event.target.value);
                      setUsernameError("");
                      setUsernameSaved(false);
                    }}
                    placeholder="e.g. MemeMaestro"
                    maxLength={32}
                    disabled={savingUsername}
                    className="bg-slate-950/60 text-slate-100 placeholder:text-slate-400"
                  />
                  {usernameError && <p className="text-xs text-rose-300">{usernameError}</p>}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" disabled={savingUsername} className="sm:flex-1">
                      {savingUsername ? "Saving…" : "Save username"}
                    </Button>
                    {hasUsername && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="sm:flex-1"
                        onClick={handleCancelUsername}
                        disabled={savingUsername}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-3 text-sm text-indigo-100/70 sm:flex-row sm:items-center sm:justify-between">
                  <p>
                    {hasUsername
                      ? "Your username is visible everywhere instead of your principal."
                      : "Pick a username so your principal stays private."}
                  </p>
                  <div className="flex items-center gap-3">
                    {!hasUsername && (
                      <Button size="sm" variant="secondary" onClick={handleEditUsername}>
                        Add username
                      </Button>
                    )}
                    {hasUsername && (
                      <Button size="sm" variant="ghost" onClick={handleEditUsername}>
                        Edit username
                      </Button>
                    )}
                  </div>
                </div>
              )}

              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/myplace")}
                  className="bg-indigo-500/30 hover:bg-indigo-500/40"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create meme
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/marketplace")}
                  className="border-indigo-400/40 text-indigo-100 hover:bg-indigo-500/10"
                >
                  Browse marketplace
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      await fetchData();
                      toast({
                        title: "Portfolio refreshed",
                        description: "Your latest stats are now up to date.",
                      });
                    } catch (error) {
                      toast({
                        title: "Refresh failed",
                        description: "Could not refresh portfolio data.",
                        variant: "destructive",
                      });
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing || loading}
                  className="border-indigo-400/40 text-indigo-100 hover:bg-indigo-500/10"
                >
                  {refreshing ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <ArrowUp className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-rose-300 hover:bg-rose-500/10"
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </CardContent>
          </Card>

          <div className="grid gap-6">
            <Card className="border-transparent bg-gradient-to-br from-amber-500/20 via-orange-500/10 to-pink-500/20 text-amber-100 shadow-lg shadow-orange-500/10">
              <CardContent className="flex flex-col gap-4 p-6">
                <div className="flex items-start justify-between">
                  <div>
                    <p className="text-xs font-semibold uppercase tracking-[0.35em] text-amber-200/80">Voting Power</p>
                    <p className="mt-3 text-4xl font-semibold text-amber-100">
                      {totalVotes.toLocaleString()}
                    </p>
                  </div>
                  <Sparkles className="h-8 w-8 text-amber-200" />
                </div>
                <p className="text-sm text-amber-100/70">
                  Total upvotes earned across every meme you've shared with the community.
                </p>
              </CardContent>
            </Card>

            <Card className="border border-indigo-500/20 bg-[#101532]/70 text-slate-100 shadow-lg shadow-indigo-900/20">
              <CardHeader className="pb-4">
                <CardTitle className="text-lg font-semibold text-slate-100">Creator Stats</CardTitle>
                <p className="text-xs uppercase tracking-[0.25em] text-indigo-200/70">
                  Snapshot of your portfolio
                </p>
              </CardHeader>
              <CardContent className="space-y-4">
                {[{
                  label: "Generated Memes",
                  value: generatedCount,
                  icon: Sparkles,
                  accent: "bg-indigo-500/10 text-indigo-100"
                }, {
                  label: "Minted NFTs",
                  value: mintedCount,
                  icon: Crown,
                  accent: "bg-purple-500/10 text-purple-100"
                }, {
                  label: "Marketplace Listings",
                  value: listedCount,
                  icon: TrendingUp,
                  accent: "bg-sky-500/10 text-sky-100"
                }, {
                  label: "Total Sales",
                  value: totalSales,
                  icon: Coins,
                  accent: "bg-amber-500/10 text-amber-100"
                }].map(({ label, value, icon: Icon, accent }) => (
                  <div key={label} className="flex items-center justify-between rounded-xl border border-white/5 bg-white/5 p-3">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-indigo-200/70">{label}</p>
                      <p className="mt-1 text-xl font-semibold">{value.toLocaleString()}</p>
                    </div>
                    <div className={`flex h-10 w-10 items-center justify-center rounded-lg ${accent}`}>
                      <Icon className="h-5 w-5" />
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>
          </div>
        </div>

        <Card className="border-transparent bg-gradient-to-br from-[#111738]/70 via-[#0a0f27]/60 to-[#210b2f]/60 text-slate-100 shadow-xl shadow-purple-500/10">
          <CardHeader className="pb-6">
            <div className="flex items-center justify-between">
              <div>
                <CardTitle className="text-2xl font-semibold text-slate-100">Performance Metrics</CardTitle>
                <p className="text-sm text-indigo-200/70">
                  Understand how your creations perform across the ecosystem.
                </p>
              </div>
            </div>
          </CardHeader>
          <CardContent className="space-y-8">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {[{
                label: "ICP Earned",
                value: `${totalEarnings.toFixed(2)} ICP`,
                icon: Coins,
              }, {
                label: "Total Views",
                value: totalViews.toLocaleString(),
                icon: Sparkles,
              }, {
                label: "Average ICP / Vote",
                value: `${avgEarningsPerVote.toFixed(3)} ICP`,
                icon: TrendingUp,
              }, {
                label: "Listed Share",
                value: `${listedProgress}%`,
                icon: ArrowUp,
              }].map(({ label, value, icon: Icon }) => (
                <div key={label} className="rounded-2xl border border-white/5 bg-white/5 p-4">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-xs uppercase tracking-wide text-indigo-200/70">{label}</p>
                      <p className="mt-3 text-2xl font-semibold text-slate-100">{value}</p>
                    </div>
                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-slate-900/60">
                      <Icon className="h-5 w-5 text-indigo-100" />
                    </div>
                  </div>
                </div>
              ))}
            </div>

            <div className="grid gap-8 lg:grid-cols-[auto,1fr]">
              <div className="flex items-center justify-center">
                <div className="relative h-32 w-32">
                  <div className="absolute inset-0 rounded-full bg-slate-900/70" />
                  <div
                    className="relative flex h-full w-full items-center justify-center rounded-full p-1"
                    style={{
                      background: `conic-gradient(rgba(168,85,247,0.95) ${mintedProgress * 3.6}deg, rgba(30,41,59,0.35) 0deg)`,
                    }}
                  >
                    <div className="flex h-full w-full items-center justify-center rounded-full bg-[#090d21]">
                      <span className="text-2xl font-semibold text-purple-100">{mintedProgress}%</span>
                    </div>
                  </div>
                </div>
              </div>
              <div className="space-y-4 text-sm text-slate-200/80">
                <div className="flex items-center justify-between">
                  <span className="uppercase tracking-wide text-xs text-indigo-200/80">Minted Share</span>
                  <span className="text-base font-semibold text-purple-100">{mintedCount} / {nfts.length}</span>
                </div>
                <p className="text-slate-300/70">
                  Portion of your generated memes that have reached NFT status.
                </p>
                <div className="flex items-center justify-between pt-2">
                  <span className="uppercase tracking-wide text-xs text-indigo-200/80">Marketplace Ready</span>
                  <span className="text-base font-semibold text-indigo-100">{listedCount.toLocaleString()} listed</span>
                </div>
                <p className="text-slate-300/70">
                  {listedCount === 0
                    ? "None of your memes are currently listed for bidding."
                    : "Your memes are live on the marketplace and ready for new collectors."}
                </p>
              </div>
            </div>
          </CardContent>
        </Card>

        <section className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-indigo-500/20 text-indigo-100">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Generated Memes</h2>
                <p className="text-sm text-indigo-200/70">
                  Keep your meme factory buzzing and convert momentum into NFTs.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/myplace")} className="bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/20">
              <Sparkles className="mr-2 h-4 w-4" />
              Create new meme
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : generatedMemes.length === 0 ? (
            <Card className="border border-dashed border-indigo-400/40 bg-slate-900/40 py-16 text-center text-indigo-100">
              <CardContent>
                <CardTitle className="text-xl">No generated memes yet</CardTitle>
                <p className="mt-3 text-sm text-indigo-200/70">
                  Launch your first meme to start earning votes and collector attention.
                </p>
                <Button onClick={() => navigate("/myplace")} className="mt-6 bg-indigo-500 text-white">
                  Start creating
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {generatedMemes.map((nft) => (
                <Card key={nft.id} className="border border-indigo-500/20 bg-[#0c1128]/80 shadow-lg shadow-indigo-900/30">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      {nft.imageUrl ? (
                        <img
                          src={nft.imageUrl}
                          alt={nft.title}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-indigo-500/20 text-3xl">
                          {nft.emoji}
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <h3 className="text-lg font-semibold text-slate-100 line-clamp-2">{nft.title}</h3>
                        <p className="text-xs uppercase tracking-wide text-indigo-200/70">#{nft.id}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-indigo-100/80">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-indigo-200/70">Votes</p>
                        <p className="mt-2 text-xl font-semibold text-amber-100">{nft.votes.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-indigo-200/70">Views</p>
                        <p className="mt-2 text-xl font-semibold text-sky-100">{nft.views.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-indigo-200/70">Earned</p>
                        <p className="mt-2 text-xl font-semibold text-emerald-100">{nft.earnedIcp.toFixed(4)} ICP</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-indigo-200/70">Status</p>
                        <p className="mt-2 text-sm font-semibold text-emerald-100">Earning</p>
                      </div>
                    </div>
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="default"
                        size="sm"
                        onClick={() => handleSell(nft.id)}
                        className="bg-gradient-to-r from-indigo-500 to-purple-500"
                      >
                        List for sale
                      </Button>
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => handleKeep(nft.id)}
                        className="border-indigo-400/40 text-indigo-100 hover:bg-indigo-500/10"
                      >
                        Keep earning
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-purple-500/20 text-purple-100">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-slate-100">Minted NFTs</h2>
                <p className="text-sm text-indigo-200/70">
                  Celebrate the memes that made it on-chain and keep an eye on collector interest.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/marketplace")} className="bg-gradient-to-r from-purple-500 to-pink-500 text-white shadow-lg shadow-purple-500/20">
              Visit marketplace
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : mintedNFTs.length === 0 ? (
            <Card className="border border-dashed border-purple-400/40 bg-slate-900/40 py-16 text-center text-purple-100">
              <CardContent>
                <CardTitle className="text-xl">No minted NFTs yet</CardTitle>
                <p className="mt-3 text-sm text-purple-200/70">
                  Top-performing memes are automatically minted when they reach the spotlight.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mintedNFTs.map((nft) => (
                <Card key={nft.id} className="border border-purple-500/30 bg-[#140f2c]/80 shadow-lg shadow-purple-900/30">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      {nft.imageUrl ? (
                        <img
                          src={nft.imageUrl}
                          alt={nft.title}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-purple-500/20 text-3xl">
                          {nft.emoji}
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <h3 className="text-lg font-semibold text-slate-100 line-clamp-2">{nft.title}</h3>
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">#{nft.id}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-purple-100/80">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">Votes</p>
                        <p className="mt-2 text-xl font-semibold text-amber-100">{nft.votes.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">Views</p>
                        <p className="mt-2 text-xl font-semibold text-sky-100">{nft.views.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">Earned</p>
                        <p className="mt-2 text-xl font-semibold text-emerald-100">{nft.earnedIcp.toFixed(4)} ICP</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">Status</p>
                        <p className="mt-2 text-sm font-semibold text-purple-100">Minted NFT</p>
                      </div>
                    </div>
                    {typeof nft.listingPrice === "number" && (
                      <div className="rounded-xl bg-white/5 p-3 text-xs text-purple-100/80">
                        <p className="uppercase tracking-wide text-purple-200/70">Last listing</p>
                        <p className="mt-2 text-base font-semibold text-purple-100">{nft.listingPrice.toFixed(2)} ICP</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/marketplace")}
                        className="border-purple-400/40 text-purple-100 hover:bg-purple-500/10"
                      >
                        View on marketplace
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6 rounded-3xl border border-indigo-500/20 bg-[#0d122c]/80 p-8 shadow-lg shadow-indigo-900/20">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-sky-500/20 text-sky-100">
              <MessageSquare className="h-6 w-6" />
            </div>
            <div>
              <h2 className="text-2xl font-semibold text-slate-100">Share your feedback</h2>
              <p className="text-sm text-indigo-200/70">
                Help us shape the next wave of meme tools and creator features.
              </p>
            </div>
          </div>
          <FeedbackForm />
        </section>
      </main>
    </div>
  );
}

export default Portfolio;
