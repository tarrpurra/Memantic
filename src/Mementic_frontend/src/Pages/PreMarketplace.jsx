import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BarChart3,
  CheckCircle2,
  Flame,
  LineChart,
  Palette,
  Rocket,
  Sparkles,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import Navigation from "../components/Navigation";

const featureCards = [
  {
    title: "AI Assisted Creation",
    description:
      "Use curated prompt recipes and remixable templates to build hype-worthy memes in minutes.",
    icon: Sparkles,
    accent: "from-purple-500/60 to-cyan-400/50",
  },
  {
    title: "Momentum Tracking",
    description:
      "Live metrics help you understand which concepts are resonating before you mint.",
    icon: LineChart,
    accent: "from-cyan-400/40 to-sky-400/40",
  },
  {
    title: "Creator Rooms",
    description:
      "Host collaborative sessions with artists, writers, and strategists to finalize the drop.",
    icon: Users,
    accent: "from-amber-400/40 to-rose-400/40",
  },
  {
    title: "Visual Polish",
    description:
      "Layer filters, typography packs, and motion presets so each meme pops on the timeline.",
    icon: Palette,
    accent: "from-green-400/40 to-emerald-400/40",
  },
];

const launchTimeline = [
  {
    title: "Concept Sprint",
    description:
      "Kick off with AI-assisted brainstorming, inspiration boards, and audience targeting.",
    icon: Sparkles,
  },
  {
    title: "Community Preview",
    description:
      "Drop teaser frames, collect emoji reactions, and gather whitelist sign-ups.",
    icon: Users,
  },
  {
    title: "Mint Ready",
    description:
      "Finalize metadata, rarity tiers, and staking options before hitting the marketplace.",
    icon: Rocket,
  },
];

const readinessChecklist = [
  "AI prompt refined and saved",
  "Preview frames uploaded",
  "Community feedback loop activated",
  "Mint contract configured",
  "Launch schedule approved",
];

const cardVariants = {
  hidden: { opacity: 0, y: 20 },
  visible: (index) => ({
    opacity: 1,
    y: 0,
    transition: { delay: index * 0.08, duration: 0.4, ease: "easeOut" },
  }),
};

const PreMarketplace = () => {
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
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Flame className="h-4 w-4 text-primary" />
              Pre Meme Marketplace
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Warm up your drop before it hits the main marketplace
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Build momentum with collaborative tooling, creator analytics, and community-driven validation. The Pre Meme Marketplace is where cultural hits are born.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link to="/myplace">
                <Button variant="hero" size="xl" className="px-10">
                  Start Creating
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

        <section className="px-5 pb-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-2">
              <Card className="border-border/40 bg-background/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                    <BarChart3 className="h-4 w-4 text-primary" />
                    Pre-market performance
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4">
                  <div className="grid grid-cols-2 gap-4 text-sm text-muted-foreground">
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em]">Watchlist</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">1.2k</p>
                      <span className="text-xs text-primary">+18% this week</span>
                    </div>
                    <div className="rounded-2xl border border-border/60 bg-background/70 p-4">
                      <p className="text-xs uppercase tracking-[0.2em]">Remix saves</p>
                      <p className="mt-2 text-2xl font-semibold text-foreground">856</p>
                      <span className="text-xs text-primary">Trending now</span>
                    </div>
                  </div>
                  <p>
                    Spot which memes are gathering energy before they hit the auction floor. Insights update in real-time as the community reacts.
                  </p>
                </CardContent>
              </Card>

              <Card className="border-border/40 bg-background/80 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                    <Rocket className="h-4 w-4 text-primary" />
                    Launch timeline
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-6">
                  {launchTimeline.map((stage, index) => {
                    const Icon = stage.icon;
                    return (
                      <motion.div
                        key={stage.title}
                        custom={index}
                        initial="hidden"
                        whileInView="visible"
                        viewport={{ once: true, amount: 0.3 }}
                        variants={cardVariants}
                        className="flex items-start gap-4"
                      >
                        <span className="mt-1 flex h-10 w-10 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/60 to-cyan-400/50 text-white shadow-glow">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="space-y-1">
                          <h3 className="text-base font-semibold">{stage.title}</h3>
                          <p className="text-sm text-muted-foreground">{stage.description}</p>
                        </div>
                      </motion.div>
                    );
                  })}
                </CardContent>
              </Card>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8">
          <div className="mx-auto max-w-6xl">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-4">
              {featureCards.map((card, index) => {
                const Icon = card.icon;
                return (
                  <motion.div
                    key={card.title}
                    custom={index}
                    initial="hidden"
                    whileInView="visible"
                    viewport={{ once: true, amount: 0.2 }}
                    variants={cardVariants}
                    className="group overflow-hidden rounded-3xl border border-border/50 bg-background/70 p-[1px] shadow-card"
                  >
                    <div
                      className={`rounded-[calc(theme(borderRadius.3xl)-1px)] bg-gradient-to-br ${card.accent} p-0.5`}
                    >
                      <div className="flex h-full flex-col gap-4 rounded-[calc(theme(borderRadius.3xl)-1.5px)] bg-background/95 p-6 backdrop-blur-xl">
                        <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/70 to-cyan-400/60 text-white shadow-glow">
                          <Icon className="h-5 w-5" />
                        </span>
                        <div className="space-y-2">
                          <h3 className="text-lg font-semibold">{card.title}</h3>
                          <p className="text-sm text-muted-foreground">{card.description}</p>
                        </div>
                      </div>
                    </div>
                  </motion.div>
                );
              })}
            </div>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-10 rounded-3xl border border-border/40 bg-background/80 p-8 text-sm text-muted-foreground shadow-card backdrop-blur-xl sm:p-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Readiness checklist
              </h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1 text-xs font-semibold uppercase tracking-widest">
                <CheckCircle2 className="h-4 w-4 text-primary" />
                Launch certified
              </span>
            </div>

            <div className="grid gap-4 md:grid-cols-2">
              {readinessChecklist.map((item) => (
                <div
                  key={item}
                  className="flex items-start gap-3 rounded-2xl border border-border/60 bg-background/70 p-4"
                >
                  <CheckCircle2 className="mt-0.5 h-4 w-4 text-primary" />
                  <p>{item}</p>
                </div>
              ))}
            </div>

            <div className="flex flex-col items-start gap-4 rounded-2xl border border-dashed border-primary/40 bg-primary/5 p-6 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h3 className="text-xl font-semibold text-foreground">
                  Ready to open the floodgates?
                </h3>
                <p className="text-sm text-muted-foreground">
                  Move from concept to bids with a single click. Your audience is already waiting.
                </p>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/auction">
                  <Button variant="hero" className="rounded-full px-6">
                    Enter Auctions
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/meme-nft">
                  <Button variant="ghost" className="rounded-full border border-border/60 bg-background/70">
                    Mint NFT Collection
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

export default PreMarketplace;
