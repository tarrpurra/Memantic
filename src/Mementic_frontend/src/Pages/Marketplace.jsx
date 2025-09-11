import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { MemeCard } from "../components/MemeCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import backendService from "../services/backendService.js";
import {
  TrendingUp,
  Crown,
  Filter,
  Search,
  ArrowUp,
  Timer,
  User,
  Sparkles,
  LogIn,
  Home,
  Zap,
} from "lucide-react";

// --- Small utilities ---
const PAGE_SIZE = 12;

const ensureArray = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);

/** Safely convert BigInt-ish values to number */
const safeBigIntToNumber = (value) => {
  if (typeof value === "bigint") {
    const MAX = BigInt(Number.MAX_SAFE_INTEGER);
    const MIN = BigInt(Number.MIN_SAFE_INTEGER);
    if (value > MAX) return Number.MAX_SAFE_INTEGER;
    if (value < MIN) return Number.MIN_SAFE_INTEGER;
    return Number(value);
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    try {
      // handle "123n" style
      if (/^-?\d+n$/.test(value)) {
        const bi = BigInt(value.slice(0, -1));
        return safeBigIntToNumber(bi);
      }
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
  return 0;
};

/** Safe id string (never React key or URL param with raw BigInt) */
const toSafeIdString = (v)=> {
  if (typeof v === "bigint") return v.toString(10);
  if (typeof v === "number") return Number.isFinite(v) ? String(v) : `${Date.now()}`;
  if (typeof v === "string") return v || `${Date.now()}`;
  return `${Date.now()}`;
};

/** Only create BigInt if id is strictly numeric */
const toOptionalBigInt = (id) => (/^\d+$/.test(id) ? BigInt(id) : null);

/** Optional: strip BigInts before logging (avoids console implicit conversions) */
const stripBigInts = (obj)=> {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(stripBigInts);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(Object.entries(obj).map(([k, v]) => [k, stripBigInts(v)]));
  }
  return obj;
};

const normalizeMeme = (m, extra= {}) => {
  // Supports PublicStoredMeme { id, owner, meme_data{...}, created_at, ... }
  const md = m?.meme_data || m;
  const owner = m?.owner ?? md?.owner ?? m?.creator;

  // Handle different vote structures
  const up = safeBigIntToNumber(
    extra?.votes?.upvotes ?? md?.upvotes ?? m?.upvotes ?? m?.votes ?? 0
  );
  const down = safeBigIntToNumber(
    extra?.votes?.downvotes ?? md?.downvotes ?? m?.downvotes ?? 0
  );
  const score = safeBigIntToNumber(m?.votes ?? m?.score ?? (up - down));

  // Extract image URL from various possible locations
  let image_url =
    md?.image_url || m?.image_url || m?.url || m?.image || md?.url || "";

  // Ensure we have a likely-valid URL
  if (image_url && !/^https?:\/\//i.test(image_url)) {
    image_url = "";
  }

  // Handle owner/principal conversion
  let creator = "Anonymous";
  if (owner) {
    if (typeof owner === "string") {
      creator = owner;
    } else if (typeof owner === "object" && (owner).toText) {
      // Handle Principal objects
      creator = (owner).toText();
    } else {
      creator = String(owner);
    }
    // Truncate long principal IDs for display
    if (creator.length > 20) {
      creator = creator.slice(0, 8) + "..." + creator.slice(-6);
    }
  }

  return {
    id: toSafeIdString(m?.id ?? m?.meme_id ?? m?._id ?? m?.uuid ?? Date.now()),
    title: md?.title || md?.prompt || m?.title || m?.prompt || "Untitled Meme",
    prompt: md?.prompt || m?.prompt || "",
    creator,
    image_url,
    votes: score,
    views: safeBigIntToNumber(m?.market_data?.views ?? m?.views ?? 0),
    created_at: safeBigIntToNumber(
      m?.created_at ?? md?.created_at ?? m?.timestamp ?? Date.now()
    ),
    rank: safeBigIntToNumber(extra?.rank ?? m?.rank ?? 0),
    emoji: m?.emoji || "🖼️",
    market_data: m?.market_data,
    __raw: m,
  };
};

function getWeekEndIST(now = new Date()) {
  const offsetIST = 330; // +05:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + offsetIST * 60000);

  const day = ist.getDay(); // 0=Sun ... 6=Sat
  const daysToSunday = (7 - day) % 7;
  const end = new Date(ist);
  end.setDate(ist.getDate() + daysToSunday);
  end.setHours(23, 59, 59, 999);

  const backUtc = end.getTime() - offsetIST * 60000;
  return new Date(backUtc - end.getTimezoneOffset() * 60000);
}

function formatRemaining(ms) {
  if (ms <= 0) return "0d 0h 0m";
  const d = Math.floor(ms / (24 * 3600e3));
  const h = Math.floor((ms % (24 * 3600e3)) / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  return `${d}d ${h}h ${m}m`;
}

const SkeletonCard = () => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6 animate-pulse">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted" />
      <div className="h-5 w-3/4 mx-auto bg-muted rounded mb-2" />
      <div className="h-4 w-1/2 mx-auto bg-muted rounded mb-6" />
      <div className="h-9 w-28 mx-auto bg-muted rounded" />
    </CardContent>
  </Card>
);

const Marketplace = () => {
  const { principal, isLoading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const { toast } = useToast();

  // UI State
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState("trending");
  const [page, setPage] = useState(1);

  // Data State
  const [topMemes, setTopMemes] = useState([]);
  const [memes, setMemes] = useState([]);
  const [total, setTotal] = useState(0);

  // Loading/Error
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Week countdown
  const [now, setNow] = useState(new Date());
  const weekEnd = useMemo(() => getWeekEndIST(now), [now]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const timeLeft = formatRemaining(weekEnd.getTime() - now.getTime());

  // Periodic refresh of vote counts and leaderboard
  useEffect(() => {
    if (!isAuthenticated) return;

    const refreshVotes = async () => {
      try {
        // Always refresh top memes leaderboard
        const leaderboardRes = await backendService.getCurrentLeaderboard(3);
        const entries = ensureArray(leaderboardRes?.top_memes);
        const updatedTopMemes = entries.map((e) => {
          const pm = Array.isArray(e?.meme_data) ? e.meme_data[0] : e?.meme_data;
          if (pm) {
            return normalizeMeme(pm, { rank: e?.rank, votes: e?.votes });
          }
          return normalizeMeme(
            {
              id: e?.meme_id,
              title: `Meme #${e?.meme_id ?? "?"}`,
              owner: e?.owner,
              meme_data: e?.meme_data,
            },
            { rank: e?.rank, votes: e?.votes }
          );
        });
        setTopMemes(updatedTopMemes);

        // Refresh current page memes with updated vote counts
        if (memes.length > 0) {
          const currentMemeIds = memes.map((m) => m.id);
          const updatedMemes = await Promise.all(
            currentMemeIds.map(async (memeId) => {
              try {
                const bid = toOptionalBigInt(String(memeId));
                if (!bid) return memes.find((m) => m.id === memeId);
                const voteData = await backendService.getMemeVotes(bid);
                if (voteData) {
                  return {
                    ...(memes.find((m) => m.id === memeId) ),
                    votes:
                      safeBigIntToNumber(voteData.upvotes) -
                      safeBigIntToNumber(voteData.downvotes),
                  };
                }
                return memes.find((m) => m.id === memeId) ;
              } catch (error) {
                console.warn(`Failed to get votes for meme ${memeId}:`, error);
                return memes.find((m) => m.id === memeId) ;
              }
            })
          );
          setMemes(updatedMemes);
        }
      } catch (error) {
        console.warn("Failed to refresh data:", error);
      }
    };

    // Run initial refresh immediately when component mounts
    refreshVotes();

    // Set up periodic refresh
    const refreshInterval = setInterval(refreshVotes, 60000); // Refresh every minute

    // Also refresh when user returns to the tab/window
    const handleVisibilityChange = () => {
      if (!document.hidden && isAuthenticated) {
        refreshVotes();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [isAuthenticated, memes]);

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filter memes based on search query
  const filteredMemes = useMemo(() => {
    const base = ensureArray(memes);
    if (!searchQuery.trim()) return base;
    const query = searchQuery.toLowerCase();
    return base.filter(
      (meme) =>
        (meme.title?.toLowerCase() ?? "").includes(query) ||
        (meme.prompt?.toLowerCase() ?? "").includes(query)
    );
  }, [memes, searchQuery]);

  // Fetch Top 3
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTop(true);
      setErrorMsg("");
      try {
        const res = await backendService.getCurrentLeaderboard(3);
        const entries = ensureArray(res?.top_memes);
        const arr = entries.map((e) => {
          const pm = Array.isArray(e?.meme_data) ? e.meme_data[0] : e?.meme_data;
          if (pm) {
            return normalizeMeme(pm, { rank: e?.rank, votes: e?.votes });
          }
          return normalizeMeme(
            { id: e?.meme_id, owner: e?.owner, meme_data: e?.meme_data },
            { rank: e?.rank, votes: e?.votes }
          );
        });
        if (!cancelled) setTopMemes(arr);
      } catch (e) {
        if (!cancelled) setErrorMsg("Failed to load top memes.");
      } finally {
        if (!cancelled) setLoadingTop(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch paginated list
  async function fetchList({ reset = false } = {}) {
    setLoadingList(true);
    setErrorMsg("");
    try {
      let arr = [];
      let fetchSource = "";

      try {
        // Try to get all memes first
        const rawAll = await backendService.getAllMemes();
        arr = ensureArray(rawAll).map((m) => normalizeMeme(m));
        fetchSource = "getAllMemes";
        // console.log(`Fetched ${arr.length} memes from getAllMemes`, stripBigInts(rawAll));
      } catch (err) {
        console.warn("getAllMemes failed, trying getMarketplaceMemes:", err);
        try {
          const rawMarketplace = await backendService.getMarketplaceMemes();
          arr = ensureArray(rawMarketplace).map((m) => normalizeMeme(m));
          fetchSource = "getMarketplaceMemes";
        } catch (err2) {
          console.warn("getMarketplaceMemes failed, trying getUserMemes:", err2);
          try {
            const rawUser = await backendService.getUserMemes();
            arr = ensureArray(rawUser).map((m) => normalizeMeme(m));
            fetchSource = "getUserMemes";
          } catch (err3) {
            console.warn("All meme fetching methods failed:", err3);
            // Sample data fallback
            arr = [
              normalizeMeme({
                id: "sample-1",
                title: "Sample Meme 1",
                prompt: "A funny sample meme",
                owner: "SampleUser",
                image_url: "",
                votes: 5,
                views: 10,
                created_at: Date.now(),
                emoji: "😂",
              }),
              normalizeMeme({
                id: "sample-2",
                title: "Sample Meme 2",
                prompt: "Another sample meme",
                owner: "SampleUser2",
                image_url: "",
                votes: 3,
                views: 8,
                created_at: Date.now() - 86400000,
                emoji: "🤣",
              }),
            ];
            fetchSource = "sample-data";
          }
        }
      }

      // Sort: newest first, tie-breaker by votes (both numeric now)
      arr.sort((a, b) => {
        const dateDiff = a.created_at === b.created_at ? 0 : b.created_at - a.created_at;
        if (dateDiff !== 0) return dateDiff;
        return (b.votes || 0) - (a.votes || 0);
      });

      // Client-side paging
      const start = (page - 1) * PAGE_SIZE;
      const slice = arr.slice(start, start + PAGE_SIZE);

      setTotal(arr.length);
      setMemes((prev) => (page === 1 || reset ? slice : [...ensureArray(prev), ...slice]));

      // Refresh vote counts for newly loaded memes
      if (slice.length > 0) {
        setTimeout(async () => {
          try {
            const currentMemeIds = slice.map((m) => m.id);
            const updatedMemes = await Promise.all(
              currentMemeIds.map(async (memeId) => {
                try {
                  const bid = toOptionalBigInt(String(memeId));
                  if (!bid) return slice.find((m) => m.id === memeId) ;
                  const voteData = await backendService.getMemeVotes(bid);
                  if (voteData) {
                    return {
                      ...(slice.find((m) => m.id === memeId)),
                      votes:
                        safeBigIntToNumber(voteData.upvotes) -
                        safeBigIntToNumber(voteData.downvotes),
                    };
                  }
                  return slice.find((m) => m.id === memeId);
                } catch (error) {
                  console.warn(`Failed to get initial votes for meme ${memeId}:`, error);
                  return slice.find((m) => m.id === memeId) ;
                }
              })
            );
            setMemes((prev) =>
              page === 1 || reset
                ? updatedMemes
                : [...ensureArray(prev).slice(0, -slice.length), ...updatedMemes]
            );
          } catch (error) {
            console.warn("Failed to refresh initial vote counts:", error);
          }
        }, 500);
      }
    } catch (e) {
      console.error("Failed to load memes:", e);
      setErrorMsg("Failed to load memes. Please try again.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    // eslint-disable-next-line react-hooks/exhaustive-deps
    fetchList({ reset: page === 1 });
  }, [page, searchQuery, sort]);

  // Enhanced ownership detection helper
  const checkMemeOwnership = (meme) => {
    if (!principal || !meme) return false;

    // Method 1: Check meme.owner
    if (meme.owner) {
      const ownerText =
        typeof meme.owner === "object" && meme.owner.toText
          ? meme.owner.toText()
          : String(meme.owner).trim();
      if (ownerText && principal === ownerText) return true;
    }

    // Method 2: Check meme.creator (already string-shortened in normalizeMeme)
    if (meme.creator) {
      const creatorText = String(meme.creator).trim();
      if (creatorText && principal === creatorText) return true;
    }

    // Method 3: Check raw meme data
    if (meme.__raw) {
      const raw = meme.__raw;
      if (raw.owner) {
        const rawOwnerText =
          typeof raw.owner === "object" && raw.owner.toText
            ? raw.owner.toText()
            : String(raw.owner).trim();
        if (rawOwnerText && principal === rawOwnerText) return true;
      }
      if (raw.meme_data?.owner) {
        const memeDataOwnerText =
          typeof raw.meme_data.owner === "object" && raw.meme_data.owner.toText
            ? raw.meme_data.owner.toText()
            : String(raw.meme_data.owner).trim();
        if (memeDataOwnerText && principal === memeDataOwnerText) return true;
      }
    }

    return false;
  };

  // Vote
  const votingLock = useRef(false);
  const handleVote = async (memeId, currentVotes = 0, memeOwner= null) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to vote on memes",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    // Enhanced self-voting prevention
    const isOwnMeme = checkMemeOwnership({ owner: memeOwner, creator: memeOwner });
    if (isOwnMeme) {
      toast({
        title: "Cannot Vote on Own Meme",
        description:
          "You cannot vote on your own memes to maintain fair competition",
        variant: "destructive",
      });
      return;
    }

    if (votingLock.current) return;
    votingLock.current = true;

    // optimistic update
    setMemes((prev) =>
      ensureArray(prev).map((m) =>
        String(m.id) === String(memeId)
          ? { ...m, votes: safeBigIntToNumber(m.votes || 0) + 1 }
          : m
      )
    );

    // Also update top memes if this meme is in the top 3
    setTopMemes((prev) =>
      ensureArray(prev).map((m) =>
        String(m.id) === String(memeId)
          ? { ...m, votes: safeBigIntToNumber(m.votes || 0) + 1 }
          : m
      )
    );

    try {
      const bid = toOptionalBigInt(String(memeId));
      if (!bid) {
        // Non-numeric/sample ids cannot be voted via backend
        throw new Error("Invalid meme id (non-numeric) for voting");
      }

      await backendService.voteMeme(bid, "Upvote");
      toast({
        title: "Voted! 🚀",
        description: "Your vote has been recorded successfully",
      });

      // Refresh the leaderboard after successful vote
      setTimeout(() => {
        backendService
          .getCurrentLeaderboard(3)
          .then((res) => {
            const entries = ensureArray(res?.top_memes);
            const arr = entries.map((e) => {
              const pm = Array.isArray(e?.meme_data) ? e.meme_data[0] : e?.meme_data;
              if (pm) {
                return normalizeMeme(pm, { rank: e?.rank, votes: e?.votes });
              }
              return normalizeMeme(
                { id: e?.meme_id, owner: e?.owner, meme_data: e?.meme_data },
                { rank: e?.rank, votes: e?.votes }
              );
            });
            setTopMemes(arr);
          })
          .catch((err) => console.warn("Failed to refresh leaderboard:", err));
      }, 1000);
    } catch (error) {
      console.error("Voting failed:", error);

      // revert optimistic update
      setMemes((prev) =>
        ensureArray(prev).map((m) =>
          String(m.id) === String(memeId) ? { ...m, votes: currentVotes } : m
        )
      );

      setTopMemes((prev) =>
        ensureArray(prev).map((m) =>
          String(m.id) === String(memeId) ? { ...m, votes: currentVotes } : m
        )
      );

      // Provide user-friendly error messages
      let errorTitle = "Voting Failed";
      let errorDescription = "Failed to vote on meme";

      if (error?.message) {
        if (error.message.includes("Cannot vote on your own meme")) {
          errorTitle = "Cannot Vote";
          errorDescription = "You cannot vote on your own memes";
        } else if (error.message.includes("Can only vote on memes from the current week")) {
          errorTitle = "Voting Period Ended";
          errorDescription = "This meme is from a previous week and voting has ended";
        } else if (error.message.includes("Voting period for the current week has ended")) {
          errorTitle = "Voting Period Ended";
          errorDescription = "The voting period for this week has ended";
        } else if (error.message.includes("Authentication required")) {
          errorTitle = "Authentication Required";
          errorDescription = "Please login to vote on memes";
        } else {
          errorDescription = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      votingLock.current = false;
    }
  };

  const handleCreateMeme = () => {
    if (!isAuthenticated) navigate("/login");
    else navigate("/myplace");
  };

  const handleRefreshVotes = async () => {
    if (!isAuthenticated) return;

    try {
      // Refresh top memes leaderboard
      const leaderboardRes = await backendService.getCurrentLeaderboard(3);
      const entries = ensureArray(leaderboardRes?.top_memes);
      const updatedTopMemes = entries.map((e) => {
        const pm = Array.isArray(e?.meme_data) ? e.meme_data[0] : e?.meme_data;
        if (pm) {
          return normalizeMeme(pm, { rank: e?.rank, votes: e?.votes });
        }
        return normalizeMeme(
          { id: e?.meme_id, owner: e?.owner, meme_data: e?.meme_data },
          { rank: e?.rank, votes: e?.votes }
        );
      });
      setTopMemes(updatedTopMemes);

      // Refresh all current memes with updated vote counts
      if (memes.length > 0) {
        const currentMemeIds = memes.map((m) => m.id);
        const updatedMemes = await Promise.all(
          currentMemeIds.map(async (memeId) => {
            try {
              const bid = toOptionalBigInt(String(memeId));
              if (!bid) return memes.find((m) => m.id === memeId) ;
              const voteData = await backendService.getMemeVotes(bid);
              if (voteData) {
                return {
                  ...(memes.find((m) => m.id === memeId) ),
                  votes:
                    safeBigIntToNumber(voteData.upvotes) -
                    safeBigIntToNumber(voteData.downvotes),
                };
              }
              return memes.find((m) => m.id === memeId);
            } catch (error) {
              console.warn(`Failed to refresh votes for meme ${memeId}:`, error);
              return memes.find((m) => m.id === memeId) ;
            }
          })
        );
        setMemes(updatedMemes);
      }

      toast({
        title: "Votes Refreshed! 🔄",
        description: "Vote counts have been updated with the latest data.",
      });
    } catch (error) {
      console.error("Failed to refresh votes:", error);
      toast({
        title: "Refresh Failed",
        description: "Could not refresh vote counts. Please try again.",
        variant: "destructive",
      });
    }
  };

  const canLoadMore = ensureArray(memes).length < total;

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <div className="flex items-center gap-3 mb-2">
                <Sparkles className="w-8 h-8 text-primary" />
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  Meme Marketplace
                </h1>
              </div>
              <p className="text-muted-foreground">
                Discover and vote on viral content
              </p>
            </div>

            <div className="flex items-center gap-3">
              <Button variant="ghost" onClick={() => navigate("/")}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>

              {authLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : isAuthenticated ? (
                <>
                  <Button
                    variant="outline"
                    onClick={handleRefreshVotes}
                    title="Refresh vote counts"
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    Refresh Votes
                  </Button>
                  <Button variant="outline" onClick={() => navigate("/portfolio")}>
                    <User className="w-4 h-4 mr-2" />
                    My Portfolio
                  </Button>
                  <Button variant="default" onClick={handleCreateMeme}>
                    <Zap className="w-4 h-4 mr-2" />
                    Create Meme
                  </Button>
                  <div className="text-sm text-muted-foreground hidden sm:block">
                    {principal ? `${principal.slice(0, 8)}...` : "Not logged in"}
                  </div>
                </>
              ) : (
                <Button variant="default" onClick={() => navigate("/login")}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Login to Vote
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Authentication Status Alert */}
        {!isAuthenticated && !authLoading && (
          <Card className="mb-6 border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <LogIn className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Want to participate?</p>
                  <p className="text-xs text-muted-foreground">
                    Login to vote on memes and create your own viral content
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate("/login")}>
                  Login Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search memes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Top 3 Memes Section */}
        <Card className="mb-8 bg-gradient-glow border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Crown className="w-6 h-6 text-yellow-500" />
                Top 3 Memes of the Week
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="w-4 h-4" />
                <span>Ends in {timeLeft}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {ensureArray(topMemes).map((meme) => (
                <Card key={meme.id} className="relative overflow-hidden">
                  {meme.rank === 1 && (
                    <div className="absolute top-2 left-2">
                      <Crown className="w-6 h-6 text-yellow-500" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center">
                      {meme.image_url ? (
                        <img
                          src={meme.image_url}
                          alt={meme.title}
                          className="w-full h-auto object-contain max-h-32 rounded-lg mb-4"
                          loading="lazy"
                        />
                      ) : (
                        <div className="text-6xl mb-4">{meme.emoji || "🖼️"}</div>
                      )}
                      <h3 className="font-bold text-lg mb-2">{meme.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        by {meme.creator}
                        {checkMemeOwnership(meme) && (
                          <span className="ml-2 text-xs text-orange-600 font-medium">
                            (You)
                          </span>
                        )}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant={isAuthenticated ? "outline" : "ghost"}
                          onClick={() => handleVote(meme.id, meme.votes, meme.creator)}
                          disabled={!isAuthenticated || checkMemeOwnership(meme)}
                          className={
                            !isAuthenticated || checkMemeOwnership(meme)
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }
                        >
                          <ArrowUp className="w-4 h-4 mr-1" />
                          {checkMemeOwnership(meme) ? "Your Meme" : meme.votes}
                          {!isAuthenticated && (
                            <span className="ml-1 text-xs">(Login to vote)</span>
                          )}
                          {checkMemeOwnership(meme) && (
                            <span className="ml-1 text-xs">(Cannot vote)</span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Memes Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              All Memes
            </h2>
            <div className="flex items-center gap-4">
              {searchQuery ? (
                <p className="text-sm text-muted-foreground">
                  Found {ensureArray(filteredMemes).length} of {total} meme
                  {ensureArray(filteredMemes).length !== 1 ? "s" : ""}
                </p>
              ) : (
                <p className="text-sm text-muted-foreground">
                  {total} meme{total !== 1 ? "s" : ""} available
                </p>
              )}
            </div>
          </div>
        </div>

        {ensureArray(filteredMemes).length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No memes found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery ? `No results for "${searchQuery}"` : "No memes available"}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {ensureArray(filteredMemes).map((meme) => (
              <MemeCard
                key={meme.id}
                meme={meme}
                onVote={(id, votes) =>
                  handleVote(id, votes, meme.creator)
                }
                isAuthenticated={isAuthenticated}
                currentUserPrincipal={principal}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {ensureArray(filteredMemes).length > 0 && canLoadMore && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg" onClick={() => setPage((p) => p + 1)}>
              <Sparkles className="w-4 h-4 mr-2" />
              Load More Memes
            </Button>
          </div>
        )}

        {/* Create Your Own CTA */}
        <Card className="mt-12 bg-gradient-card border-primary/30">
          <CardContent className="text-center py-8">
            <Zap className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">Ready to Create Your Own?</h3>
            <p className="text-muted-foreground mb-6">
              Join the community and start creating viral memes that earn votes
            </p>
            <Button size="lg" onClick={handleCreateMeme}>
              {isAuthenticated ? "Start Creating" : "Login to Create"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Marketplace;
