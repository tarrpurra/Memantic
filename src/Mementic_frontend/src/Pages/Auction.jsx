import { useEffect, useMemo, useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowRight,
  BarChart3,
  Clock,
  Flame,
  Gavel,
  LineChart,
  Sparkles,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Navigation from "../components/Navigation";
import backendService from "../services/backendService";

const ensureArray = (value) =>
  Array.isArray(value) ? value : value ? Object.values(value) : [];

const safeBigIntToNumber = (value) => {
  if (value == null) return 0;
  if (typeof value === "number") {
    return Number.isFinite(value) ? value : 0;
  }
  if (typeof value === "bigint") {
    const max = BigInt(Number.MAX_SAFE_INTEGER);
    if (value > max) return Number.MAX_SAFE_INTEGER;
    if (value < -max) return Number.MIN_SAFE_INTEGER;
    return Number(value);
  }
  if (typeof value === "string") {
    const trimmed = value.trim();
    if (!trimmed) return 0;
    try {
      if (/^-?\d+n$/.test(trimmed)) {
        return safeBigIntToNumber(BigInt(trimmed.slice(0, -1)));
      }
      if (/^-?\d+$/.test(trimmed)) {
        return safeBigIntToNumber(BigInt(trimmed));
      }
      const num = Number(trimmed);
      return Number.isFinite(num) ? num : 0;
    } catch {
      return 0;
    }
  }
  if (Array.isArray(value)) {
    return safeBigIntToNumber(value[0]);
  }
  return 0;
};

const normalizeTimestampToMs = (candidate) => {
  if (candidate == null) return 0;
  if (Array.isArray(candidate)) {
    return normalizeTimestampToMs(candidate[0]);
  }
  if (typeof candidate === "bigint") {
    if (candidate <= 0n) return 0;
    if (candidate > 1_000_000_000_000_000n) {
      return Number(candidate / 1_000_000n);
    }
    if (candidate > 1_000_000_000_000n) {
      return Number(candidate);
    }
    if (candidate > 1_000_000_000n) {
      return Number(candidate * 1000n);
    }
    if (candidate > 1_000_000n) {
      return Number(candidate / 1000n);
    }
    return Number(candidate);
  }
  if (typeof candidate === "number") {
    if (!Number.isFinite(candidate) || candidate <= 0) return 0;
    if (candidate > 1e15) return Math.floor(candidate / 1e6);
    if (candidate > 1e12) return Math.floor(candidate);
    if (candidate > 1e9) return Math.floor(candidate * 1000);
    if (candidate > 1e6) return Math.floor(candidate / 1000);
    return Math.floor(candidate);
  }
  if (typeof candidate === "string") {
    const trimmed = candidate.trim();
    if (!trimmed) return 0;
    try {
      if (/^-?\d+n$/.test(trimmed)) {
        return normalizeTimestampToMs(BigInt(trimmed.slice(0, -1)));
      }
      if (/^-?\d+$/.test(trimmed)) {
        return normalizeTimestampToMs(BigInt(trimmed));
      }
      const num = Number(trimmed);
      return normalizeTimestampToMs(num);
    } catch {
      return 0;
    }
  }
  return 0;
};

const unwrapOptional = (value) => (Array.isArray(value) ? value[0] : value ?? null);

const convertE8sToIcp = (value) => {
  if (value == null) return null;
  if (Array.isArray(value)) return convertE8sToIcp(value[0]);
  try {
    if (typeof value === "bigint") {
      return Number(value) / 100_000_000;
    }
    if (typeof value === "number") {
      return Number.isFinite(value) ? value / 100_000_000 : null;
    }
    if (typeof value === "string") {
      const trimmed = value.trim();
      if (!trimmed) return null;
      if (/^-?\d+n$/.test(trimmed)) {
        return convertE8sToIcp(BigInt(trimmed.slice(0, -1)));
      }
      if (/^-?\d+$/.test(trimmed)) {
        return convertE8sToIcp(BigInt(trimmed));
      }
      const num = Number(trimmed);
      return Number.isFinite(num) ? num / 100_000_000 : null;
    }
  } catch {
    return null;
  }
  return null;
};

const toSafeIdString = (value) => {
  if (typeof value === "bigint") return value.toString(10);
  if (typeof value === "number") {
    return Number.isFinite(value) ? String(value) : `${Date.now()}`;
  }
  if (typeof value === "string" && value.trim()) return value;
  return `${Date.now()}`;
};

const normalizeMeme = (m, extra = {}) => {
  const md = m?.meme_data || m;
  const owner = m?.owner ?? md?.owner ?? m?.creator;

  const up = safeBigIntToNumber(
    extra?.votes?.upvotes ?? md?.upvotes ?? m?.upvotes ?? m?.votes ?? 0
  );
  const down = safeBigIntToNumber(
    extra?.votes?.downvotes ?? md?.downvotes ?? m?.downvotes ?? 0
  );
  const score = safeBigIntToNumber(m?.votes ?? m?.score ?? up - down);

  let imageUrl =
    md?.image_url || m?.image_url || m?.url || m?.image || md?.url || "";
  if (imageUrl && !/^https?:\/\//i.test(imageUrl)) {
    imageUrl = "";
  }

  let creator = "Anonymous";
  if (owner) {
    if (typeof owner === "string") {
      creator = owner;
    } else if (typeof owner === "object" && owner.toText) {
      creator = owner.toText();
    } else {
      creator = String(owner);
    }
    if (creator.length > 20) {
      creator = `${creator.slice(0, 8)}...${creator.slice(-6)}`;
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

  const metadata = unwrapOptional(md?.metadata ?? m?.metadata);
  const metadataTimestamp = metadata
    ? normalizeTimestampToMs(unwrapOptional(metadata?.timestamp))
    : 0;
  const createdAtCandidates = [
    metadataTimestamp,
    normalizeTimestampToMs(m?.created_at),
    normalizeTimestampToMs(md?.created_at),
    normalizeTimestampToMs(m?.timestamp),
    normalizeTimestampToMs(md?.timestamp),
  ];
  const createdAt =
    createdAtCandidates.find((value) => value && value > 0) ?? Date.now();

  const marketData = md?.market_data ?? m?.market_data ?? {};
  const listingPriceIcp = convertE8sToIcp(unwrapOptional(marketData?.listing_price));
  const listedAt = normalizeTimestampToMs(unwrapOptional(marketData?.listed_at));
  const views = safeBigIntToNumber(
    unwrapOptional(marketData?.views) ?? m?.views ?? md?.views ?? 0
  );

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
    image_url: imageUrl,
    votes: score,
    views,
    created_at: createdAt,
    listed_at: listedAt || null,
    listingPriceIcp,
    market_data: marketData,
    metadata_service: metadata?.service ? String(metadata.service) : null,
    rank: safeBigIntToNumber(extra?.rank ?? m?.rank ?? 0),
    __raw: m,
  };
};

const formatNumber = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n <= 0) return "0";
  if (n < 1) return n.toFixed(2);
  return Math.round(n).toString();
};

