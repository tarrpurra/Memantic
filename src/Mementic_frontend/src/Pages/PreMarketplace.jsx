import { useEffect, useMemo, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  BarChart3,
  Flame,
  Search,
  Sparkles,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import Navigation from "../components/Navigation";
import meme1 from "../../../images/1.jpg";
import meme2 from "../../../images/2.jpg";
import meme3 from "../../../images/3.jpg";
import meme4 from "../../../images/4.jpg";
import meme5 from "../../../images/5.jpg";
import meme6 from "../../../images/6.jpg";
import meme7 from "../../../images/7.jpg";
import meme9 from "../../../images/9.jpg";

const trendingMemes = [
  {
    id: "meme-eden-01",
    title: "Ordinal Blitz",
    collection: "Bitcoin Puppets",
    creator: "@ordinalmaxi",
    floor: "0.318 BTC",
    volume: "2.1K BTC",
    priceLabel: "Top Offer",
    price: "0.302 BTC",
    description:
      "1000 puppets from the fringes of the iconmic grid, where the most unconventional and obsessed miners gather.",
    image: meme1,
  },
  {
    id: "meme-eden-02",
    title: "NodeMonkes",
    collection: "NodeMonkes",
    creator: "@icnodes",
    floor: "0.086 BTC",
    volume: "1.2K BTC",
    priceLabel: "Top Offer",
    price: "0.079 BTC",
    description:
      "OG culture captured in pixel perfection. The legendary troop that put Bitcoin memes on the metaverse map.",
    image: meme2,
  },
  {
    id: "meme-eden-03",
    title: "Taproot Wizards",
    collection: "Taproot Wizards",
    creator: "@wizdao",
    floor: "0.219 BTC",
    volume: "3.8K BTC",
    priceLabel: "Top Offer",
    price: "0.206 BTC",
    description:
      "Hand-crafted spellwork for the on-chain underground. Every piece comes soaked in wizard energy.",
    image: meme3,
  },
  {
    id: "meme-eden-04",
    title: "Magic Ordinals",
    collection: "Magic Ordinals",
    creator: "@magiceden",
    floor: "0.142 BTC",
    volume: "980 BTC",
    priceLabel: "Top Offer",
    price: "0.135 BTC",
    description:
      "Spellbinding pixel enchantments ready to flip the timeline. Only 777 ever conjured.",
    image: meme4,
  },
];

const leaderboardEntries = [
  {
    id: "leader-01",
    title: "Bitcoin Puppets",
    watchers: "18.7K",
    change: "+12.4%",
    topOffer: "0.302 BTC",
    volume: "2.1K BTC",
    floor: "0.318 BTC",
  },
  {
    id: "leader-02",
    title: "NodeMonkes",
    watchers: "14.6K",
    change: "+8.9%",
    topOffer: "0.079 BTC",
    volume: "1.2K BTC",
    floor: "0.086 BTC",
  },
  {
    id: "leader-03",
    title: "Taproot Wizards",
    watchers: "12.8K",
    change: "+15.6%",
    topOffer: "0.206 BTC",
    volume: "3.8K BTC",
    floor: "0.219 BTC",
  },
  {
    id: "leader-04",
    title: "Rune Runners",
    watchers: "10.1K",
    change: "+6.3%",
    topOffer: "0.051 BTC",
    volume: "786 BTC",
    floor: "0.057 BTC",
  },
  {
    id: "leader-05",
    title: "Satoshi Vibes",
    watchers: "8.4K",
    change: "+9.4%",
    topOffer: "0.034 BTC",
    volume: "512 BTC",
    floor: "0.039 BTC",
  },
  {
    id: "leader-06",
    title: "MemeForge Alpha",
    watchers: "7.9K",
    change: "+4.1%",
    topOffer: "0.028 BTC",
    volume: "401 BTC",
    floor: "0.031 BTC",
  },
];

const marketCollections = [
  {
    rank: 1,
    name: "Bitcoin Puppets",
    topOffer: "0.302 BTC",
    volume: "2.1K BTC",
    floor: "0.318 BTC",
    price: "9.37 ICP",
  },
  {
    rank: 2,
    name: "NodeMonkes",
    topOffer: "0.079 BTC",
    volume: "1.2K BTC",
    floor: "0.086 BTC",
    price: "4.11 ICP",
  },
  {
    rank: 3,
    name: "Taproot Wizards",
    topOffer: "0.206 BTC",
    volume: "3.8K BTC",
    floor: "0.219 BTC",
    price: "12.04 ICP",
  },
  {
    rank: 4,
    name: "Rune Runners",
    topOffer: "0.051 BTC",
    volume: "786 BTC",
    floor: "0.057 BTC",
    price: "3.88 ICP",
  },
  {
    rank: 5,
    name: "Magic Ordinals",
    topOffer: "0.135 BTC",
    volume: "980 BTC",
    floor: "0.142 BTC",
    price: "6.12 ICP",
  },
  {
    rank: 6,
    name: "Satoshi Vibes",
    topOffer: "0.034 BTC",
    volume: "512 BTC",
    floor: "0.039 BTC",
    price: "2.64 ICP",
  },
];

const marketFeed = [
  {
    id: "feed-01",
    title: "Wizard 722",
    collection: "Taproot Wizards",
    price: "0.214 BTC",
    creator: "wizdao",
    image: meme5,
  },
  {
    id: "feed-02",
    title: "Ordinal Grail",
    collection: "Bitcoin Puppets",
    price: "0.333 BTC",
    creator: "ordinalmaxi",
    image: meme6,
  },
  {
    id: "feed-03",
    title: "Monke Prime",
    collection: "NodeMonkes",
    price: "0.098 BTC",
    creator: "icnodes",
    image: meme7,
  },
  {
    id: "feed-04",
    title: "Rune Shaman",
    collection: "Rune Runners",
    price: "0.066 BTC",
    creator: "runelab",
    image: meme9,
  },
];

const slideVariants = {
  initial: { opacity: 0, scale: 0.96, y: 12 },
  animate: { opacity: 1, scale: 1, y: 0 },
  exit: { opacity: 0, scale: 0.96, y: -12 },
};

const PreMarketplace = () => {
  const [currentSlide, setCurrentSlide] = useState(0);
  const totalSlides = trendingMemes.length;

  useEffect(() => {
    const id = setInterval(() => {
      setCurrentSlide((prev) => (prev + 1) % totalSlides);
    }, 6000);
    return () => clearInterval(id);
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
              Pre Meme Marketplace
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Discover the next viral drop before it explodes
            </h1>
            <p className="mt-6 text-lg text-muted-foreground sm:max-w-2xl">
              Track pre-market momentum, surface community hype, and secure your position in the most anticipated meme collections.
            </p>
            <div className="mt-8 flex flex-col gap-3 sm:flex-row">
              <Link to="/myplace">
                <Button variant="hero" size="xl" className="px-10">
                  Launch a Pre-Market Drop
                </Button>
              </Link>
              <Link to="/marketplace">
                <Button variant="outline" size="lg" className="rounded-full border-border/60 bg-background/70">
                  View Live Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-5 pb-12 sm:px-8">
          <div className="mx-auto max-w-6xl space-y-8">
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

            <div className="grid gap-6 lg:grid-cols-[1.5fr_1fr]">
              <Card className="border-border/50 bg-background/80 shadow-card backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-muted-foreground">
                    <Trophy className="h-5 w-5 text-primary" />
                    Leaderboard Momentum
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  <div className="space-y-3">
                    {leaderboardEntries.map((entry, index) => (
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
                    ))}
                  </div>

                  <div className="grid gap-4 lg:grid-cols-2">
                    <div className="rounded-2xl border border-primary/40 bg-primary/5 p-5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                        <BarChart3 className="h-4 w-4" /> Snapshot
                      </div>
                      <p className="mt-3 text-lg font-semibold text-foreground">74.2% of active bids are trending upward.</p>
                      <p className="mt-3 text-xs">
                        Momentum accelerated in the last 24h across ordinal-backed drops with premium artwork and remix utility.
                      </p>
                    </div>
                    <div className="rounded-2xl border border-primary/30 bg-background/70 p-5 text-sm text-muted-foreground">
                      <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                        <Activity className="h-4 w-4" /> Market Pulse
                      </div>
                      <p className="mt-3 text-lg font-semibold text-foreground">Average time to flip is now 38 minutes.</p>
                      <div className="mt-4 grid gap-2 text-xs uppercase tracking-[0.3em] text-muted-foreground">
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                          <span>Hot Offers</span>
                          <span className="text-primary">+26%</span>
                        </div>
                        <div className="flex items-center justify-between rounded-xl border border-border/60 bg-background/70 px-3 py-2">
                          <span>Whale Activity</span>
                          <span className="text-primary">+18%</span>
                        </div>
                      </div>
                    </div>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/50 bg-background/80 shadow-card backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg font-semibold text-muted-foreground">
                    <Search className="h-5 w-5 text-primary" />
                    Search & Refine
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-5">
                  <div className="flex flex-col gap-4">
                    <div className="flex flex-col gap-3">
                      <div className="flex flex-col gap-3 rounded-full border border-border/60 bg-background/70 px-4 py-3 text-sm text-muted-foreground shadow-inner">
                        <div className="flex flex-wrap items-center gap-3">
                          <Search className="h-4 w-4 text-primary" />
                          <Input
                            placeholder="Search collections, creators, or traits"
                            className="border-0 bg-transparent px-0 text-sm text-foreground focus-visible:ring-0 focus-visible:ring-offset-0"
                          />
                          <div className="ml-auto flex items-center gap-2">
                            <select className="rounded-full border border-border/60 bg-background px-3 py-1 text-xs uppercase tracking-[0.3em] text-muted-foreground focus:outline-none">
                              <option value="all">All Drops</option>
                              <option value="top">Top Ranked</option>
                              <option value="rares">Rare Snipes</option>
                              <option value="curated">Curated Alpha</option>
                            </select>
                          </div>
                        </div>
                      </div>
                      <p className="text-xs text-muted-foreground">
                        Filter controls now live directly in the search—no extra cards, just fast curation.
                      </p>
                    </div>
                    <Button className="w-full rounded-full" variant="hero">
                      Start Scouting Memes
                    </Button>
                  </div>

                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4 text-sm text-muted-foreground">
                    <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-[0.3em] text-primary">
                      <Sparkles className="h-4 w-4" /> Alpha Notes
                    </div>
                    <p className="mt-3 text-xs">
                      Keep an eye on remix-ready memes with strong social momentum. Early bids here tend to secure the biggest upside.
                    </p>
                  </div>
                </CardContent>
              </Card>
            </div>
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
                    Track ranking, offers, and live momentum before each collection hits the primary marketplace.
                  </p>
                </div>
              </CardHeader>
              <CardContent className="overflow-x-auto">
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
                Watch the pre-market feed in full fidelity
              </h2>
              <p className="text-sm text-muted-foreground sm:max-w-3xl">
                Large-format previews make it effortless to scan meme quality, storytelling, and collectability before you place a bid.
              </p>
            </div>

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
          </div>
        </section>
      </main>
    </div>
  );
};

export default PreMarketplace;
