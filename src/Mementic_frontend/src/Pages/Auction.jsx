import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Activity,
  ArrowLeft,
  ArrowRight,
  Clock,
  Gavel,
  Sparkles,
  Trophy,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";

const liveAuctions = [
  {
    title: "Infinite HODL Spiral",
    creator: "0x7e3…91b",
    endsIn: "02:34:12",
    currentBid: "245 ICP",
    watchers: "982",
    accent: "from-purple-500/50 to-cyan-400/40",
  },
  {
    title: "Bear Market Bounceback",
    creator: "anon.studio",
    endsIn: "05:12:48",
    currentBid: "118 ICP",
    watchers: "643",
    accent: "from-amber-400/50 to-rose-400/40",
  },
  {
    title: "Diamond Hands Choir",
    creator: "memeDAO",
    endsIn: "08:56:03",
    currentBid: "76 ICP",
    watchers: "412",
    accent: "from-emerald-400/40 to-teal-400/40",
  },
];

const auctionPhases = [
  {
    title: "Open Bidding",
    description:
      "Creators set reserve prices while the community unlocks tiers with every new bid.",
    icon: Gavel,
  },
  {
    title: "Community Boost",
    description:
      "Fans stake support tokens to amplify meme visibility and unlock bonus rewards.",
    icon: Users,
  },
  {
    title: "Crown the Meme",
    description:
      "The final block crowns the winner and instantly distributes creator + supporter rewards.",
    icon: Trophy,
  },
];

const Auction = () => {
  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-background text-foreground">
      <div className="pointer-events-none absolute inset-0 opacity-70">
        <div className="hero-aurora" />
        <div className="hero-grid" />
        <div className="hero-sparkles" />
      </div>

      <header className="relative z-20 border-b border-border/40 bg-background/80 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <Link
            to="/pre-marketplace"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to pre-market flow
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/meme-nft">
              <Button variant="ghost" className="rounded-full border border-border/60 bg-background/70">
                Mint NFTs
              </Button>
            </Link>
            <Link to="/marketplace">
              <Button variant="hero" size="lg" className="rounded-full px-6">
                View Marketplace
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="px-5 py-16 sm:px-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Gavel className="h-4 w-4 text-primary" />
              Meme Auction Arena
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Real-time bidding that rewards culture shapers
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Watch the leaderboard shift with every bid, unlock community boosts, and elevate the memes destined for legendary status.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link to="/myplace">
                <Button variant="hero" size="xl" className="px-10">
                  Submit a Meme
                </Button>
              </Link>
              <Link to="/pre-marketplace">
                <Button variant="outline" size="lg" className="rounded-full border-border/60 bg-background/70">
                  Prep in Pre-Marketplace
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-3">
              {liveAuctions.map((auction, index) => (
                <motion.div
                  key={auction.title}
                  custom={index}
                  initial={{ opacity: 0, y: 24 }}
                  whileInView={{ opacity: 1, y: 0 }}
                  viewport={{ once: true, amount: 0.3 }}
                  transition={{ delay: index * 0.1, duration: 0.45, ease: "easeOut" }}
                  className="group overflow-hidden rounded-3xl border border-border/50 bg-background/80 p-[1px] shadow-card"
                >
                  <div
                    className={`rounded-[calc(theme(borderRadius.3xl)-1px)] bg-gradient-to-br ${auction.accent} p-0.5`}
                  >
                    <div className="flex h-full flex-col gap-4 rounded-[calc(theme(borderRadius.3xl)-1.5px)] bg-background/95 p-6 backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <span className="rounded-full border border-border/50 px-3 py-1 text-xs text-muted-foreground">
                          Ends in {auction.endsIn}
                        </span>
                        <span className="inline-flex items-center gap-1 text-xs text-primary">
                          <Clock className="h-3.5 w-3.5" />
                          Live
                        </span>
                      </div>
                      <div className="space-y-1">
                        <h3 className="text-lg font-semibold text-foreground">{auction.title}</h3>
                        <p className="text-sm text-muted-foreground">by {auction.creator}</p>
                      </div>
                      <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 p-4 text-sm">
                        <div>
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Current bid</p>
                          <p className="mt-1 text-2xl font-semibold text-foreground">{auction.currentBid}</p>
                        </div>
                        <div className="text-right">
                          <p className="text-xs uppercase tracking-[0.2em] text-muted-foreground">Watchers</p>
                          <p className="mt-1 text-lg font-semibold text-foreground">{auction.watchers}</p>
                        </div>
                      </div>
                      <Link to="/meme-nft" className="inline-flex items-center gap-2 text-sm font-semibold text-primary">
                        View drop
                        <ArrowRight className="h-4 w-4" />
                      </Link>
                    </div>
                  </div>
                </motion.div>
              ))}
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
            <Card className="border-border/40 bg-background/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                  <Activity className="h-4 w-4 text-primary" />
                  Live dynamics
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Bidding data updates on-chain every block. Auctions automatically extend when last-minute bids arrive, ensuring every meme gets a fair finale.
                </p>
                <div className="grid gap-4 sm:grid-cols-2">
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em]">Average APR</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">34%</p>
                    <span className="text-xs text-primary">Supporter staking</span>
                  </div>
                  <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                    <p className="text-xs uppercase tracking-[0.2em]">Bid velocity</p>
                    <p className="mt-2 text-2xl font-semibold text-foreground">+276%</p>
                    <span className="text-xs text-primary">Last 24h</span>
                  </div>
                </div>
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-background/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                  <Sparkles className="h-4 w-4 text-primary" />
                  Auction phases
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-6">
                {auctionPhases.map((phase, index) => {
                  const Icon = phase.icon;
                  return (
                    <motion.div
                      key={phase.title}
                      custom={index}
                      initial={{ opacity: 0, y: 16 }}
                      whileInView={{ opacity: 1, y: 0 }}
                      viewport={{ once: true, amount: 0.3 }}
                      transition={{ delay: index * 0.1, duration: 0.4, ease: "easeOut" }}
                      className="flex items-start gap-4"
                    >
                      <span className="mt-1 flex h-11 w-11 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/60 to-cyan-400/50 text-white shadow-glow">
                        <Icon className="h-5 w-5" />
                      </span>
                      <div className="space-y-1">
                        <h3 className="text-base font-semibold text-foreground">{phase.title}</h3>
                        <p className="text-sm text-muted-foreground">{phase.description}</p>
                      </div>
                    </motion.div>
                  );
                })}
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-6 rounded-3xl border border-border/40 bg-background/80 p-8 shadow-card backdrop-blur-xl sm:p-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Crown your meme in the arena
              </h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Trophy className="h-4 w-4 text-primary" />
                Champion rewards
              </span>
            </div>

            <p className="text-sm text-muted-foreground">
              When the timer hits zero the smart contract distributes rewards instantly: creator royalty, supporter boosts, and collector perks for the winning bid.
            </p>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
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
                <Link to="/meme-nft">
                  <Button variant="hero" className="rounded-full px-6">
                    Mint as NFT
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/marketplace">
                  <Button variant="ghost" className="rounded-full border border-border/60 bg-background/70">
                    Explore Marketplace
                  </Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
    </div>
  );
};

export default Auction;
