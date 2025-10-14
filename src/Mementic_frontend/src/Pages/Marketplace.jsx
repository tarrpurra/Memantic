import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Flame,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Navigation from "../components/Navigation";
import backendService from "../services/backendService";
import { useToast } from "../hooks/use-toast";

const trendingMemes = [];

const leaderboardEntries = [];

const marketCollections = [];

const marketFeed = [];

const slideVariants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -12 },
};

const unwrapOptional = (value) => (Array.isArray(value) ? value[0] : value);

const formatPrincipalId = (principal) => {
  if (!principal) return "-";
  const text = principal?.toText?.() ?? principal?.toString?.() ?? String(principal);
  if (text.length <= 10) return text;
  return `${text.slice(0, 5)}...${text.slice(-3)}`;
};

const formatRanking = (rank) => {
  const value = unwrapOptional(rank);
  if (value === undefined || value === null) return "Unranked";
  const numeric = Number(value);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Unranked";
  }
  return `#${numeric}`;
};

const Marketplace = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = trendingMemes.length;
  const [marketListings, setMarketListings] = useState([]);
  const [loadingListings, setLoadingListings] = useState(true);
  const [buyingId, setBuyingId] = useState(null);
  const { toast } = useToast();

  useEffect(() => {
    if (totalSlides > 1) {
      const id = setInterval(() => {
        setCurrentSlide((prev) => (prev + 1) % totalSlides);
      }, 6000);
      return () => clearInterval(id);
    }
  }, [totalSlides]);

  useEffect(() => {
    const loadListings = async () => {
      try {
        await backendService.ensureReady();
        const listings = await backendService.getMarketplaceListings(0, 20);
        setMarketListings(listings);
      } catch (error) {
        console.error("Failed to load marketplace listings", error);
        toast({
          title: "Marketplace unavailable",
          description: error.message ?? String(error),
          variant: "destructive",
        });
      } finally {
        setLoadingListings(false);
      }
    };
    loadListings();
  }, [toast]);

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

  const formatPrice = (value) => {
    if (value === undefined || value === null) return "-";
    const nat = typeof value === "bigint" ? value : BigInt(value);
    const whole = nat / 100000000n;
    const fraction = nat % 100000000n;
    const fracStr = fraction.toString().padStart(8, "0").replace(/0+$/, "");
    return `${whole}${fracStr ? `.${fracStr}` : ""} ICP`;
  };

  const refreshListings = async () => {
    setLoadingListings(true);
    try {
      const listings = await backendService.getMarketplaceListings(0, 20);
      setMarketListings(listings);
    } catch (error) {
      console.error("Failed to refresh listings", error);
      toast({
        title: "Refresh failed",
        description: error.message ?? String(error),
        variant: "destructive",
      });
    } finally {
      setLoadingListings(false);
    }
  };

  const handleBuy = async (listing) => {
    try {
      const id = listing.listing?.listing_id ?? listing.listing_id;
      const idText = id?.toString?.() ?? String(id);
      setBuyingId(idText);
      await backendService.buyFromListing(id, 1);
      toast({
        title: "Purchase successful",
        description: "NFT purchased successfully.",
      });
      await refreshListings();
    } catch (error) {
      console.error("Purchase failed", error);
      toast({
        title: "Purchase failed",
        description: error.message ?? String(error),
        variant: "destructive",
      });
    } finally {
      setBuyingId(null);
    }
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
                    {leaderboardEntries.length > 0 ? leaderboardEntries.map((entry, index) => (
                      <div
                        key={entry.id}
                        className="flex flex-col gap-4 rounded-2xl border border-border/60 bg-background/70 p-4 transition hover:border-primary/50 hover:bg-background/80"
                      >
                        <div className="flex flex-wrap items-center justify-between gap-3">
                          <div className="flex items-center gap-3">
                            <span className="flex h-9 w-9 items-center justify-center rounded-full bg-primary/10 font-semibold text-primary">
                              #{index + 1}
                            </span>
                            <div>
                              <p className="text-base font-semibold text-foreground">{entry.title}</p>
                              <p className="text-xs uppercase tracking-[0.3em] text-muted-foreground">
                                {entry.watchers} watchers
                              </p>
                            </div>
                          </div>
                          <span className="inline-flex items-center gap-1 rounded-full bg-primary/10 px-3 py-1 text-xs font-semibold text-primary">
                            <TrendingUp className="h-3.5 w-3.5" /> {entry.change}
                          </span>
                        </div>
                        <div className="grid gap-2 text-sm text-muted-foreground sm:grid-cols-3">
                          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em]">Top Offer</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{entry.topOffer}</p>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em]">Volume</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{entry.volume}</p>
                          </div>
                          <div className="rounded-xl border border-border/60 bg-background/70 p-3">
                            <p className="text-[0.6rem] uppercase tracking-[0.4em]">Floor</p>
                            <p className="mt-2 text-sm font-semibold text-foreground">{entry.floor}</p>
                          </div>
                        </div>
                      </div>
                    )) : (
                      <p className="text-sm text-muted-foreground">No leaderboard data available yet.</p>
                    )}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                        <BarChart3 className="h-4 w-4" /> Snapshot
                      </div>
                      <p className="mt-3 text-lg font-semibold text-foreground">0% of active bids are trending upward.</p>
                      <p className="mt-3 text-xs">
                        Marketplace activity shows steady growth with verified NFT drops and community-driven auctions.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-primary/30 bg-background/70 p-5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                        <Activity className="h-4 w-4" /> Market Pulse
                      </div>
                      <p className="mt-3 text-lg font-semibold text-foreground">Average time to flip is now 0 minutes.</p>
                      <div className="mt-4 grid gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                          <span>Hot Offers</span>
                          <span className="text-primary">0%</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                          <span>Whale Activity</span>
                          <span className="text-primary">0%</span>
                        </div>
                      </div>
                    </div>
                  </div>
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
            <Card className="border-border/60 bg-background/80 shadow-card backdrop-blur-xl">
              <CardHeader className="flex items-center justify-between">
                <CardTitle className="flex items-center gap-3 text-lg font-semibold text-muted-foreground">
                  <Activity className="h-5 w-5 text-primary" />
                  Live Listings
                </CardTitle>
                <Button variant="outline" size="sm" onClick={refreshListings} disabled={loadingListings}>
                  Refresh
                </Button>
              </CardHeader>
              <CardContent className="space-y-4">
                {loadingListings ? (
                  <p className="text-sm text-muted-foreground">Loading listings...</p>
                ) : marketListings.length === 0 ? (
                  <p className="text-sm text-muted-foreground">No NFTs are currently listed for sale.</p>
                ) : (
                  <div className="space-y-3">
                    {marketListings.map((entry) => {
                      const listing = entry.listing ?? entry;
                      const listingId = listing.listing_id;
                      const listingIdText = listingId?.toString?.() ?? String(listingId);
                      const sellerText = formatPrincipalId(listing.seller);
                      const floorPrice = formatPrice(unwrapOptional(entry.market?.floor_price));
                      const totalVolume = formatPrice(entry.market?.total_volume);
                      const rankingText = formatRanking(entry.market?.ranking);
                      const listingPrice = formatPrice(listing.unit_price);
                      const marketOwner = formatPrincipalId(unwrapOptional(entry.market?.current_owner));
                      const editionSize = unwrapOptional(entry.edition_size);
                      const isCollection = entry.is_collection;
                      return (
                        <div
                          key={listingIdText}
                          className="grid gap-4 rounded-2xl border border-border/60 bg-background/70 p-4 sm:grid-cols-[160px_1fr_auto] sm:items-center"
                        >
                          <div className="h-40 w-full overflow-hidden rounded-xl bg-muted">
                            {entry.image_uri ? (
                              <img src={entry.image_uri} alt={entry.name} className="h-full w-full object-cover" />
                            ) : (
                              <div className="flex h-full w-full items-center justify-center text-xs text-muted-foreground">
                                No preview
                              </div>
                            )}
                          </div>
                          <div className="space-y-3">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:justify-between">
                              <div>
                                <p className="text-sm font-semibold text-foreground">{entry.name}</p>
                                <p className="text-xs text-muted-foreground">Listing #{listingIdText}</p>
                                <p className="text-xs text-muted-foreground">Seller {sellerText}</p>
                                <p className="text-xs text-muted-foreground">Owner {marketOwner}</p>
                              </div>
                              <span className="text-sm font-semibold text-primary">{listingPrice}</span>
                            </div>
                            <div className="grid gap-x-4 gap-y-1 text-xs text-muted-foreground sm:grid-cols-2">
                              <span>Quantity Listed</span>
                              <span className="text-right text-foreground">{Number(listing.quantity ?? 0)}</span>
                              <span>Type</span>
                              <span className="text-right text-foreground">
                                {isCollection ? "Collection" : "Single"}
                              </span>
                              {isCollection && (
                                <span className="col-span-2 flex items-center justify-between text-foreground">
                                  <span>Edition Size</span>
                                  <span>{editionSize ?? "-"}</span>
                                </span>
                              )}
                              <span>Floor Price</span>
                              <span className="text-right text-foreground">{floorPrice}</span>
                              <span>Total Volume</span>
                              <span className="text-right text-foreground">{totalVolume}</span>
                              <span>Ranking</span>
                              <span className="text-right text-foreground">{rankingText}</span>
                            </div>
                          </div>
                          <div className="flex flex-col items-end justify-between gap-3">
                            <Button
                              onClick={() => handleBuy(entry)}
                              disabled={buyingId === listingIdText}
                            >
                              {buyingId === listingIdText ? "Buying..." : "Buy"}
                            </Button>
                            <span className="text-xs text-muted-foreground">
                              Token {listing.token_id?.toString?.() ?? String(listing.token_id)}
                            </span>
                          </div>
                        </div>
                      );
                    })}
                  </div>
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
      </main>
    </div>
  );
};

export default Marketplace;
