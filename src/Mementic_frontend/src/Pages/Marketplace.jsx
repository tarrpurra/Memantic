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
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import Navigation from "../components/Navigation";
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
  Zap,
  X,
  Heart,
  Eye,
  Coins,
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
const toSafeIdString = (v) => {
  if (typeof v === "bigint") return v.toString(10);
  if (typeof v === "number")
    return Number.isFinite(v) ? String(v) : `${Date.now()}`;
  if (typeof v === "string") return v || `${Date.now()}`;
  return `${Date.now()}`;
};

/** Only create BigInt if id is strictly numeric */
const toOptionalBigInt = (id) => (/^\d+$/.test(id) ? BigInt(id) : null);

/** Optional: strip BigInts before logging (avoids console implicit conversions) */
const stripBigInts = (obj) => {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(stripBigInts);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, stripBigInts(v)])
    );
  }
  return obj;
};

const normalizeMeme = (m, extra = {}) => {
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
  const score = safeBigIntToNumber(m?.votes ?? m?.score ?? up - down);

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
    } else if (typeof owner === "object" && owner.toText) {
      // Handle Principal objects
      creator = owner.toText();
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
    created_at: (() => {
      const raw = safeBigIntToNumber(m?.created_at) || safeBigIntToNumber(md?.created_at) || safeBigIntToNumber(m?.timestamp) || Date.now();
      // Convert nanoseconds to milliseconds if needed
      const ms = raw > 1e15 ? Math.floor(raw / 1e6) : raw;
      return ms > 1000000000000 ? ms : Date.now();
    })(),
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

function getWeekStartIST(now = new Date()) {
  const offsetIST = 330; // +05:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + offsetIST * 60000);

  const day = ist.getDay(); // 0=Sun
  const daysToLastSunday = day;
  const start = new Date(ist);
  start.setDate(ist.getDate() - daysToLastSunday);
  start.setHours(0, 0, 0, 0);

  const backUtc = start.getTime() - offsetIST * 60000;
  return new Date(backUtc - start.getTimezoneOffset() * 60000);
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

// --- Preview Modal ---
function PreviewModal({
  open,
  onClose,
  meme,
  onLike,
  isAuthenticated,
  isOwn,
}) {
  const [hasVoted, setHasVoted] = useState(false);
  const [loadingVoteStatus, setLoadingVoteStatus] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Check vote status when meme changes
  useEffect(() => {
    if (!open || !meme || !isAuthenticated || isOwn) {
      setHasVoted(false);
      setLoadingVoteStatus(false);
      return;
    }

    const checkVoteStatus = async () => {
      setLoadingVoteStatus(true);
      try {
        const bid = toOptionalBigInt(String(meme.id));
        if (!bid) {
          setHasVoted(false);
        } else {
          const userVote = await backendService.getUserVote(bid);
          setHasVoted(!!userVote);
        }
      } catch (error) {
        console.warn("Failed to check vote status:", error);
        setHasVoted(false);
      } finally {
        setLoadingVoteStatus(false);
      }
    };

    checkVoteStatus();
  }, [open, meme, isAuthenticated, isOwn]);

  if (!open || !meme) return null;

  const createdAt = (meme.created_at && !isNaN(Number(meme.created_at)) && Number(meme.created_at) > 1000000000000) ? Number(meme.created_at) : Date.now();
  const createdDate = new Date(createdAt);
  const createdStr = createdDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-[95vw] max-w-7xl h-[95vh] overflow-hidden">
        <div className="flex h-full">
          {/* Left Panel: Image */}
          <div className="flex-1 flex items-center justify-center bg-muted p-4 overflow-auto ">
            {meme.image_url ? (
              <img
                src={meme.image_url}
                alt={meme.title}
                className="max-w-full"
                loading="lazy"
              />
            ) : (
              <div className="text-9xl">
                {meme.emoji || "🖼️"}
              </div>
            )}
          </div>

          {/* Right Panel: Info */}
          <div className="w-96 flex flex-col border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center text-card font-bold">
                  {meme.creator?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <div className="font-semibold">{meme.creator || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{createdStr}</div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={onClose} title="Close">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{meme.title}</h3>
                  {meme.prompt && (
                    <p className="text-sm text-muted-foreground">{meme.prompt}</p>
                  )}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-black">{meme.votes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-blue-500">{meme.views ?? 0} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-500">{meme.stakeAmount || 0} ICP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-border">
              <Button
                size="sm"
                variant={hasVoted ? "secondary" : (isAuthenticated && !isOwn ? "default" : "outline")}
                onClick={() => {
                  onLike(meme.id, meme.votes, meme.creator);
                  setHasVoted(true); // Optimistic update
                }}
                disabled={!isAuthenticated || !hasProfileName || isOwn || hasVoted || loadingVoteStatus}
                className={(!isAuthenticated || isOwn || hasVoted) ? "opacity-60" : ""}
                title={
                  !isAuthenticated
                    ? "Login to like"
                    : isOwn
                    ? "Can't like your own meme"
                    : hasVoted
                    ? "You have already voted on this meme"
                    : loadingVoteStatus
                    ? "Checking vote status..."
                    : "Like"
                }
              >
                <Heart className={`w-4 h-4 mr-2 ${hasVoted ? "fill-current" : ""}`} />
                {loadingVoteStatus ? (
                  <>
                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
                    Loading...
                  </>
                ) : isOwn ? (
                  "Your Meme"
                ) : hasVoted ? (
                  `Voted (${meme.votes})`
                ) : (
                  `Vote (${meme.votes})`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

const Marketplace = () => {
  const { principal, username, isLoading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const sanitizedUsername = typeof username === "string" ? username.trim() : "";
  const hasProfileName = sanitizedUsername.length > 0;

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

  const currentDisplayName =
    sanitizedUsername || (principal ? `${principal.slice(0, 8)}...` : "Not logged in");

  // Week countdown
  const [now, setNow] = useState(new Date());
  const weekEnd = useMemo(() => getWeekEndIST(now), [now]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const timeLeft = formatRemaining(weekEnd.getTime() - now.getTime());

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Sign in to access the marketplace.",
        variant: "destructive",
      });
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    if (!hasProfileName) {
      toast({
        title: "Complete your profile",
        description: "Choose a username before exploring the marketplace.",
      });
      navigate("/login", {
        replace: true,
        state: { from: location.pathname, requireUsername: true },
      });
    }
  }, [authLoading, hasProfileName, isAuthenticated, location.pathname, navigate, toast]);

  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMeme, setSelectedMeme] = useState(null);

  // Periodic refresh of vote counts and leaderboard
  useEffect(() => {
    if (!isAuthenticated || !hasProfileName) return;

    const refreshVotes = async () => {
      try {
        // Always refresh top memes leaderboard
        const leaderboardRes = await backendService.getCurrentLeaderboard(3);
        const entries = ensureArray(leaderboardRes?.top_memes);
        const updatedTopMemes = entries.map((e) => {
          const pm = Array.isArray(e?.meme_data)
            ? e.meme_data[0]
            : e?.meme_data;
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
                    ...memes.find((m) => m.id === memeId),
                    votes:
                      safeBigIntToNumber(voteData.upvotes) -
                      safeBigIntToNumber(voteData.downvotes),
                  };
                }
                return memes.find((m) => m.id === memeId);
              } catch (error) {
                console.warn(`Failed to get votes for meme ${memeId}:`, error);
                return memes.find((m) => m.id === memeId);
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
      if (!document.hidden && isAuthenticated && hasProfileName) {
        refreshVotes();
      }
    };

    document.addEventListener("visibilitychange", handleVisibilityChange);

    return () => {
      clearInterval(refreshInterval);
      document.removeEventListener("visibilitychange", handleVisibilityChange);
    };
  }, [hasProfileName, isAuthenticated]);

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
    if (!isAuthenticated || !hasProfileName) {
      setTopMemes([]);
      setLoadingTop(false);
      return () => undefined;
    }

    let cancelled = false;
    (async () => {
      setLoadingTop(true);
      setErrorMsg("");
      try {
        const res = await backendService.getCurrentLeaderboard(3);
        const entries = ensureArray(res?.top_memes);
        const arr = entries.map((e) => {
          const pm = Array.isArray(e?.meme_data)
            ? e.meme_data[0]
            : e?.meme_data;
          if (pm) {
            return normalizeMeme(pm, { rank: e?.rank, votes: e?.votes });
          }
          return normalizeMeme(
            { id: e?.meme_id, owner: e?.owner, meme_data: e?.meme_data },
            { rank: e?.rank, votes: e?.votes }
          );
        });
        // Filter to current week only
        const weekStart = getWeekStartIST();
        const filteredArr = arr.filter(m => m.created_at >= weekStart.getTime());
        if (!cancelled) setTopMemes(filteredArr);
      } catch (e) {
        if (!cancelled) setErrorMsg("Failed to load top memes.");
      } finally {
        if (!cancelled) setLoadingTop(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasProfileName, isAuthenticated]);

  // Fetch paginated list
  async function fetchList({ reset = false } = {}) {
    if (authLoading || !isAuthenticated || !hasProfileName) {
      if (reset) {
        setMemes([]);
        setTotal(0);
      }
      setLoadingList(false);
      if (!authLoading && (!isAuthenticated || !hasProfileName)) {
        setErrorMsg("Please login to view the marketplace.");
      }
      return;
    }

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
          console.warn(
            "getMarketplaceMemes failed, trying getUserMemes:",
            err2
          );
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
        const dateDiff =
          a.created_at === b.created_at ? 0 : b.created_at - a.created_at;
        if (dateDiff !== 0) return dateDiff;
        return (b.votes || 0) - (a.votes || 0);
      });

      // Filter to current week only (cleanup old memes)
      const weekStart = getWeekStartIST();
      arr = arr.filter(m => m.created_at >= weekStart.getTime());

      // Client-side paging
      const start = (page - 1) * PAGE_SIZE;
      const slice = arr.slice(start, start + PAGE_SIZE);

      setTotal(arr.length);
      setMemes((prev) =>
        page === 1 || reset ? slice : [...ensureArray(prev), ...slice]
      );

      // Refresh vote counts for newly loaded memes
      if (slice.length > 0) {
        setTimeout(async () => {
          try {
            const currentMemeIds = slice.map((m) => m.id);
            const updatedMemes = await Promise.all(
              currentMemeIds.map(async (memeId) => {
                try {
                  const bid = toOptionalBigInt(String(memeId));
                  if (!bid) return slice.find((m) => m.id === memeId);
                  const voteData = await backendService.getMemeVotes(bid);
                  if (voteData) {
                    return {
                      ...slice.find((m) => m.id === memeId),
                      votes:
                        safeBigIntToNumber(voteData.upvotes) -
                        safeBigIntToNumber(voteData.downvotes),
                    };
                  }
                  return slice.find((m) => m.id === memeId);
                } catch (error) {
                  console.warn(
                    `Failed to get initial votes for meme ${memeId}:`,
                    error
                  );
                  return slice.find((m) => m.id === memeId);
                }
              })
            );
            setMemes((prev) =>
              page === 1 || reset
                ? updatedMemes
                : [
                    ...ensureArray(prev).slice(0, -slice.length),
                    ...updatedMemes,
                  ]
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

  useEffect(() => {
    if (!authLoading && isAuthenticated && hasProfileName) {
      fetchList({ reset: true });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [authLoading, hasProfileName, isAuthenticated]);

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
  const handleVote = async (memeId, currentVotes = 0, memeOwner = null) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to vote on memes",
        variant: "destructive",
      });
      navigate("/login");
      return;
    }

    if (!hasProfileName) {
      toast({
        title: "Set a username first",
        description: "Choose a username before interacting with marketplace memes.",
      });
      navigate("/login", {
        state: { from: location.pathname, requireUsername: true },
      });
      return;
    }

    // Enhanced self-voting prevention
    const isOwnMeme = checkMemeOwnership({
      owner: memeOwner,
      creator: memeOwner,
    });
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

    // Update selected meme in modal
    setSelectedMeme((prev) =>
      prev && String(prev.id) === String(memeId)
        ? { ...prev, votes: safeBigIntToNumber(prev.votes || 0) + 1 }
        : prev
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
              const pm = Array.isArray(e?.meme_data)
                ? e.meme_data[0]
                : e?.meme_data;
              if (pm) {
                return normalizeMeme(pm, { rank: e?.rank, votes: e?.votes });
              }
              return normalizeMeme(
                { id: e?.meme_id, owner: e?.owner, meme_data: e?.meme_data },
                { rank: e?.rank, votes: e?.votes }
              );
            });
            const weekStart = getWeekStartIST();
            const filteredArr = arr.filter(m => m.created_at >= weekStart.getTime());
            setTopMemes(filteredArr);
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
        } else if (
          error.message.includes("Can only vote on memes from the current week")
        ) {
          errorTitle = "Voting Period Ended";
          errorDescription =
            "This meme is from a previous week and voting has ended";
        } else if (
          error.message.includes("Voting period for the current week has ended")
        ) {
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
    if (!isAuthenticated) {
      navigate("/login", { state: { from: location.pathname } });
      return;
    }

    if (!hasProfileName) {
      navigate("/login", {
        state: { from: location.pathname, requireUsername: true },
      });
      return;
    }

    navigate("/myplace");
  };

  const handleRefreshVotes = async () => {
    if (!isAuthenticated || !hasProfileName) return;

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
              if (!bid) return memes.find((m) => m.id === memeId);
              const voteData = await backendService.getMemeVotes(bid);
              if (voteData) {
                return {
                  ...memes.find((m) => m.id === memeId),
                  votes:
                    safeBigIntToNumber(voteData.upvotes) -
                    safeBigIntToNumber(voteData.downvotes),
                };
              }
              return memes.find((m) => m.id === memeId);
            } catch (error) {
              console.warn(
                `Failed to refresh votes for meme ${memeId}:`,
                error
              );
              return memes.find((m) => m.id === memeId);
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

  // Open preview modal
  const openPreview = (meme) => {
    setSelectedMeme(meme);
    setPreviewOpen(true);
  };

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center text-muted-foreground">
          Checking your session…
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasProfileName) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center text-muted-foreground">
          Redirecting to login…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Navigation />

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

        {/* Leaderboard Section */}
        <Card className="mb-8 bg-gradient-glow border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Crown className="w-6 h-6 text-yellow-500" />
                Weekly Leaderboard
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="w-4 h-4" />
                <span>Contest ends in {timeLeft}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {ensureArray(topMemes).map((meme, index) => {
                const rank = meme.rank || (index + 1);
                const isTop3 = rank <= 3;
                return (
                  <div
                    key={meme.id}
                    className={`flex items-center gap-4 p-4 rounded-lg border ${
                      rank === 1
                        ? "bg-gradient-to-r from-yellow-500/10 to-yellow-600/10 border-yellow-500/30"
                        : rank === 2
                        ? "bg-gradient-to-r from-gray-400/10 to-gray-500/10 border-gray-400/30"
                        : rank === 3
                        ? "bg-gradient-to-r from-orange-500/10 to-orange-600/10 border-orange-500/30"
                        : "bg-muted/50 border-border"
                    }`}
                  >
                    {/* Rank Badge */}
                    <div className={`flex items-center justify-center w-10 h-10 rounded-full font-bold text-lg ${
                      rank === 1
                        ? "bg-yellow-500 text-white"
                        : rank === 2
                        ? "bg-gray-400 text-white"
                        : rank === 3
                        ? "bg-orange-500 text-white"
                        : "bg-muted text-muted-foreground"
                    }`}>
                      {rank === 1 ? "👑" : rank === 2 ? "🥈" : rank === 3 ? "🥉" : rank}
                    </div>

                    {/* Image */}
                    <div className="flex-shrink-0">
                      {meme.image_url ? (
                        <img
                          src={meme.image_url}
                          alt={meme.title}
                          className="w-16 h-16 object-cover rounded-lg"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-16 h-16 flex items-center justify-center text-2xl bg-muted rounded-lg">
                          {meme.emoji || "🖼️"}
                        </div>
                      )}
                    </div>

                    {/* Content */}
                    <div className="flex-1 min-w-0">
                      <h4 className="font-semibold text-lg line-clamp-1">{meme.title}</h4>
                      <p className="text-sm text-muted-foreground">
                        by {meme.creator}
                        {checkMemeOwnership(meme) && (
                          <span className="ml-2 text-xs text-orange-600 font-medium">(You)</span>
                        )}
                      </p>
                      <p className="text-xs text-muted-foreground">
                        {new Date(meme.created_at || Date.now()).toLocaleString("en-IN", {
                          timeZone: "Asia/Kolkata",
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </p>
                      <div className="flex items-center gap-4 mt-1">
                        <div className="flex items-center gap-1 text-sm">
                          <Heart className="w-4 h-4 text-red-500" />
                          <span className="text-red-500">{meme.votes}</span>
                        </div>
                        <div className="flex items-center gap-1 text-sm">
                          <Eye className="w-4 h-4 text-blue-500" />
                          <span className="text-blue-500">{meme.views ?? 0}</span>
                        </div>
                      </div>
                    </div>

                    {/* Vote Button */}
                    <div className="flex-shrink-0">
                      <Button
                        size="sm"
                        variant={isAuthenticated ? "outline" : "ghost"}
                        onClick={() => handleVote(meme.id, meme.votes, meme.creator)}
                        disabled={!isAuthenticated || !hasProfileName || checkMemeOwnership(meme)}
                        className={
                          !isAuthenticated || checkMemeOwnership(meme)
                            ? "opacity-50 cursor-not-allowed"
                            : ""
                        }
                      >
                        <ArrowUp className="w-4 h-4 mr-1" />
                        {checkMemeOwnership(meme) ? "Yours" : "Vote"}
                      </Button>
                    </div>
                  </div>
                );
              })}
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
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "No memes available"}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {ensureArray(filteredMemes).filter(m => m).map((meme) => (
              <MemeCard
                key={meme.id}
                meme={meme}
                onVote={(id, votes) => handleVote(id, votes, meme.creator)}
                onVoteSuccess={(id) => {
                  // Optional: Could trigger additional actions after successful vote
                  console.log(`Vote successful for meme ${id}`);
                }}
                isAuthenticated={isAuthenticated}
                currentUserPrincipal={principal}
                onOpenPreview={openPreview}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {ensureArray(filteredMemes).length > 0 && canLoadMore && (
          <div className="text-center mt-12">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setPage((p) => p + 1)}
            >
              <Sparkles className="w-4 h-4 mr-2" />
              Load More Memes
            </Button>
          </div>
        )}

        {/* Create Your Own CTA */}
        <Card className="mt-12 bg-gradient-card border-primary/30">
          <CardContent className="text-center py-8">
            <Zap className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">
              Ready to Create Your Own?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join the community and start creating viral memes that earn votes
            </p>
            <Button size="lg" onClick={handleCreateMeme}>
              {isAuthenticated ? "Start Creating" : "Login to Create"}
            </Button>
          </CardContent>
        </Card>
      </div>

      {/* Preview Modal */}
      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        meme={selectedMeme}
        onLike={handleVote}
        isAuthenticated={isAuthenticated}
        isOwn={selectedMeme ? checkMemeOwnership(selectedMeme) : false}
      />
    </div>
  );
};

export default Marketplace;
