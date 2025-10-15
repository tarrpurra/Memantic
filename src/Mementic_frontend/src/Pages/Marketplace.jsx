import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Flame,
  Loader2,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import Navigation from "../components/Navigation";
import backendService from "../services/backendService";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";

const trendingMemes = [];

const marketCollections = [];

const marketFeed = [];

const slideVariants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -12 },
};

const Marketplace = () => {
  const { principal, isAuthenticated, isLoading: authLoading } = useAuth();
  const { toast } = useToast();

  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = trendingMemes.length;

  const [topWinners, setTopWinners] = useState([]);
  const [winnersLoading, setWinnersLoading] = useState(true);
  const [winnersError, setWinnersError] = useState(null);
  const [latestWeek, setLatestWeek] = useState(null);
  const [mintDialog, setMintDialog] = useState({
    open: false,
    winner: null,
    mode: "single",
    editions: 10,
    isSubmitting: false,
    error: null,
  });

  const normalizeMintedTokens = (tokens) =>
    Array.isArray(tokens)
      ? tokens.map((id) => {
          if (typeof id === "bigint") return id.toString();
          if (typeof id === "object" && id?.toString) return id.toString();
          return String(id);
        })
      : [];

  useEffect(() => {
    let cancelled = false;

    const fetchTopWinners = async () => {
      try {
        setWinnersLoading(true);
        setWinnersError(null);
        await backendService.ensureReady();

        const weeks = await backendService.getCompletedWeeks();
        if (!Array.isArray(weeks) || weeks.length === 0) {
          if (!cancelled) {
            setLatestWeek(null);
            setTopWinners([]);
          }
          return;
        }

        const sortedWeeks = [...weeks].sort(
          (a, b) => Number(b?.week_id ?? 0) - Number(a?.week_id ?? 0)
        );
        const latest = sortedWeeks[0];
        if (cancelled) return;
        setLatestWeek(latest);

        const winners = await backendService.getTop3ForWeek(latest.week_id);
        if (cancelled) return;

        const enriched = await Promise.all(
          (winners || []).map(async (entry, index) => {
            try {
              const meme = await backendService.getMeme(entry.meme_id);
              const mintedTokens = await backendService.getMintedTokens(entry.meme_id);
              const captionField = meme?.meme_data?.caption;
              const caption = Array.isArray(captionField)
                ? captionField[0]
                : captionField;
              const prompt = meme?.meme_data?.prompt ?? "";
              const ownerCandidate =
                meme?.owner ?? meme?.meme_data?.owner ?? null;
              const ownerPrincipal = ownerCandidate
                ? typeof ownerCandidate === "object" && ownerCandidate.toText
                  ? ownerCandidate.toText()
                  : String(ownerCandidate)
                : "";
              const imageUrl = meme?.meme_data?.image_url ?? null;

              return {
                memeId: Number(entry.meme_id),
                rank: index + 1,
                upvotes: Number(entry.upvotes ?? 0),
                ownerPrincipal,
                meme,
                imageUrl,
                prompt,
                title:
                  (caption && String(caption).trim()) ||
                  (prompt && String(prompt).trim()) ||
                  `Meme #${entry.meme_id}`,
                mintedTokens: normalizeMintedTokens(mintedTokens),
              };
            } catch (innerError) {
              console.warn("Failed to enrich winner", entry?.meme_id, innerError);
              return {
                memeId: Number(entry.meme_id),
                rank: index + 1,
                upvotes: Number(entry.upvotes ?? 0),
                ownerPrincipal: "",
                meme: null,
                imageUrl: null,
                prompt: "",
                title: `Meme #${entry.meme_id}`,
                mintedTokens: [],
              };
            }
          })
        );

        if (!cancelled) {
          setTopWinners(enriched);
        }
      } catch (error) {
        console.error("Failed to load top winners:", error);
        if (!cancelled) {
          setWinnersError(error?.message ?? "Failed to load top winners");
          setTopWinners([]);
        }
      } finally {
        if (!cancelled) {
          setWinnersLoading(false);
        }
      }
    };

    fetchTopWinners();

    return () => {
      cancelled = true;
    };
  }, []);

  const shortPrincipal = (value) => {
    if (!value) return "Unknown";
    const text = String(value);
    if (text.length <= 10) return text;
    return `${text.slice(0, 5)}…${text.slice(-4)}`;
  };

  const formatTimestamp = (ns) => {
    if (!ns) return null;
    try {
      const ms = Number(ns) / 1_000_000;
      if (!Number.isFinite(ms)) return null;
      return new Date(ms).toLocaleString();
    } catch (error) {
      console.warn("Failed to format timestamp", ns, error);
      return null;
    }
  };

  const canMintWinner = (winner) => {
    if (!winner) return false;
    if (!isAuthenticated || authLoading) return false;
    if (!principal) return false;
    const mintedCount = winner.mintedTokens?.length ?? 0;
    return mintedCount === 0 && winner.ownerPrincipal === principal;
  };

  const openMintDialog = (winner) => {
    if (!winner) return;
    setMintDialog({
      open: true,
      winner,
      mode: "single",
      editions: 10,
      isSubmitting: false,
      error: null,
    });
  };

  const closeMintDialog = () => {
    setMintDialog({
      open: false,
      winner: null,
      mode: "single",
      editions: 10,
      isSubmitting: false,
      error: null,
    });
  };

  const handleMintModeChange = (mode) => {
    setMintDialog((prev) => ({ ...prev, mode, error: null }));
  };

  const handleEditionChange = (value) => {
    setMintDialog((prev) => ({ ...prev, editions: value }));
  };

  const handleMintSubmit = async () => {
    const winner = mintDialog.winner;
    if (!winner) return;

    try {
      setMintDialog((prev) => ({ ...prev, isSubmitting: true, error: null }));

      let modePayload;
      if (mintDialog.mode === "single") {
        modePayload = { type: "single" };
      } else {
        const parsed = Number(mintDialog.editions);
        if (!Number.isInteger(parsed) || parsed < 2) {
          throw new Error("Collections require at least 2 editions.");
        }
        if (parsed > 50) {
          throw new Error("Collections are limited to 50 editions.");
        }
        modePayload = { type: "collection", editions: parsed };
      }

      const mintedTokens = await backendService.mintMeme(
        winner.memeId,
        modePayload
      );
      const normalized = normalizeMintedTokens(mintedTokens);

      setTopWinners((prev) =>
        prev.map((entry) =>
          entry.memeId === winner.memeId
            ? { ...entry, mintedTokens: normalized }
            : entry
        )
      );

      toast({
        title: "NFT mint successful",
        description:
          mintDialog.mode === "single"
            ? "Your 1/1 meme is now live on-chain."
            : `Minted ${normalized.length} editions ready for collectors.`,
      });

      closeMintDialog();
    } catch (error) {
      console.error("Minting failed:", error);
      setMintDialog((prev) => ({
        ...prev,
        error: error?.message ?? "Failed to mint NFT",
      }));
    } finally {
      setMintDialog((prev) => ({ ...prev, isSubmitting: false }));
      if (winner) {
        try {
          const refreshed = await backendService.getMintedTokens(winner.memeId);
          const normalized = normalizeMintedTokens(refreshed);
          setTopWinners((prev) =>
            prev.map((entry) =>
              entry.memeId === winner.memeId
                ? { ...entry, mintedTokens: normalized }
                : entry
            )
          );
        } catch (refreshError) {
          console.warn("Failed to refresh minted tokens:", refreshError);
        }
      }
    }
  };

  const modalWinner = mintDialog.winner;
  const modalMintedCount = modalWinner?.mintedTokens?.length ?? 0;
  const allowMintAction = modalWinner ? canMintWinner(modalWinner) && modalMintedCount === 0 : false;

  useEffect(() => {
    if (totalSlides > 1) {
      const id = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 6000);
      return () => clearInterval(id);
    }
  }, [totalSlides]);

  const currentMeme = useMemo(
    () => trendingMemes[currentSlide] ?? trendingMemes[0],
    [currentSlide]
  );

  const goToSlide = (direction) => {
    setCurrentSlide((prev) => {
      if (direction === "next") {
        return (prev + 1) % totalSlides;
      }
      return (prev - 1 + totalSlides) % totalSlides;
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="hero-aurora" />
        <div className="hero-grid" />
        <div className="hero-sparkles" />
      </div>

      <Navigation />

      <main className="relative z-10">
        <section className="px-5 pb-4 pt-16 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
              <Flame className="h-4 w-4 text-primary" />
              Meme Marketplace
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Discover and trade the hottest meme NFTs
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:max-w-2xl">
              Browse live auctions, vote on trending memes, and collect verified NFT drops from the Mementic ecosystem.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/myplace">
                <Button variant="hero" size="xl" className="px-10">
                  Create Your Meme
                </Button>
              </Link>
              <Link to="/auction">
                <Button variant="outline" size="lg" className="rounded-full border-border/60 bg-background/70">
                  View Live Auctions
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-5 pb-12 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
            {trendingMemes.length > 0 && (
              <div className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/80 p-2 shadow-card backdrop-blur-xl">
              <div className="absolute left-4 top-4 z-20 flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1 text-xs uppercase tracking-[0.3em] text-primary">
                <TrendingUp className="h-3.5 w-3.5" /> Trending Memes
              </div>
              <button
                type="button"
                onClick={() => goToSlide("prev")}
                className="group absolute left-6 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                aria-label="Previous meme"
              >
                <ArrowLeft className="h-5 w-5" />
              </button>
              <button
                type="button"
                onClick={() => goToSlide("next")}
                className="group absolute right-6 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full border border-border/60 bg-background/90 text-muted-foreground transition hover:border-primary/60 hover:text-primary"
                aria-label="Next meme"
              >
                <ArrowRight className="h-5 w-5" />
              </button>
              <div className="relative overflow-hidden rounded-[calc(theme(borderRadius.3xl)-0.5rem)]">
                <AnimatePresence mode="wait">
                  <motion.div
                    key={currentMeme.id}
                    variants={slideVariants}
                    initial="initial"
                    animate="animate"
                    exit="exit"
                    transition={{ duration: 0.5, ease: "easeOut" }}
                    className="grid gap-8 p-6 sm:p-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center"
                  >
                    <div className="overflow-hidden rounded-3xl border border-border/60 bg-background/60">
                      <motion.img
                        src={currentMeme.image}
                        alt={currentMeme.title}
                        className="h-full w-full object-cover"
                        initial={{ scale: 1.08 }}
                        animate={{ scale: 1 }}
                        transition={{ duration: 0.6, ease: "easeOut" }}
                      />
                    </div>
                    <div className="flex flex-col gap-6 text-left">
                      <div className="space-y-2">
                        <div className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                          {currentMeme.collection}
                        </div>
                        <h2 className="text-3xl font-semibold text-foreground sm:text-4xl">
                          {currentMeme.title}
                        </h2>
                        <p className="text-sm text-muted-foreground">
                          {currentMeme.description}
                        </p>
                      </div>
                      <div className="grid gap-4 sm:grid-cols-3">
                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Creator</p>
                          <p className="mt-2 text-lg font-semibold">{currentMeme.creator}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">Floor</p>
                          <p className="mt-2 text-lg font-semibold text-primary">{currentMeme.floor}</p>
                        </div>
                        <div className="rounded-2xl border border-border/60 bg-background/80 p-4">
                          <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{currentMeme.priceLabel}</p>
                          <p className="mt-2 text-lg font-semibold text-foreground">{currentMeme.price}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                </AnimatePresence>
              </div>
              <div className="mt-3 flex justify-center gap-2 pb-2">
                {trendingMemes.map((meme, index) => (
                  <button
                    key={meme.id}
                    type="button"
                    onClick={() => setCurrentSlide(index)}
                    className={`h-2.5 rounded-full transition ${
                      index === currentSlide
                        ? "w-10 bg-primary"
                        : "w-5 bg-border hover:bg-primary/60"
                    }`}
                    aria-label={`Go to slide ${index + 1}`}
                  />
                ))}
              </div>
            </div>
            )}

            <Card className="border-border/50 bg-background/80 shadow-card backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-muted-foreground">
                  <Trophy className="h-5 w-5 text-primary" />
                  Marketplace Leaderboard
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                <div className="space-y-3">
                  {winnersLoading ? (
                    <div className="flex items-center justify-center rounded-2xl border border-border/60 bg-background/60 p-6 text-sm text-muted-foreground">
                      <Loader2 className="mr-2 h-4 w-4 animate-spin text-primary" />
                      Loading weekly champions…
                    </div>
                  ) : winnersError ? (
                    <div className="rounded-2xl border border-destructive/50 bg-destructive/10 p-4 text-sm text-destructive">
                      {winnersError}
                    </div>
                  ) : topWinners.length > 0 ? (
                    topWinners.map((winner) => {
                      const mintedCount = winner.mintedTokens?.length ?? 0;
                      const canMint = canMintWinner(winner);
                      return (
                        <div
                          key={winner.memeId}
                          className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-4 transition hover:border-primary/50 hover:bg-background/80"
                        >
                          <div className="flex flex-wrap items-center gap-4">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                              #{winner.rank}
                            </span>
                            {winner.imageUrl ? (
                              <div className="h-16 w-16 overflow-hidden rounded-xl border border-border/60">
                                <img
                                  src={winner.imageUrl}
                                  alt={winner.title}
                                  className="h-full w-full object-cover"
                                  loading="lazy"
                                />
                              </div>
                            ) : null}
                            <div className="min-w-[12rem] flex-1">
                              <p className="text-base font-semibold text-foreground">{winner.title}</p>
                              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                Owner · {shortPrincipal(winner.ownerPrincipal)}
                              </p>
                            </div>
                            <div className="flex flex-col items-end gap-1 text-xs text-muted-foreground">
                              <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 font-semibold text-primary">
                                <TrendingUp className="h-3.5 w-3.5" />
                                {winner.upvotes.toLocaleString()} votes
                              </span>
                              {mintedCount > 0 ? (
                                <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/10 px-3 py-1 font-semibold text-emerald-300">
                                  <Sparkles className="h-3.5 w-3.5" />
                                  Minted · {mintedCount} {mintedCount === 1 ? "edition" : "editions"}
                                </span>
                              ) : null}
                            </div>
                          </div>
                          <div className="flex flex-wrap items-center justify-between gap-3 text-xs text-muted-foreground">
                            <span>
                              Meme ID #{winner.memeId}
                              {latestWeek?.week_id !== undefined && (
                                <>
                                  {" "}• Week {Number(latestWeek.week_id)}
                                </>
                              )}
                            </span>
                            {latestWeek?.end_time ? (
                              <span className="text-muted-foreground/80">
                                Finalized {formatTimestamp(latestWeek.end_time)}
                              </span>
                            ) : null}
                          </div>
                          <div className="flex flex-wrap gap-3">
                            <Button
                              type="button"
                              variant="ghost"
                              className="border border-border/60 bg-background/70"
                              onClick={() => openMintDialog(winner)}
                              disabled={!canMint}
                            >
                              {canMint ? "Convert to NFT" : mintedCount > 0 ? "Already minted" : "Minting locked"}
                            </Button>
                            {mintedCount > 0 ? (
                              <Button
                                type="button"
                                variant="outline"
                                className="border-border/60 text-xs"
                                onClick={() => openMintDialog(winner)}
                              >
                                View mint details
                              </Button>
                            ) : null}
                          </div>
                          {!isAuthenticated && (
                            <p className="text-xs text-muted-foreground">
                              Login to mint your winning meme as an NFT.
                            </p>
                          )}
                          {canMint && !mintedCount && (
                            <p className="text-xs text-foreground/80">
                              You earned the top spot—choose between a single masterpiece or a limited collection when you mint.
                            </p>
                          )}
                        </div>
                      );
                    })
                  ) : (
                    <p className="text-sm text-muted-foreground">
                      Top winners will appear once a weekly voting round completes.
                    </p>
                  )}
                </div>
                {latestWeek ? (
                  <div className="rounded-2xl border border-border/60 bg-background/60 p-4 text-xs text-muted-foreground">
                    <p className="font-semibold text-foreground">
                      Week #{Number(latestWeek.week_id)} summary
                    </p>
                    {latestWeek.end_time ? (
                      <p className="mt-1">
                        Voting closed on {formatTimestamp(latestWeek.end_time)}
                      </p>
                    ) : null}
                    <p className="mt-1">
                      Winning memes can be minted directly from this panel—choose your drop style and launch your NFT in seconds.
                    </p>
                  </div>
                ) : null}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-5 pb-12 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <Card className="border-border/50 bg-background/80 shadow-card backdrop-blur-xl">
              <CardHeader className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between">
                <div>
                  <CardTitle className="flex items-center gap-3 text-xl font-semibold text-muted-foreground">
                    <TrendingUp className="h-5 w-5 text-primary" />
                    Market Table
                  </CardTitle>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Browse live NFT collections, track rankings, and discover trending meme drops in the marketplace.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
                {marketCollections.length > 0 ? (
                  <table className="min-w-full divide-y divide-border text-left text-sm">
                    <thead className="uppercase tracking-[0.3em] text-muted-foreground">
                      <tr>
                        <th className="py-3 pr-4 font-medium">Ranking</th>
                        <th className="py-3 pr-4 font-medium">Collection Name</th>
                        <th className="py-3 pr-4 font-medium">Top Offer</th>
                        <th className="py-3 pr-4 font-medium">Volume</th>
                        <th className="py-3 pr-4 font-medium">Floor</th>
                        <th className="py-3 pr-4 font-medium">Price</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-border/60">
                      {marketCollections.map((collection) => (
                        <tr key={collection.rank} className="transition hover:bg-background/50">
                          <td className="whitespace-nowrap py-4 pr-4 font-semibold text-muted-foreground">
                            #{collection.rank}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4 text-foreground">
                            {collection.name}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4 text-foreground">
                            {collection.topOffer}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4 text-foreground">
                            {collection.volume}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4 text-primary">
                            {collection.floor}
                          </td>
                          <td className="whitespace-nowrap py-4 pr-4 text-foreground">
                            {collection.price}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                ) : (
                  <p className="text-sm text-muted-foreground py-8 text-center">No market data available yet.</p>
                )}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-6">
            <div className="flex flex-col gap-3">
              <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                <Activity className="h-4 w-4 text-primary" />
                Market Feed
              </div>
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Watch the market feed in full fidelity
              </h2>
              <p className="text-sm text-muted-foreground sm:max-w-3xl">
                Discover trending NFT collections with detailed previews, creator stories, and marketplace analytics.
              </p>
            </div>

            {marketFeed.length > 0 ? (
              <div className="grid gap-6 md:grid-cols-2 xl:grid-cols-4">
                {marketFeed.map((item) => (
                  <motion.div
                    key={item.id}
                    whileHover={{ y: -6 }}
                    transition={{ duration: 0.3 }}
                    className="overflow-hidden rounded-3xl border border-border/60 bg-background/80 shadow-card"
                  >
                    <div className="relative h-56 overflow-hidden">
                      <img src={item.image} alt={item.title} className="h-full w-full object-cover" />
                    </div>
                    <div className="space-y-2 p-5 text-sm">
                      <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">{item.collection}</p>
                      <h3 className="text-lg font-semibold text-foreground">{item.title}</h3>
                      <div className="flex items-center justify-between text-xs text-muted-foreground">
                        <span>Creator: {item.creator}</span>
                        <span className="text-primary">{item.price}</span>
                      </div>
                    </div>
                  </motion.div>
                ))}
              </div>
            ) : (
              <p className="text-sm text-muted-foreground py-8 text-center">No market feed available yet.</p>
            )}
          </div>
        </section>
        {mintDialog.open && modalWinner ? (
          <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 p-4">
            <Card className="w-full max-w-lg border-border/70 bg-background/95 shadow-2xl">
              <CardHeader>
                <CardTitle className="text-lg font-semibold text-muted-foreground">
                  Mint #{modalWinner.memeId} · {modalWinner.title}
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                  <p className="font-semibold text-foreground">{modalWinner.title}</p>
                  <p className="mt-1 text-xs uppercase tracking-[0.3em]">
                    Owner · {shortPrincipal(modalWinner.ownerPrincipal)}
                  </p>
                  {modalMintedCount > 0 ? (
                    <p className="mt-2 text-emerald-300">
                      Already minted {modalMintedCount} {modalMintedCount === 1 ? "edition" : "editions"}.
                    </p>
                  ) : (
                    <p className="mt-2">
                      Choose how you want to drop this meme on-chain—keep it a 1/1 or launch a limited collection.
                    </p>
                  )}
                </div>

                <div className="grid gap-3 sm:grid-cols-2">
                  <button
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      mintDialog.mode === "single"
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/60 bg-background/70 hover:border-primary/40"
                    }`}
                    onClick={() => handleMintModeChange("single")}
                    disabled={mintDialog.isSubmitting}
                  >
                    <span className="block font-semibold">Single edition</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Mint a 1/1 masterpiece for collectors.
                    </span>
                  </button>
                  <button
                    type="button"
                    className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                      mintDialog.mode === "collection"
                        ? "border-primary/60 bg-primary/10 text-primary"
                        : "border-border/60 bg-background/70 hover:border-primary/40"
                    }`}
                    onClick={() => handleMintModeChange("collection")}
                    disabled={mintDialog.isSubmitting || modalMintedCount > 0}
                  >
                    <span className="block font-semibold">Limited collection</span>
                    <span className="mt-1 block text-xs text-muted-foreground">
                      Set a finite edition count for your drop.
                    </span>
                  </button>
                </div>

                {mintDialog.mode === "collection" && (
                  <div className="space-y-2 text-sm">
                    <label className="text-xs font-medium text-muted-foreground" htmlFor="mint-editions">
                      Edition count (2 – 50)
                    </label>
                    <Input
                      id="mint-editions"
                      type="number"
                      min={2}
                      max={50}
                      value={mintDialog.editions}
                      onChange={(event) => handleEditionChange(event.target.value)}
                      disabled={mintDialog.isSubmitting}
                    />
                  </div>
                )}

                {mintDialog.error ? (
                  <p className="text-sm text-destructive">{mintDialog.error}</p>
                ) : null}

                <div className="flex flex-wrap justify-end gap-3">
                  <Button variant="ghost" onClick={closeMintDialog} disabled={mintDialog.isSubmitting}>
                    Close
                  </Button>
                  <Button
                    onClick={handleMintSubmit}
                    disabled={mintDialog.isSubmitting || !allowMintAction}
                  >
                    {mintDialog.isSubmitting ? (
                      <span className="inline-flex items-center gap-2">
                        <Loader2 className="h-4 w-4 animate-spin" /> Minting…
                      </span>
                    ) : allowMintAction ? (
                      "Mint now"
                    ) : modalMintedCount > 0 ? (
                      "Mint complete"
                    ) : (
                      "Mint locked"
                    )}
                  </Button>
                </div>
              </CardContent>
            </Card>
          </div>
        ) : null}
      </main>
    </div>
  );
};

export default Marketplace;
