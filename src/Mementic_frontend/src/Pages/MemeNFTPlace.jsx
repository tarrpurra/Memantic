import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  ArrowLeft,
  ArrowRight,
  BadgeCheck,
  Flame,
  Gem,
  Layers,
  ShieldCheck,
  Sparkles,
  Wallet,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";

const utilityTiers = [
  {
    title: "Collector",
    description: "Exclusive meme drops, holder chat, and remix-ready source files.",
    perk: "+5% bid boost",
    accent: "from-purple-500/50 to-cyan-400/40",
  },
  {
    title: "Strategist",
    description: "Stake ICP to earn royalties, access on-chain analytics, and unlock gated collabs.",
    perk: "Royalty split",
    accent: "from-emerald-400/40 to-teal-400/40",
  },
  {
    title: "Champion",
    description: "Lead seasonal drops, curate spotlight galleries, and co-own community vaults.",
    perk: "Governance weight",
    accent: "from-amber-400/40 to-rose-400/40",
  },
];

const mintSteps = [
  {
    title: "Finalize metadata",
    description: "Lock in editions, rarity traits, and unlockable files for collectors.",
  },
  {
    title: "Enable staking",
    description: "Choose if holders earn passive ICP or utility tokens via the staking vault.",
  },
  {
    title: "Go live",
    description: "Launch to the marketplace, schedule auctions, or airdrop to your loyal fans.",
  },
];

const MemeNFTPlace = () => {
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
            to="/auction"
            className="inline-flex items-center gap-2 text-sm font-medium text-muted-foreground transition-colors hover:text-foreground"
          >
            <ArrowLeft className="h-4 w-4" />
            Back to auctions
          </Link>

          <div className="hidden items-center gap-3 sm:flex">
            <Link to="/marketplace">
              <Button variant="ghost" className="rounded-full border border-border/60 bg-background/70">
                Marketplace
              </Button>
            </Link>
            <Link to="/wallet">
              <Button variant="hero" size="lg" className="rounded-full px-6">
                Connect Wallet
              </Button>
            </Link>
          </div>
        </div>
      </header>

      <main className="relative z-10">
        <section className="px-5 py-16 sm:px-8">
          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-2 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Sparkles className="h-4 w-4 text-primary" />
              Meme NFT Launchpad
            </span>
            <h1 className="mt-6 text-balance text-4xl font-semibold tracking-tight sm:text-5xl">
              Ownable culture, composable utility
            </h1>
            <p className="mt-6 text-lg text-muted-foreground">
              Convert your meme momentum into on-chain value. Mint verified NFTs, set up staking rewards, and reward your holders with evolving perks.
            </p>
            <div className="mt-10 flex flex-col gap-4 sm:flex-row">
              <Link to="/myplace">
                <Button variant="hero" size="xl" className="px-10">
                  Create new drop
                </Button>
              </Link>
              <Link to="/pre-marketplace">
                <Button variant="outline" size="lg" className="rounded-full border-border/60 bg-background/70">
                  Return to pre-market
                </Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="px-5 pb-16 sm:px-8">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
            <Card className="border-border/40 bg-background/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                  <Layers className="h-4 w-4 text-primary" />
                  Utility tiers
                </CardTitle>
              </CardHeader>
              <CardContent className="grid gap-4 sm:grid-cols-3">
                {utilityTiers.map((tier) => (
                  <div
                    key={tier.title}
                    className={`rounded-3xl border border-border/50 bg-gradient-to-br ${tier.accent} p-[1px] shadow-card`}
                  >
                    <div className="flex h-full flex-col gap-3 rounded-[calc(theme(borderRadius.3xl)-1.5px)] bg-background/95 p-6 backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <h3 className="text-base font-semibold text-foreground">{tier.title}</h3>
                        <BadgeCheck className="h-4 w-4 text-primary" />
                      </div>
                      <p className="text-sm text-muted-foreground">{tier.description}</p>
                      <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1 text-xs text-primary">
                        <Gem className="h-3.5 w-3.5" />
                        {tier.perk}
                      </span>
                    </div>
                  </div>
                ))}
              </CardContent>
            </Card>

            <Card className="border-border/40 bg-background/85 backdrop-blur-xl">
              <CardHeader>
                <CardTitle className="flex items-center gap-2 text-lg font-semibold text-muted-foreground">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Mint checklist
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4 text-sm text-muted-foreground">
                <p>
                  Secure, audited minting flows ensure every edition is verifiable. Tailor metadata, royalties, and whitelist access in a guided process.
                </p>
                <div className="space-y-3">
                  {mintSteps.map((step, index) => (
                    <motion.div
                      key={step.title}
                      initial={{ opacity: 0, x: -12 }}
                      whileInView={{ opacity: 1, x: 0 }}
                      viewport={{ once: true, amount: 0.4 }}
                      transition={{ delay: index * 0.12, duration: 0.35, ease: "easeOut" }}
                      className="flex items-start gap-3"
                    >
                      <span className="mt-0.5 flex h-9 w-9 items-center justify-center rounded-full border border-border/60 bg-background/70 text-xs font-semibold text-primary">
                        {index + 1}
                      </span>
                      <div>
                        <h3 className="text-sm font-semibold text-foreground">{step.title}</h3>
                        <p>{step.description}</p>
                      </div>
                    </motion.div>
                  ))}
                </div>
              </CardContent>
            </Card>
          </div>
        </section>

        <section className="px-5 pb-20 sm:px-8">
          <div className="mx-auto flex max-w-5xl flex-col gap-8 rounded-3xl border border-border/40 bg-background/80 p-8 shadow-card backdrop-blur-xl sm:p-12">
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <h2 className="text-2xl font-semibold text-foreground sm:text-3xl">
                Reward your holders forever
              </h2>
              <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-4 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <Flame className="h-4 w-4 text-primary" />
                Dynamic utility
              </span>
            </div>

            <div className="grid gap-6 md:grid-cols-2">
              <div className="rounded-2xl border border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
                <h3 className="text-lg font-semibold text-foreground">Holder vault</h3>
                <p className="mt-2">
                  Route a share of secondary sales into a vault that unlocks seasonal bonuses, merch, and real-world experiences for your top supporters.
                </p>
              </div>
              <div className="rounded-2xl border border-border/60 bg-background/70 p-6 text-sm text-muted-foreground">
                <h3 className="text-lg font-semibold text-foreground">Composable rewards</h3>
                <p className="mt-2">
                  Layer in quests, off-chain perks, and evolving metadata that keeps collectors engaged long after mint day.
                </p>
              </div>
            </div>

            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex flex-col gap-2 text-sm text-muted-foreground">
                <span className="flex items-center gap-2">
                  <Wallet className="h-4 w-4 text-primary" />
                  Auto-withdraw royalties
                </span>
                <span className="flex items-center gap-2">
                  <BadgeCheck className="h-4 w-4 text-primary" />
                  Verified creator badge
                </span>
              </div>
              <div className="flex flex-col gap-3 sm:flex-row">
                <Link to="/marketplace">
                  <Button variant="hero" className="rounded-full px-6">
                    List collection
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </Button>
                </Link>
                <Link to="/auction">
                  <Button variant="ghost" className="rounded-full border border-border/60 bg-background/70">
                    Schedule auction
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

export default MemeNFTPlace;
