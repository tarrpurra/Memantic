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
  Timer,
  User,
  Sparkles,
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

const formatNumber = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
};

const formatIcp = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
};

const normalizeMeme = (m, extra = {}) => {
  // Supports PublicStoredMeme { id, owner, meme_data{...}, created_at, ... }
  const md = m?.meme_data || m;
  const owner = m?.owner ?? md?.owner ?? m?.creator;
  const unwrapOptional = (value) => (Array.isArray(value) ? value[0] : value);

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

  const captionCandidate = unwrapOptional(md?.caption ?? m?.caption);
  const safeCaption =
    typeof captionCandidate === "string" && captionCandidate.trim().length > 0
      ? captionCandidate.trim()
      : "";

  const promptText =
    typeof md?.prompt === "string"
      ? md.prompt
      : typeof m?.prompt === "string"
      ? m.prompt
      : "";

  return {
    id: toSafeIdString(m?.id ?? m?.meme_id ?? m?._id ?? m?.uuid ?? Date.now()),
    title:
      safeCaption ||
      md?.title ||
      m?.title ||
      promptText ||
      "Untitled Meme",
    caption: safeCaption,
    prompt: promptText,
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
                  {meme.caption && (
                    <p className="text-sm text-muted-foreground">{meme.caption}</p>
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
  const [selectedCreator, setSelectedCreator] = useState("all");
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
      navigate("/portfolio", {
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
    let base = ensureArray(memes);
    if (selectedCreator !== "all") {
      base = base.filter((meme) => meme.creator === selectedCreator);
    }
    if (!searchQuery.trim()) return base;
    const query = searchQuery.toLowerCase();
    return base.filter(
      (meme) =>
        (meme.title?.toLowerCase() ?? "").includes(query) ||
        (meme.caption?.toLowerCase() ?? "").includes(query) ||
        (meme.prompt?.toLowerCase() ?? "").includes(query)
    );
  }, [memes, searchQuery, selectedCreator]);

  const totalVotes = useMemo(
    () =>
      ensureArray(memes).reduce(
        (acc, meme) => acc + safeBigIntToNumber(meme?.votes || 0),
        0
      ),
    [memes]
  );

  const totalViews = useMemo(
    () =>
      ensureArray(memes).reduce(
        (acc, meme) => acc + safeBigIntToNumber(meme?.views || 0),
        0
      ),
    [memes]
  );

  const listedCount = useMemo(
    () => ensureArray(memes).filter((meme) => meme?.market_data?.is_listed).length,
    [memes]
  );

  const uniqueCreators = useMemo(() => {
    const creators = new Set();
    ensureArray(memes).forEach((meme) => {
      if (meme?.creator) creators.add(meme.creator);
    });
    return creators.size;
  }, [memes]);

  const creatorStats = useMemo(() => {
    const stats = new Map();
    ensureArray(memes).forEach((meme) => {
      const creator = meme?.creator || "Anonymous";
      if (!stats.has(creator)) {
        stats.set(creator, { creator, count: 0, votes: 0 });
      }
      const entry = stats.get(creator);
      entry.count += 1;
      entry.votes += safeBigIntToNumber(meme?.votes || 0);
    });
    return Array.from(stats.values())
      .sort((a, b) =>
        b.votes !== a.votes ? b.votes - a.votes : b.count - a.count
      )
      .slice(0, 6);
  }, [memes]);

  const topTrending = useMemo(
    () => ensureArray(topMemes).filter(Boolean).slice(0, 3),
    [topMemes]
  );

  const shareOfTop = useMemo(() => {
    if (!totalVotes || topTrending.length === 0) return 0;
    const leadVotes = safeBigIntToNumber(topTrending[0]?.votes || 0);
    return Math.round((leadVotes / totalVotes) * 100);
  }, [topTrending, totalVotes]);

  const recentMemes = useMemo(
    () => ensureArray(memes).slice(0, 5),
    [memes]
  );

  const priceRange = useMemo(() => {
    const prices = ensureArray(memes)
      .map((meme) => safeBigIntToNumber(meme?.market_data?.listing_price ?? 0))
      .filter((price) => price > 0);
    if (prices.length === 0) return null;
    const minIcp = Math.min(...prices) / 1e8;
    const maxIcp = Math.max(...prices) / 1e8;
    return {
      min: formatIcp(minIcp),
      max: formatIcp(maxIcp),
      count: prices.length,
    };
  }, [memes]);

  const marketplaceTags = useMemo(() => {
    const tags = [];
    if (listedCount > 0) {
      tags.push({ label: `${formatNumber(listedCount)} listed`, value: "listed" });
    }
    if (totalVotes > 0) {
      tags.push({ label: `${formatNumber(totalVotes)} votes`, value: "votes" });
    }
    if (totalViews > 0) {
      tags.push({ label: `${formatNumber(totalViews)} views`, value: "views" });
    }
    if (topTrending[0]) {
      tags.push({ label: `Top: ${topTrending[0].title}`, value: topTrending[0].id });
    }
    return tags.slice(0, 4);
  }, [listedCount, totalVotes, totalViews, topTrending]);

  const sortOptions = useMemo(
    () => [
      {
        value: "trending",
        label: "Trending",
        icon: TrendingUp,
        meta: `${formatNumber(totalVotes)} votes`,
      },
      {
        value: "newest",
        label: "Newest",
        icon: Sparkles,
        meta: `${formatNumber(ensureArray(memes).length)} drops`,
      },
      {
        value: "top",
        label: "Top Voted",
        icon: Crown,
        meta: `${formatNumber(totalViews)} views`,
      },
      {
        value: "listed",
        label: "Listed",
        icon: Coins,
        meta: `${formatNumber(listedCount)} live`,
      },
    ],
    [listedCount, memes, totalViews, totalVotes]
  );

  const selectedCreatorLabel =
    selectedCreator === "all" ? "all creators" : selectedCreator;

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
                caption: "Sample Meme 1",
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
                caption: "Sample Meme 2",
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

      const getCreatedAt = (meme) => safeBigIntToNumber(meme?.created_at || 0);
      const getVotes = (meme) => safeBigIntToNumber(meme?.votes || 0);
      const getViews = (meme) => safeBigIntToNumber(meme?.views || 0);

      if (sort === "newest") {
        arr.sort((a, b) => {
          const dateDiff = getCreatedAt(b) - getCreatedAt(a);
          if (dateDiff !== 0) return dateDiff;
          return getVotes(b) - getVotes(a);
        });
      } else if (sort === "top") {
        arr.sort((a, b) => {
          const voteDiff = getVotes(b) - getVotes(a);
          if (voteDiff !== 0) return voteDiff;
          return getViews(b) - getViews(a);
        });
      } else if (sort === "listed") {
        arr.sort((a, b) => {
          const aListed = a?.market_data?.is_listed ? 1 : 0;
          const bListed = b?.market_data?.is_listed ? 1 : 0;
          if (aListed !== bListed) return bListed - aListed;
          const voteDiff = getVotes(b) - getVotes(a);
          if (voteDiff !== 0) return voteDiff;
          return getCreatedAt(b) - getCreatedAt(a);
        });
      } else {
        arr.sort((a, b) => {
          const scoreA = getVotes(a) * 2 + getViews(a);
          const scoreB = getVotes(b) * 2 + getViews(b);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return getCreatedAt(b) - getCreatedAt(a);
        });
      }

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
      navigate("/portfolio", {
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
      navigate("/portfolio", {
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
    <div className="min-h-screen bg-[#050B1C] text-slate-100">
      <Navigation />

      <div className="mx-auto flex w-full max-w-[1400px] flex-col gap-10 px-4 py-10 lg:px-6">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <span className="inline-flex items-center gap-2 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold uppercase tracking-wide text-primary-100">
              <Sparkles className="h-3 w-3" />
              Weekly marketplace
            </span>
            <h1 className="text-3xl font-semibold tracking-tight text-white sm:text-4xl">
              Discover the memes steering culture this week
            </h1>
            <p className="max-w-xl text-sm text-slate-400">
              Welcome back, {currentDisplayName}. Vote, collect, and champion the creations from {selectedCreatorLabel}.
            </p>
          </div>
          <div className="w-full space-y-3 lg:max-w-md">
            <div className="relative">
              <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-slate-400" />
              <Input
                placeholder="Search memes, creators, or themes..."
                value={searchInput}
                onChange={(event) => setSearchInput(event.target.value)}
                className="h-11 rounded-xl border-white/10 bg-white/5 pl-10 text-slate-100 placeholder:text-slate-500 focus-visible:border-primary/60"
              />
            </div>
            <div className="flex items-center justify-between rounded-2xl border border-white/10 bg-white/5 px-4 py-3 shadow-inner shadow-primary/10">
              <div>
                <p className="text-xs uppercase tracking-wide text-slate-400">Voting resets in</p>
                <p className="text-xl font-semibold text-white">{timeLeft}</p>
              </div>
              <Button
                variant="outline"
                onClick={handleRefreshVotes}
                className="flex items-center gap-2 rounded-xl border-primary/40 bg-primary/10 text-white hover:bg-primary/20"
              >
                <Timer className="h-4 w-4" />
                Refresh votes
              </Button>
            </div>
          </div>
        </header>

        <div className="grid gap-6 lg:grid-cols-[260px_1fr_320px]">
        <aside className="space-y-6">
          <Card className="border-white/10 bg-white/5 shadow-lg shadow-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-base font-semibold text-white">
                <Filter className="h-4 w-4" />
                Filtering
              </CardTitle>
              <p className="text-xs text-slate-400">
                Tune the feed to match your vibe for this week's drop.
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Momentum</p>
                <div className="space-y-2">
                  {sortOptions.map((option) => {
                    const Icon = option.icon;
                    const isActive = sort === option.value;
                    return (
                      <Button
                        key={option.value}
                        variant="ghost"
                        onClick={() => {
                          setSort(option.value);
                          setPage(1);
                        }}
                        className={`w-full justify-between rounded-xl border transition ${
                          isActive
                            ? "border-primary/60 bg-primary/80 text-white shadow-lg shadow-primary/40"
                            : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                        }`}
                      >
                        <span className="flex items-center gap-2">
                          <Icon className="h-4 w-4" />
                          {option.label}
                        </span>
                        <span className="text-xs text-slate-300">{option.meta}</span>
                      </Button>
                    );
                  })}
                </div>
              </div>

              <div className="space-y-3">
                <p className="text-xs uppercase tracking-wide text-slate-400">Creator focus</p>
                <div className="space-y-2">
                  <Button
                    variant="ghost"
                    onClick={() => {
                      setSelectedCreator("all");
                      setPage(1);
                    }}
                    className={`w-full justify-between rounded-xl border ${
                      selectedCreator === "all"
                        ? "border-primary/60 bg-primary/70 text-white"
                        : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                    }`}
                  >
                    <span className="flex items-center gap-2">
                      <User className="h-4 w-4" />
                      All creators
                    </span>
                    <span className="text-xs text-slate-300">{formatNumber(uniqueCreators)}</span>
                  </Button>
                  {creatorStats.map((creator) => (
                    <Button
                      key={creator.creator}
                      variant="ghost"
                      onClick={() => {
                        setSelectedCreator(creator.creator);
                        setPage(1);
                      }}
                      className={`w-full justify-between rounded-xl border ${
                        selectedCreator === creator.creator
                          ? "border-primary/60 bg-primary/70 text-white"
                          : "border-white/10 bg-white/5 text-slate-300 hover:bg-white/10"
                      }`}
                    >
                      <span className="flex items-center gap-2">
                        <User className="h-4 w-4" />
                        {creator.creator}
                      </span>
                      <span className="text-xs text-slate-300">
                        {formatNumber(creator.votes)} votes
                      </span>
                    </Button>
                  ))}
                </div>
              </div>

              {priceRange && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Price range</p>
                  <p className="text-sm text-slate-200">
                    {priceRange.min} – {priceRange.max} ICP
                  </p>
                  <p className="text-xs text-slate-400">
                    {formatNumber(priceRange.count)} listed memes this week
                  </p>
                </div>
              )}

              {marketplaceTags.length > 0 && (
                <div className="space-y-2">
                  <p className="text-xs uppercase tracking-wide text-slate-400">Marketplace signals</p>
                  <div className="flex flex-wrap gap-2">
                    {marketplaceTags.map((tag) => (
                      <span
                        key={tag.value}
                        className="rounded-full border border-primary/40 bg-primary/10 px-3 py-1 text-xs text-primary-100"
                      >
                        {tag.label}
                      </span>
                    ))}
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </aside>

        <main className="space-y-6">
          <Card className="overflow-hidden border-white/10 bg-gradient-to-br from-primary/20 via-white/5 to-transparent">
            <CardContent className="flex flex-col gap-6 p-6 lg:flex-row lg:items-center lg:p-8">
              <div className="flex-1 space-y-4">
                <div className="inline-flex items-center gap-2 text-sm text-primary-100">
                  <Crown className="h-4 w-4" />
                  Weekly leaders
                </div>
                <h2 className="text-2xl font-semibold text-white sm:text-3xl">
                  {topTrending[0]?.title || "The leaderboard is warming up"}
                </h2>
                <p className="max-w-xl text-sm text-slate-200">
                  {topTrending[0]
                    ? `Holding ${formatNumber(topTrending[0]?.votes || 0)} votes and ${formatNumber(topTrending[0]?.views || 0)} views.`
                    : "Publish your meme to claim the first spot on this week's board."}
                </p>
                <div className="flex flex-wrap gap-4 text-sm text-slate-200">
                  <span className="flex items-center gap-2">
                    <Heart className="h-4 w-4 text-pink-300" />
                    {formatNumber(topTrending[0]?.votes || 0)} votes
                  </span>
                  <span className="flex items-center gap-2">
                    <Eye className="h-4 w-4 text-blue-300" />
                    {formatNumber(topTrending[0]?.views || 0)} views
                  </span>
                  <span className="flex items-center gap-2">
                    <User className="h-4 w-4 text-emerald-300" />
                    {topTrending[0]?.creator || "—"}
                  </span>
                </div>
                <div className="flex flex-wrap gap-3">
                  <Button
                    onClick={() => topTrending[0] && openPreview(topTrending[0])}
                    disabled={!topTrending[0]}
                    className="rounded-xl bg-primary/80 px-5 text-white hover:bg-primary"
                  >
                    View meme
                  </Button>
                  <Button
                    variant="outline"
                    onClick={handleRefreshVotes}
                    className="rounded-xl border-white/30 px-5 text-white hover:bg-white/10"
                  >
                    Refresh leaderboard
                  </Button>
                </div>
              </div>
              {topTrending[0]?.image_url && (
                <div className="relative w-full max-w-sm overflow-hidden rounded-2xl border border-white/10 bg-black/40">
                  <img
                    src={topTrending[0].image_url}
                    alt={topTrending[0].title}
                    className="aspect-square w-full object-cover"
                    loading="lazy"
                  />
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="flex flex-col gap-1 pb-4 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                  <TrendingUp className="h-5 w-5 text-primary-200" />
                  Trending collections
                </CardTitle>
                <p className="text-xs text-slate-400">
                  The most active drops across the community this week.
                </p>
              </div>
              <span className="text-xs text-slate-400">
                Share of weekly votes · {shareOfTop}% lead
              </span>
            </CardHeader>
            <CardContent className="grid gap-4 md:grid-cols-3">
              {loadingTop
                ? [...Array(3).keys()].map((index) => <SkeletonCard key={`leader-skeleton-${index}`} />)
                : topTrending.length === 0
                ? (
                  <p className="col-span-full text-sm text-slate-400">
                    Leaderboard data will appear once memes start receiving votes.
                  </p>
                )
                : topTrending.map((meme, index) => (
                  <button
                    key={meme.id}
                    type="button"
                    onClick={() => openPreview(meme)}
                    className="group rounded-2xl border border-white/10 bg-white/5 p-4 text-left transition hover:border-primary/50 hover:bg-primary/10 focus:outline-none focus-visible:ring-2 focus-visible:ring-primary/60"
                  >
                    <div className="flex items-center justify-between text-xs text-slate-400">
                      <span>#{index + 1}</span>
                      <span>
                        {new Date(meme.created_at || Date.now()).toLocaleDateString()}
                      </span>
                    </div>
                    <h3 className="mt-2 line-clamp-2 text-base font-semibold text-white">
                      {meme.title}
                    </h3>
                    <p className="mt-1 text-xs text-slate-400">by {meme.creator}</p>
                    <div className="mt-4 flex items-center gap-4 text-sm text-slate-200">
                      <span className="flex items-center gap-1">
                        <Heart className="h-4 w-4 text-pink-300" />
                        {formatNumber(meme.votes || 0)}
                      </span>
                      <span className="flex items-center gap-1">
                        <Eye className="h-4 w-4 text-blue-300" />
                        {formatNumber(meme.views || 0)}
                      </span>
                    </div>
                  </button>
                ))}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="flex items-center gap-2 text-lg font-semibold text-white">
                <TrendingUp className="h-5 w-5 text-primary-200" />
                Marketplace feed
              </CardTitle>
              <p className="text-xs text-slate-400">
                {searchQuery
                  ? `Showing ${ensureArray(filteredMemes).length} result${ensureArray(filteredMemes).length === 1 ? "" : "s"} for “${searchQuery}”.`
                  : `${total} meme${total === 1 ? "" : "s"} live for voting.`}
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {errorMsg && (
                <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
                  {errorMsg}
                </div>
              )}

              {loadingList && ensureArray(memes).length === 0 ? (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {[...Array(6).keys()].map((index) => (
                    <SkeletonCard key={`feed-skeleton-${index}`} />
                  ))}
                </div>
              ) : ensureArray(filteredMemes).length === 0 ? (
                <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 py-16 text-center">
                  <Search className="h-10 w-10 text-slate-500" />
                  <p className="mt-4 text-base font-semibold text-white">No memes found</p>
                  <p className="mt-2 text-sm text-slate-400">
                    {searchQuery
                      ? "Try adjusting your search terms or filters."
                      : "Be the first to publish a meme this week."}
                  </p>
                  {searchQuery && (
                    <Button
                      variant="outline"
                      onClick={() => setSearchQuery("")}
                      className="mt-4 rounded-xl border-white/20 text-white hover:bg-white/10"
                    >
                      Clear search
                    </Button>
                  )}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {ensureArray(filteredMemes)
                    .filter(Boolean)
                    .map((meme) => (
                      <MemeCard
                        key={meme.id}
                        meme={meme}
                        onVote={(id, votes) => handleVote(id, votes, meme.creator)}
                        onVoteSuccess={() => undefined}
                        isAuthenticated={isAuthenticated}
                        currentUserPrincipal={principal}
                        onOpenPreview={openPreview}
                      />
                    ))}
                </div>
              )}

              {ensureArray(filteredMemes).length > 0 && canLoadMore && (
                <div className="text-center">
                  <Button
                    variant="outline"
                    size="lg"
                    onClick={() => setPage((prev) => prev + 1)}
                    className="rounded-xl border-white/20 px-6 text-white hover:bg-white/10"
                  >
                    <Sparkles className="mr-2 h-4 w-4" />
                    Load more memes
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-primary/30 bg-gradient-to-r from-primary/30 to-primary/10">
            <CardContent className="flex flex-col items-center gap-4 py-8 text-center">
              <Zap className="h-10 w-10 text-white" />
              <h3 className="text-2xl font-semibold text-white">Launch your own drop</h3>
              <p className="max-w-md text-sm text-slate-200">
                Turn your ideas into meme culture and publish straight to the marketplace for this week’s competition.
              </p>
              <Button
                size="lg"
                onClick={handleCreateMeme}
                className="rounded-xl bg-white px-6 text-primary hover:bg-slate-100"
              >
                {isAuthenticated ? "Open meme studio" : "Login to create"}
              </Button>
            </CardContent>
          </Card>
        </main>

        <aside className="space-y-6">
          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-white">Market pulse</CardTitle>
              <p className="text-xs text-slate-400">
                Snapshot of this week's marketplace activity.
              </p>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-3 text-sm">
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">Memes</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(total)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">Active creators</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(uniqueCreators)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">Total votes</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totalVotes)}</p>
                </div>
                <div className="rounded-xl border border-white/10 bg-white/5 p-4">
                  <p className="text-xs text-slate-400">Total views</p>
                  <p className="text-lg font-semibold text-white">{formatNumber(totalViews)}</p>
                </div>
              </div>
              <div className="rounded-xl border border-white/10 bg-gradient-to-r from-emerald-500/20 to-emerald-400/10 p-4 text-sm text-slate-200">
                <p className="text-xs uppercase tracking-wide text-emerald-200">Top share</p>
                <p className="mt-1 text-lg font-semibold text-white">{shareOfTop}% of weekly votes</p>
                <p className="text-xs text-slate-300">
                  {topTrending[0]
                    ? `${topTrending[0].title} is leading the pack.`
                    : "Awaiting the first leaderboard entry."}
                </p>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-white">Featured collections</CardTitle>
              <p className="text-xs text-slate-400">Curated highlights from the leaderboard.</p>
            </CardHeader>
            <CardContent className="space-y-4">
              {topTrending.length === 0 ? (
                <p className="text-sm text-slate-400">Publish a meme to see it featured here.</p>
              ) : (
                topTrending.map((meme) => (
                  <div
                    key={meme.id}
                    className="flex items-center gap-3 rounded-xl border border-white/10 bg-white/5 p-3"
                  >
                    {meme.image_url ? (
                      <img
                        src={meme.image_url}
                        alt={meme.title}
                        className="h-12 w-12 rounded-lg object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-12 w-12 items-center justify-center rounded-lg bg-white/10 text-lg">
                        {meme.emoji}
                      </div>
                    )}
                    <div className="flex-1">
                      <p className="line-clamp-1 text-sm font-semibold text-white">{meme.title}</p>
                      <p className="text-xs text-slate-400">by {meme.creator}</p>
                    </div>
                    <div className="text-right text-xs text-slate-300">
                      <div>{formatNumber(meme.votes || 0)} votes</div>
                      <div>{formatNumber(meme.views || 0)} views</div>
                    </div>
                  </div>
                ))
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5">
            <CardHeader className="pb-4">
              <CardTitle className="text-base font-semibold text-white">Recently added</CardTitle>
              <p className="text-xs text-slate-400">Fresh drops from the community.</p>
            </CardHeader>
            <CardContent className="space-y-3">
              {recentMemes.length === 0 ? (
                <p className="text-sm text-slate-400">Nothing yet—kick off the week with your meme.</p>
              ) : (
                recentMemes.map((meme) => (
                  <button
                    key={meme.id}
                    type="button"
                    onClick={() => openPreview(meme)}
                    className="w-full rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-left text-sm text-slate-200 transition hover:border-primary/40 hover:bg-primary/10"
                  >
                    <div className="flex items-center justify-between gap-3">
                      <span className="line-clamp-1 font-semibold text-white">{meme.title}</span>
                      <span className="text-xs text-slate-400">
                        {new Date(meme.created_at || Date.now()).toLocaleTimeString([], {
                          hour: "2-digit",
                          minute: "2-digit",
                        })}
                      </span>
                    </div>
                    <p className="text-xs text-slate-400">by {meme.creator}</p>
                  </button>
                ))
              )}
            </CardContent>
          </Card>
        </aside>
      </div>
    </div>

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