const formatIcp = (value) => {
  const n = Number(value);
  if (!Number.isFinite(n) || n <= 0) return "Not listed";
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K ICP`;
  if (n >= 1) return `${n.toFixed(2)} ICP`;
  return `${n.toFixed(4)} ICP`;
};

const formatRelativeTime = (timestamp) => {
  if (!timestamp) return "just now";
  const diff = Date.now() - timestamp;
  if (diff <= 0) return "just now";
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) {
    return `${minutes} min${minutes === 1 ? "" : "s"} ago`;
  }
  const hours = Math.floor(minutes / 60);
  if (hours < 24) {
    const remaining = minutes % 60;
    if (remaining === 0) {
      return `${hours} hr${hours === 1 ? "" : "s"} ago`;
    }
    return `${hours} hr${hours === 1 ? "" : "s"} ${remaining} min ago`;
  }
  const days = Math.floor(hours / 24);
  if (days < 7) {
    const remaining = hours % 24;
    if (remaining === 0) {
      return `${days} day${days === 1 ? "" : "s"} ago`;
    }
    return `${days} day${days === 1 ? "" : "s"} ${remaining} hr ago`;
  }
  const weeks = Math.floor(days / 7);
  if (weeks < 4) {
    const remaining = days % 7;
    if (remaining === 0) {
      return `${weeks} wk${weeks === 1 ? "" : "s"} ago`;
    }
    return `${weeks} wk${weeks === 1 ? "" : "s"} ${remaining} day${remaining === 1 ? "" : "s"} ago`;
  }
  const months = Math.floor(days / 30);
  if (months < 12) {
    return `${months} mo${months === 1 ? "" : "s"} ago`;
  }
  const years = Math.floor(days / 365);
  return `${years} yr${years === 1 ? "" : "s"} ago`;
};

const accentPalette = [
  "from-primary/40 via-primary/20 to-secondary/30",
  "from-emerald-400/30 to-teal-500/20",
  "from-amber-400/40 to-rose-400/20",
  "from-sky-500/30 to-indigo-500/20",
];

const Auction = () => {
  const [auctions, setAuctions] = useState([]);
  const [topMemes, setTopMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;

    const loadData = async () => {
      setLoading(true);
      setError("");
      try {
        try {
          await backendService.ensureReady();
        } catch (ensureError) {
          console.warn("Auction page: ensureReady failed", ensureError);
        }

        const [rawAuctions, leaderboard] = await Promise.all([
          backendService
            .getMarketplaceMemes()
            .catch((firstError) => {
              console.warn(
                "getMarketplaceMemes failed, fallback to getAllMemes",
                firstError
              );
              return backendService.getAllMemes();
            }),
          backendService
            .getCurrentLeaderboard(5)
            .catch((leaderboardError) => {
              console.warn("getCurrentLeaderboard failed", leaderboardError);
              return null;
            }),
        ]);

        if (cancelled) return;

        const normalizedAuctions = ensureArray(rawAuctions)
          .map((item) => normalizeMeme(item))
          .sort((a, b) => b.created_at - a.created_at);

        setAuctions(normalizedAuctions);

        if (leaderboard) {
          const entries = ensureArray(leaderboard?.top_memes ?? leaderboard);
          const normalizedTop = entries
            .map((entry, index) => {
              const memeData = Array.isArray(entry?.meme_data)
                ? entry.meme_data[0]
                : entry?.meme_data ?? entry;
              if (!memeData) return null;
              const normalized = normalizeMeme(memeData, {
                rank: entry?.rank ?? index + 1,
                votes: entry?.votes,
              });
              return {
                ...normalized,
                rank: normalized.rank || index + 1,
                votes: safeBigIntToNumber(entry?.votes ?? normalized.votes),
              };
            })
            .filter(Boolean)
            .sort((a, b) => (a.rank || 0) - (b.rank || 0));
          setTopMemes(normalizedTop);
        } else {
          setTopMemes([]);
        }
      } catch (loadError) {
        console.error("Failed to load auction data", loadError);
        if (!cancelled) {
          setError("Unable to load auctions right now. Please try again soon.");
          setAuctions([]);
          setTopMemes([]);
        }
      } finally {
        if (!cancelled) setLoading(false);
      }
    };

    loadData();

    const interval = setInterval(() => {
      loadData();
    }, 60_000);

    return () => {
      cancelled = true;
      clearInterval(interval);
    };
  }, []);

  const liveAuctions = useMemo(
    () => auctions.filter((meme) => meme.market_data?.is_listed ?? true),
    [auctions]
  );

  const aggregateStats = useMemo(() => {
    const totalVolume = liveAuctions.reduce(
      (sum, item) => sum + (Number(item.listingPriceIcp) || 0),
      0
    );
    const totalViews = liveAuctions.reduce(
      (sum, item) => sum + (item.views || 0),
      0
    );
    const totalVotes = liveAuctions.reduce(
      (sum, item) => sum + (item.votes || 0),
      0
    );
    const averageBid = liveAuctions.length
      ? totalVolume / liveAuctions.length
      : 0;
    const newestCreated = liveAuctions.reduce(
      (latest, item) => Math.max(latest, item.created_at || 0),
      0
    );
    return { totalVolume, totalViews, totalVotes, averageBid, newestCreated };
  }, [liveAuctions]);

  const themeTags = useMemo(() => {
    const counts = new Map();
    liveAuctions.forEach((auction) => {
      const prompt = `${auction.prompt || ""} ${auction.caption || ""}`.toLowerCase();
      prompt
        .replace(/[^a-z0-9#\s]/g, " ")
        .split(/\s+/)
        .filter((word) => word.length >= 4)
        .slice(0, 12)
        .forEach((word) => {
          counts.set(word, (counts.get(word) || 0) + 1);
        });
    });
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 8)
      .map(([label, count]) => ({ label, count }));
  }, [liveAuctions]);

  const topCreators = useMemo(() => {
    const creatorMap = new Map();
    liveAuctions.forEach((auction) => {
      if (!auction.creator) return;
      const current = creatorMap.get(auction.creator) || {
        creator: auction.creator,
        drops: 0,
        views: 0,
        votes: 0,
      };
      current.drops += 1;
      current.views += auction.views || 0;
      current.votes += auction.votes || 0;
      creatorMap.set(auction.creator, current);
    });
    return Array.from(creatorMap.values())
      .sort((a, b) => b.drops - a.drops || b.views - a.views)
      .slice(0, 5);
  }, [liveAuctions]);

  const priceBands = useMemo(() => {
    const prices = liveAuctions
      .map((auction) => Number(auction.listingPriceIcp))
      .filter((value) => Number.isFinite(value) && value > 0)
      .sort((a, b) => a - b);
    if (prices.length === 0) return [];
    if (prices.length === 1) {
      return [{ label: formatIcp(prices[0]), count: 1 }];
    }
    const lowIndex = Math.max(0, Math.floor(prices.length / 3) - 1);
    const midIndex = Math.max(0, Math.floor((2 * prices.length) / 3) - 1);
    const lowThreshold = prices[lowIndex];
    const midThreshold = prices[midIndex];
    const highThreshold = prices[prices.length - 1];

    const lowCount = prices.filter((price) => price <= lowThreshold).length;
    const midCount = prices.filter(
      (price) => price > lowThreshold && price <= midThreshold
    ).length;
    const highCount = prices.length - lowCount - midCount;

    const bands = [];
    bands.push({ label: `≤ ${formatIcp(lowThreshold)}`, count: lowCount });
    if (midCount > 0) {
      bands.push({
        label: `${formatIcp(Math.max(lowThreshold, 0.01))} – ${formatIcp(midThreshold)}`,
        count: midCount,
      });
    }
    if (highCount > 0) {
      bands.push({ label: `≥ ${formatIcp(highThreshold)}`, count: highCount });
    }
    return bands;
  }, [liveAuctions]);

  const recentActivity = useMemo(() => {
    return liveAuctions
      .slice()
      .sort((a, b) => (b.created_at || 0) - (a.created_at || 0))
      .slice(0, 6)
      .map((auction) => ({
        id: auction.id,
        title: auction.title,
        created_at: auction.created_at,
        listingPriceIcp: auction.listingPriceIcp,
        creator: auction.creator,
        views: auction.views,
      }));
  }, [liveAuctions]);

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="hero-aurora" />
        <div className="hero-grid" />
        <div className="hero-sparkles" />
      </div>

      <Navigation />

      <main className="relative z-10">
        <section className="px-5 py-16 sm:px-8">
          <div className="mx-auto max-w-7xl space-y-8">
            <div className="overflow-hidden rounded-3xl border border-border/50 bg-background/75 p-8 shadow-card backdrop-blur-xl sm:p-12">
              <div className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
                <div className="space-y-4">
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                    <Gavel className="h-4 w-4 text-primary" />
                    Auction Arena
                  </span>
                  <h1 className="text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
                    Live auctions curated from the latest meme drops
                  </h1>
                  <p className="max-w-2xl text-base text-muted-foreground">
                    Track creator momentum, monitor bidding interest, and surface culture-shaping memes as they move from pre-market hype to the main arena.
                  </p>
                  <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
                      <Activity className="h-3.5 w-3.5 text-primary" />
                      {formatNumber(liveAuctions.length)} active auctions
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
                      <Users className="h-3.5 w-3.5 text-primary" />
                      {formatNumber(aggregateStats.totalVotes)} votes in play
                    </span>
                    <span className="inline-flex items-center gap-2 rounded-full border border-border/60 px-3 py-1">
                      <Clock className="h-3.5 w-3.5 text-primary" />
                      Updated {formatRelativeTime(aggregateStats.newestCreated)}
                    </span>
                  </div>
                </div>
                <div className="flex flex-col gap-3 sm:flex-row lg:flex-col">
                  <Link to="/myplace" className="flex-1">
                    <Button variant="hero" size="xl" className="w-full rounded-full px-8">
                      Create Auction
                      <ArrowRight className="ml-2 h-4 w-4" />
                    </Button>
                  </Link>
                  <Link to="/pre-marketplace" className="flex-1">
                    <Button
                      variant="outline"
                      size="lg"
                      className="w-full rounded-full border-border/60 bg-background/70"
                    >
                      Prepare in Pre-Marketplace
                    </Button>
                  </Link>
                </div>
              </div>
            </div>

            <div className="grid gap-6 lg:grid-cols-[280px_minmax(0,1fr)] xl:grid-cols-[300px_minmax(0,1fr)_320px]">
              <div className="space-y-6">
                <Card className="border-border/50 bg-background/75 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <BarChart3 className="h-4 w-4 text-primary" />
                      Market filters & signals
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-6 text-sm text-muted-foreground">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <div className="flex items-center justify-between text-xs uppercase tracking-[0.3em]">
                        <span>Total volume</span>
                        <span className="text-primary">{formatIcp(aggregateStats.totalVolume)}</span>
                      </div>
                      <div className="mt-3 grid grid-cols-2 gap-3 text-xs">
                        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                          <p className="uppercase tracking-[0.3em]">Avg bid</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {aggregateStats.averageBid > 0
                              ? formatIcp(aggregateStats.averageBid)
                              : "—"}
                          </p>
                        </div>
                        <div className="rounded-xl border border-border/60 bg-background/60 p-3">
                          <p className="uppercase tracking-[0.3em]">Views</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">
                            {formatNumber(aggregateStats.totalViews)}
                          </p>
                        </div>
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Trending themes
                      </h3>
                      {themeTags.length > 0 ? (
                        <div className="flex flex-wrap gap-2">
                          {themeTags.map((tag) => (
                            <span
                              key={tag.label}
                              className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs text-foreground"
                            >
                              #{tag.label}
                              <span className="text-muted-foreground">×{tag.count}</span>
                            </span>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          No themes yet. Publish a meme to kick things off.
                        </p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Creator spotlight
                      </h3>
                      {topCreators.length > 0 ? (
                        <div className="space-y-3">
                          {topCreators.map((creator) => (
                            <div
                              key={creator.creator}
                              className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2"
                            >
                              <div className="flex flex-col">
                                <span className="text-foreground">@{creator.creator}</span>
                                <span className="text-xs text-muted-foreground">
                                  {formatNumber(creator.views)} views · {formatNumber(creator.votes)} votes
                                </span>
                              </div>
                              <span className="text-xs text-primary">{creator.drops} drops</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">No creators listed yet.</p>
                      )}
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                        Price clusters
                      </h3>
                      {priceBands.length > 0 ? (
                        <div className="space-y-2">
                          {priceBands.map((band) => (
                            <div
                              key={band.label}
                              className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2"
                            >
                              <span className="text-foreground">{band.label}</span>
                              <span className="text-xs text-muted-foreground">{band.count} drops</span>
                            </div>
                          ))}
                        </div>
                      ) : (
                        <p className="text-xs text-muted-foreground">
                          Reserve prices will appear once auctions go live.
                        </p>
                      )}
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                {error && (
                  <Card className="border-red-500/40 bg-red-500/10">
                    <CardContent className="py-6 text-sm text-red-200">
                      {error}
                    </CardContent>
                  </Card>
                )}

                {loading ? (
                  <Card className="border-border/40 bg-background/70 backdrop-blur-xl">
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                      Loading auctions…
                    </CardContent>
                  </Card>
                ) : liveAuctions.length === 0 ? (
                  <Card className="border-border/40 bg-background/75 backdrop-blur-xl">
                    <CardContent className="py-16 text-center text-sm text-muted-foreground">
                      No live auctions yet. Publish a meme from the creator studio to start one.
                    </CardContent>
                  </Card>
                ) : (
                  <div className="grid gap-6 md:grid-cols-2">
                    {liveAuctions.map((auction, index) => {
                      const accent = accentPalette[index % accentPalette.length];
                      const timeAgo = formatRelativeTime(auction.created_at);
                      const createdAtDisplay = new Date(
                        auction.created_at || Date.now()
                      ).toLocaleString();
                      const hasReserve =
                        Number.isFinite(auction.listingPriceIcp) && auction.listingPriceIcp > 0;

                      return (
                        <motion.div
                          key={auction.id}
                          initial={{ opacity: 0, y: 24 }}
                          whileInView={{ opacity: 1, y: 0 }}
                          viewport={{ once: true, amount: 0.2 }}
                          transition={{ delay: index * 0.05, duration: 0.4, ease: "easeOut" }}
                          className="group overflow-hidden rounded-3xl border border-border/50 bg-background/70 p-[1px] shadow-card backdrop-blur-xl"
                        >
                          <div className={`rounded-[calc(theme(borderRadius.3xl)-1px)] bg-gradient-to-br ${accent} p-0.5`}>
                            <div className="flex h-full flex-col overflow-hidden rounded-[calc(theme(borderRadius.3xl)-1.5px)] bg-background/95">
                              <div className="relative aspect-[4/3] w-full overflow-hidden">
                                {auction.image_url ? (
                                  <img
                                    src={auction.image_url}
                                    alt={auction.title}
                                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                                    loading="lazy"
                                  />
                                ) : (
                                  <div className="flex h-full w-full items-center justify-center bg-gradient-to-br from-primary/20 via-primary/5 to-secondary/10 text-xs text-muted-foreground">
                                    Preview coming soon
                                  </div>
                                )}
                                <div className="absolute left-4 top-4 flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                                  <Clock className="h-3.5 w-3.5 text-primary" />
                                  {timeAgo}
                                </div>
                                <div className="absolute right-4 top-4 flex items-center gap-2 rounded-full border border-border/70 bg-background/80 px-3 py-1 text-xs text-muted-foreground backdrop-blur">
                                  <Users className="h-3.5 w-3.5 text-primary" />
                                  {formatNumber(auction.views)} views
                                </div>
                              </div>
                              <div className="flex flex-1 flex-col gap-4 p-6">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="space-y-1">
                                    <h3 className="text-lg font-semibold text-foreground">
                                      {auction.title}
                                    </h3>
                                    <p className="text-sm text-muted-foreground">by @{auction.creator}</p>
                                  </div>
                                  {auction.rank ? (
                                    <span className="rounded-full border border-primary/50 bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                                      Rank #{auction.rank}
                                    </span>
                                  ) : null}
                                </div>

                                <div className="grid gap-4 sm:grid-cols-2">
                                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                      Top bid
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">
                                      {formatIcp(auction.listingPriceIcp)}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                      {hasReserve ? "Reserve set" : "Reserve open"}
                                    </span>
                                  </div>
                                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                                    <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                      Votes
                                    </p>
                                    <p className="mt-2 text-2xl font-semibold text-foreground">
                                      {formatNumber(auction.votes)}
                                    </p>
                                    <span className="text-xs text-muted-foreground">
                                      {auction.metadata_service || "on-chain"}
                                    </span>
                                  </div>
                                </div>

                                <div className="flex flex-col gap-3 text-xs text-muted-foreground">
                                  <p>
                                    Created at <span className="font-medium text-foreground">{createdAtDisplay}</span>
                                  </p>
                                  {auction.listed_at ? (
                                    <p>
                                      Listed <span className="font-medium text-foreground">{formatRelativeTime(auction.listed_at)}</span>
                                    </p>
                                  ) : null}
                                </div>

                                <div className="flex items-center justify-between gap-3">
                                  <Link
                                    to={`/marketplace?focus=${encodeURIComponent(auction.id)}`}
                                    className="inline-flex items-center gap-2 text-sm font-semibold text-primary"
                                  >
                                    Place bid
                                    <ArrowRight className="h-4 w-4" />
                                  </Link>
                                  <span className="text-xs text-muted-foreground">
                                    {formatNumber(auction.views)} collectors watching
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                        </motion.div>
                      );
                    })}
                  </div>
                )}

                <Card className="border-border/40 bg-background/75 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Sparkles className="h-4 w-4 text-primary" />
                      Crown your meme in the arena
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    <p>
                      When the countdown ends, the smart contract distributes creator rewards, supporter multipliers, and collector perks instantly. Keep bids active to extend the finale and maximise cultural impact.
                    </p>
                    <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                      <div className="space-y-2 text-xs">
                        <span className="flex items-center gap-2">
                          <Clock className="h-4 w-4 text-primary" />
                          Dynamic ending protection
                        </span>
                        <span className="flex items-center gap-2">
                          <Users className="h-4 w-4 text-primary" />
                          Supporter share multipliers
                        </span>
                      </div>
                      <div className="flex flex-col gap-3 sm:flex-row">
                        <Link to="/marketplace">
                          <Button variant="hero" className="rounded-full px-6">
                            Explore marketplace
                            <ArrowRight className="ml-2 h-4 w-4" />
                          </Button>
                        </Link>
                        <Link to="/meme-nft">
                          <Button variant="ghost" className="rounded-full border border-border/60 bg-background/70">
                            Mint as NFT
                          </Button>
                        </Link>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              </div>

              <div className="space-y-6">
                <Card className="border-border/50 bg-background/75 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <TrendingUp className="h-4 w-4 text-primary" />
                      Top memes this week
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    {topMemes.length > 0 ? (
                      <div className="space-y-3">
                        {topMemes.map((entry) => (
                          <div
                            key={entry.id}
                            className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2"
                          >
                            <div className="flex flex-col">
                              <span className="text-foreground">#{entry.rank} · {entry.title}</span>
                              <span className="text-xs text-muted-foreground">@{entry.creator}</span>
                            </div>
                            <span className="text-xs text-primary">{formatNumber(entry.votes)} votes</span>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No leaderboard entries yet.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-background/75 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <LineChart className="h-4 w-4 text-primary" />
                      Live activity feed
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-muted-foreground">
                    {recentActivity.length > 0 ? (
                      <div className="space-y-3">
                        {recentActivity.map((activity) => (
                          <div
                            key={activity.id}
                            className="flex items-start justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2"
                          >
                            <div className="max-w-[70%]">
                              <p className="text-foreground">{activity.title}</p>
                              <p className="text-xs text-muted-foreground">
                                @{activity.creator} · {formatRelativeTime(activity.created_at)}
                              </p>
                            </div>
                            <div className="text-right text-xs">
                              <p className="font-semibold text-primary">
                                {formatIcp(activity.listingPriceIcp)}
                              </p>
                              <p className="text-muted-foreground">{formatNumber(activity.views)} views</p>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p>No activity yet. Auctions will appear here in real time.</p>
                    )}
                  </CardContent>
                </Card>

                <Card className="border-border/50 bg-background/75 backdrop-blur-xl">
                  <CardHeader>
                    <CardTitle className="flex items-center gap-2 text-sm font-semibold text-muted-foreground">
                      <Flame className="h-4 w-4 text-primary" />
                      Quick guide
                    </CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-3 text-sm text-muted-foreground">
                    <p>1. Publish a meme from the creator studio to mint an auction-ready drop.</p>
                    <p>2. Set your reserve and schedule in the pre-marketplace to build momentum.</p>
                    <p>3. When bidding opens, share the auction link to rally supporters in real time.</p>
                  </CardContent>
                </Card>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Auction;
