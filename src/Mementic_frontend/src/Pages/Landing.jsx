import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  Sparkles,
  Store,
  ShoppingBag,
  Gavel,
  BookOpen,
  UserCircle,
  ArrowUpRight,
  Trophy,
  ShieldCheck,
  Wand2,
  Wallet,
  BarChart3,
  Flame,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import ThemeToggle from "../components/ThemeToggle";
import { useAuth } from "../contexts/AuthContext";
import backendService from "../services/backendService";

const NAV_LINKS = [
  { label: "Pre Meme Marketplace", href: "#pre-marketplace", icon: Store, type: "anchor" },
  { label: "Meme NFT Marketplace", href: "#nft-marketplace", icon: ShoppingBag, type: "anchor" },
  { label: "Auction", href: "#auction", icon: Gavel, type: "anchor" },
  { label: "CTO Guide", href: "#cto-guide", icon: BookOpen, type: "anchor" },
  { label: "Profile / Portfolio", href: "/portfolio", icon: UserCircle, type: "route" },
];

const ACTION_CARDS = [
  {
    title: "Create",
    description: "Compose with AI prompts, remix templates, and spark meme magic.",
    icon: Wand2,
    href: "/create",
    accent: "from-purple-500/60 to-cyan-400/50",
  },
  {
    title: "Compete",
    description: "Join weekly brackets, earn votes, and climb the on-chain leaderboard.",
    icon: Trophy,
    href: "/compete",
    accent: "from-cyan-400/50 to-sky-400/40",
  },
  {
    title: "Own",
    description: "Mint as NFTs, stake ICP, and list in the marketplace you control.",
    icon: ShieldCheck,
    href: "/nft-marketplace",
    accent: "from-sky-400/40 to-purple-500/50",
  },
];

const formatNumber = (value) => {
  const numeric = Number(value || 0);
  return new Intl.NumberFormat("en-US", {
    notation: numeric >= 1000 ? "compact" : "standard",
    maximumFractionDigits: numeric >= 1000 ? 1 : 0,
  }).format(numeric);
};

const formatPrincipal = (principal) => {
  if (!principal) return "Creator";
  if (principal.length <= 10) return principal;
  return `${principal.slice(0, 5)}…${principal.slice(-3)}`;
};

const Landing = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, principal, remainingCalls } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState("hero");
  const [displayName, setDisplayName] = useState("Creator");
  const [walletBalance, setWalletBalance] = useState(null);
  const [globalStats, setGlobalStats] = useState({ memesCreated: 12 });
  const [globalLoading, setGlobalLoading] = useState(true);
  const [portfolioLoading, setPortfolioLoading] = useState(true);
  const [portfolio, setPortfolio] = useState({
    memeCount: 0,
    totalVotes: 0,
    wins: 0,
    losses: 0,
    nftCount: 0,
    totalStaked: 0,
    participation: "Inactive",
    netProfit: 0,
  });

  const navLinks = useMemo(() => NAV_LINKS, []);

  const closeMenu = () => setMenuOpen(false);

  const handleNav = (link) => {
    setActiveLink(link.href);

    if (link.type === "route") {
      navigate(link.href);
      closeMenu();
      return;
    }

    if (link.href.startsWith("#")) {
      const elementId = link.href.replace("#", "");
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    closeMenu();
  };

  useEffect(() => {
    const currentHash = location.hash?.replace("#", "");
    if (currentHash) {
      setActiveLink(`#${currentHash}`);
    }
  }, [location.hash]);

  useEffect(() => {
    const anchors = navLinks
      .filter((link) => link.type === "anchor" && link.href.startsWith("#"))
      .map((link) => document.getElementById(link.href.replace("#", "")))
      .filter(Boolean);

    if (!anchors.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveLink(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0.2 }
    );

    anchors.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [navLinks]);

  useEffect(() => {
    let isMounted = true;

    const fetchGlobalStats = async () => {
      try {
        setGlobalLoading(true);
        await backendService.ensureReady();
        const totalMemes = await backendService.getTotalMemes();

        if (!isMounted) return;
        setGlobalStats({ memesCreated: Number(totalMemes) || 0 });
      } catch (error) {
        console.warn("Failed to fetch total memes, falling back to placeholder", error);
        if (isMounted) {
          setGlobalStats((prev) => ({ ...prev }));
        }
      } finally {
        if (isMounted) {
          setGlobalLoading(false);
        }
      }
    };

    fetchGlobalStats();

    return () => {
      isMounted = false;
    };
  }, []);

  useEffect(() => {
    let isMounted = true;

    const safeBigIntToNumber = (value) => {
      if (typeof value === "bigint") {
        const max = Number.MAX_SAFE_INTEGER;
        const min = Number.MIN_SAFE_INTEGER;
        if (value > BigInt(max)) return max;
        if (value < BigInt(min)) return min;
        return Number(value);
      }
      return Number(value) || 0;
    };

    const fetchUserOverview = async () => {
      try {
        setPortfolioLoading(true);

        try {
          const response = await fetch("/api/user");
          if (response.ok) {
            const data = await response.json();
            if (isMounted && data) {
              setDisplayName((prev) => (prev === "Creator" ? data.username ?? prev : prev));
              if (typeof data.username === "string" && data.username.trim()) {
                setDisplayName(data.username.trim());
              }
              if (typeof data.walletBalance === "number") {
                setWalletBalance(data.walletBalance);
              }
              setPortfolio((prev) => ({
                ...prev,
                memeCount: typeof data.memeCount === "number" ? data.memeCount : prev.memeCount,
                totalVotes: typeof data.totalVotes === "number" ? data.totalVotes : prev.totalVotes,
                wins: typeof data.wins === "number" ? data.wins : prev.wins,
                losses: typeof data.losses === "number" ? data.losses : prev.losses,
                nftCount: typeof data.nfts === "number" ? data.nfts : prev.nftCount,
                totalStaked: typeof data.totalStaked === "number" ? data.totalStaked : prev.totalStaked,
                participation: typeof data.participationStatus === "string" ? data.participationStatus : prev.participation,
                netProfit: typeof data.netProfit === "number" ? data.netProfit : prev.netProfit,
              }));
            }
          }
        } catch (error) {
          console.warn("User API fallback engaged", error);
        }

        if (isAuthenticated) {
          await backendService.ensureReady();
          const memes = await backendService.getUserMemes();

          if (!isMounted) return;

          if (Array.isArray(memes)) {
            const summary = memes.reduce(
              (acc, meme) => {
                const votes = safeBigIntToNumber(meme?.votes?.upvotes ?? meme?.votes ?? 0);
                const downvotes = safeBigIntToNumber(meme?.votes?.downvotes ?? 0);
                const netVotes = votes - downvotes;
                const marketData = meme?.market_data || {};
                const earned = safeBigIntToNumber(marketData?.total_earned ?? 0) / 100000000;

                return {
                  memeCount: acc.memeCount + 1,
                  totalVotes: acc.totalVotes + votes,
                  wins: acc.wins + (netVotes >= 0 ? 1 : 0),
                  losses: acc.losses + (netVotes < 0 ? 1 : 0),
                  nftCount: acc.nftCount + (marketData?.is_listed ? 1 : 0),
                  totalStaked: acc.totalStaked + (marketData?.staked_amount ? safeBigIntToNumber(marketData.staked_amount) / 100000000 : 0),
                  netProfit: acc.netProfit + (Number.isFinite(earned) ? earned : 0),
                };
              },
              { memeCount: 0, totalVotes: 0, wins: 0, losses: 0, nftCount: 0, totalStaked: 0, netProfit: 0 }
            );

            setPortfolio((prev) => ({
              ...prev,
              ...summary,
              participation: summary.memeCount > 0 ? "Active" : prev.participation,
            }));
          }
        }
      } catch (error) {
        console.warn("Failed to build user overview", error);
      } finally {
        if (isMounted) {
          setPortfolioLoading(false);
        }
      }
    };

    fetchUserOverview();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, principal]);

  useEffect(() => {
    if (!principal) return;
    setDisplayName((prev) => (prev === "Creator" ? formatPrincipal(principal) : prev));
  }, [principal]);

  const heroName = displayName || formatPrincipal(principal);
  const walletDisplay =
    walletBalance != null
      ? `${walletBalance.toFixed(2)} ICP`
      : isAuthenticated
      ? "Syncing…"
      : "Connect";

  const remainingLabel = isAuthenticated ? `${remainingCalls ?? 0} calls left` : "Guest";

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-background text-foreground">
      <div className="pointer-events-none fixed inset-0 z-0 opacity-70">
        <div className="hero-aurora" />
        <div className="hero-grid" />
        <div className="hero-sparkles" />
      </div>

      <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex items-center gap-2 text-lg font-semibold">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 text-white shadow-glow">
                <Sparkles className="h-5 w-5" />
              </div>
              <span>Mementic</span>
            </div>
          </div>

          <nav className="hidden items-center gap-2 lg:flex">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeLink === link.href;
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleNav(link)}
                  className={`group relative inline-flex items-center gap-2 rounded-full px-4 py-2 text-sm font-medium transition-colors ${
                    isActive ? "text-primary" : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{link.label}</span>
                  <span
                    className={`pointer-events-none absolute inset-x-4 bottom-0 h-0.5 origin-center scale-x-0 rounded-full bg-gradient-to-r from-purple-500 via-purple-400 to-cyan-400 transition-transform duration-300 ${
                      isActive ? "scale-x-100" : "group-hover:scale-x-100"
                    }`}
                  />
                </button>
              );
            })}
          </nav>

          <div className="flex items-center gap-3">
            <div className="hidden sm:flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card backdrop-blur">
              <Wallet className="h-3.5 w-3.5 text-primary" />
              <span>{walletDisplay}</span>
              <span className="text-border">•</span>
              <span>{remainingLabel}</span>
            </div>
            <ThemeToggle />
            <button
              type="button"
              className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70"
              onClick={() => setMenuOpen((prev) => !prev)}
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
            <div className="mx-auto flex max-w-6xl flex-col gap-1 px-5 py-4 sm:px-8">
              {navLinks.map((link) => {
                const Icon = link.icon;
                const isActive = activeLink === link.href;
                return (
                  <button
                    key={link.label}
                    type="button"
                    onClick={() => handleNav(link)}
                    className={`flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm font-medium transition-colors ${
                      isActive ? "bg-primary/10 text-primary" : "text-muted-foreground hover:text-foreground"
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4" />
                      {link.label}
                    </span>
                    <ArrowUpRight className="h-4 w-4" />
                  </button>
                );
              })}
            </div>
          </div>
        )}
      </header>

      <main className="relative z-10">
        <section
          id="hero"
          className="relative flex min-h-[78vh] items-center justify-center px-5 py-24 sm:px-8"
        >
          <div className="absolute inset-0 -z-10 overflow-hidden">
            <motion.div
              aria-hidden
              className="absolute left-1/2 top-1/2 h-[420px] w-[420px] -translate-x-1/2 -translate-y-1/2 rounded-full bg-gradient-to-br from-purple-500/30 to-cyan-400/20 blur-3xl"
              animate={{ opacity: [0.6, 0.85, 0.6], scale: [1, 1.08, 1] }}
              transition={{ duration: 10, repeat: Infinity, ease: "easeInOut" }}
            />
          </div>

          <div className="mx-auto flex max-w-4xl flex-col items-center text-center">
            <motion.span
              initial={{ opacity: 0, y: -12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.1, duration: 0.6 }}
              className="mb-6 inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/80 px-4 py-2 text-sm font-medium text-muted-foreground shadow-card backdrop-blur"
            >
              <Sparkles className="h-4 w-4 text-primary" />
              <span>{heroName}</span>
            </motion.span>

            <motion.h1
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.2, duration: 0.7 }}
              className="text-balance text-4xl font-semibold tracking-tight text-foreground sm:text-5xl lg:text-6xl"
            >
              Ready to Create Your First Viral Meme?
            </motion.h1>

            <motion.p
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.3, duration: 0.7 }}
              className="mt-6 max-w-2xl text-lg text-muted-foreground"
            >
              Mementic is your decentralized AI meme lab on the Internet Computer. Generate, compete, and collect culture in a few taps—no gatekeepers, just on-chain virality.
            </motion.p>

            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: 0.4, duration: 0.7 }}
              className="mt-10 flex flex-col items-center gap-4 sm:flex-row"
            >
              <Button
                variant="hero"
                size="xl"
                className="hero-button px-10 py-6 text-base font-semibold shadow-glow"
                onClick={() => navigate("/create")}
              >
                Create
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full border border-border/60 bg-background/60 px-8"
                onClick={() => handleNav(navLinks.find((link) => link.href === "#pre-marketplace") ?? navLinks[0])}
              >
                Explore Flow
              </Button>
            </motion.div>
          </div>
        </section>

        <section id="pre-marketplace" className="section-wrapper relative">
          <div className="mx-auto flex max-w-6xl flex-col items-center text-center">
            <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
              <Flame className="h-3.5 w-3.5 text-primary" />
              Momentum
            </span>
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">Memes Created</h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="mt-6 text-6xl font-semibold text-primary drop-shadow-sm sm:text-7xl"
            >
              {globalLoading ? "…" : formatNumber(globalStats.memesCreated)}
            </motion.div>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              Every meme minted here is verifiable on-chain. Track community growth, preview upcoming drops, and prime your submission in the Pre Meme Marketplace.
            </p>
          </div>

          <div className="mx-auto mt-12 grid max-w-6xl gap-6 md:grid-cols-3">
            {ACTION_CARDS.map((card) => {
              const Icon = card.icon;
              return (
                <motion.button
                  key={card.title}
                  type="button"
                  onClick={() => navigate(card.href)}
                  whileHover={{ y: -8, scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="group relative overflow-hidden rounded-3xl border border-border/50 bg-background/70 p-[1px] text-left shadow-card"
                >
                  <div className={`relative h-full rounded-[calc(theme(borderRadius.3xl)-1px)] bg-gradient-to-br ${card.accent} p-0.5 transition-colors`}
                  >
                    <div className="relative flex h-full flex-col gap-6 rounded-[calc(theme(borderRadius.3xl)-1.5px)] bg-background/90 p-6 backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/70 to-cyan-400/60 text-white shadow-glow">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-xl font-semibold">{card.title}</span>
                        </div>
                        <ArrowUpRight className="h-5 w-5 text-muted-foreground transition-colors group-hover:text-foreground" />
                      </div>
                      <p className="text-sm text-muted-foreground">{card.description}</p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        <section id="nft-marketplace" className="section-wrapper pt-6">
          <div className="mx-auto grid max-w-6xl gap-6 lg:grid-cols-2">
            <motion.div
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6 }}
              className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/70 p-8 shadow-card backdrop-blur-xl"
            >
              <div className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <ShoppingBag className="h-4 w-4 text-primary" />
                Meme NFT Marketplace
              </div>
              <h3 className="text-2xl font-semibold">Mint and List Instantly</h3>
              <p className="mt-4 text-sm text-muted-foreground">
                Graduating from Pre Meme? Push to the NFT marketplace in a click. Configure royalties, set dynamic pricing, and showcase provenance with ICP-backed metadata.
              </p>
              <ul className="mt-6 space-y-3 text-sm text-muted-foreground">
                <li className="flex items-center gap-3">
                  <ShieldCheck className="h-4 w-4 text-primary" />
                  Immutable meme ownership and creator splits.
                </li>
                <li className="flex items-center gap-3">
                  <BarChart3 className="h-4 w-4 text-primary" />
                  Live analytics on bids, views, and staked support.
                </li>
                <li className="flex items-center gap-3">
                  <ArrowUpRight className="h-4 w-4 text-primary" />
                  Seamless bridge to auction drops for trending memes.
                </li>
              </ul>
            </motion.div>

            <motion.div
              id="auction"
              whileInView={{ opacity: 1, y: 0 }}
              initial={{ opacity: 0, y: 20 }}
              transition={{ duration: 0.6, delay: 0.1 }}
              className="relative overflow-hidden rounded-3xl border border-border/60 bg-background/70 p-8 shadow-card backdrop-blur-xl"
            >
              <div className="mb-6 flex items-center gap-3 text-sm font-semibold uppercase tracking-widest text-muted-foreground">
                <Gavel className="h-4 w-4 text-primary" />
                Live Auctions
              </div>
              <h3 className="text-2xl font-semibold">Battle for the Viral Crown</h3>
              <p className="mt-4 text-sm text-muted-foreground">
                Weekly auctions showcase the most upvoted creations. Enter with confidence, rally your community, and let transparent smart contracts reward the crowd favourites.
              </p>
              <div className="mt-6 grid gap-4 sm:grid-cols-2">
                <Card className="border-border/60 bg-background/80 backdrop-blur">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Current Pool</CardTitle>
                    <div className="text-2xl font-semibold text-foreground">
                      {portfolioLoading ? "—" : `${formatNumber(portfolio.totalVotes || globalStats.memesCreated)} votes`}
                    </div>
                  </CardHeader>
                </Card>
                <Card className="border-border/60 bg-background/80 backdrop-blur">
                  <CardHeader className="space-y-2">
                    <CardTitle className="text-sm font-medium text-muted-foreground">Win Ratio</CardTitle>
                    <div className="text-2xl font-semibold text-foreground">
                      {portfolioLoading || portfolio.memeCount === 0
                        ? "—"
                        : `${Math.round((portfolio.wins / portfolio.memeCount) * 100)}%`}
                    </div>
                  </CardHeader>
                </Card>
              </div>
            </motion.div>
          </div>
        </section>

        <section id="cto-guide" className="section-wrapper pt-6">
          <motion.div
            whileInView={{ opacity: 1, y: 0 }}
            initial={{ opacity: 0, y: 20 }}
            transition={{ duration: 0.6 }}
            className="mx-auto max-w-6xl overflow-hidden rounded-3xl border border-border/60 bg-background/70 p-8 shadow-card backdrop-blur-xl"
          >
            <div className="flex flex-col gap-8 lg:flex-row lg:items-center lg:justify-between">
              <div className="max-w-2xl space-y-4">
                <span className="inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                  <BookOpen className="h-3.5 w-3.5 text-primary" />
                  CTO Guide
                </span>
                <h3 className="text-2xl font-semibold">Integrate Memes into Your ICP Stack</h3>
                <p className="text-sm text-muted-foreground">
                  Explore architectural blueprints, canister contracts, and FastAPI hooks that power Mementic. From meme generation endpoints to NFT minting flows, the CTO guide accelerates your build.
                </p>
                <ul className="space-y-3 text-sm text-muted-foreground">
                  <li className="flex items-center gap-3">
                    <Wand2 className="h-4 w-4 text-primary" />
                    FastAPI `/generate_meme` recipes and prompt optimization tips.
                  </li>
                  <li className="flex items-center gap-3">
                    <Trophy className="h-4 w-4 text-primary" />
                    Canister voting mechanics for `/vote_meme` competitions.
                  </li>
                  <li className="flex items-center gap-3">
                    <ShieldCheck className="h-4 w-4 text-primary" />
                    NFT minting, listing, and royalty distribution best practices.
                  </li>
                </ul>
              </div>
              <div className="flex flex-col gap-4">
                <Button
                  variant="hero"
                  size="lg"
                  className="hero-button px-8 py-4 text-sm font-semibold"
                  onClick={() => navigate("/cto-guide")}
                >
                  Open Guide
                </Button>
                <Button
                  variant="ghost"
                  size="lg"
                  className="rounded-full border border-border/60 bg-background/70 px-8"
                  onClick={() => navigate("/api-docs")}
                >
                  View API Docs
                </Button>
              </div>
            </div>
          </motion.div>
        </section>

        <section id="portfolio" className="section-wrapper pt-6">
          <div className="mx-auto flex max-w-6xl flex-col gap-8">
            <div className="flex flex-col gap-3 text-center">
              <span className="mx-auto inline-flex items-center gap-2 rounded-full border border-border/60 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <UserCircle className="h-3.5 w-3.5 text-primary" />
                Browse / Upvote My Portfolio
              </span>
              <h2 className="text-3xl font-semibold sm:text-4xl">Your Meme Command Center</h2>
              <p className="mx-auto max-w-2xl text-sm text-muted-foreground">
                Review your creations, measure voting power, and monitor on-chain performance before sharing with the community.
              </p>
            </div>

            <div className="grid gap-6 md:grid-cols-3">
              <Card className="border-border/60 bg-background/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Sparkles className="h-5 w-5 text-primary" />
                    My Portfolio
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="text-4xl font-semibold text-foreground">
                    {portfolioLoading ? "—" : formatNumber(portfolio.memeCount)}
                    <span className="ml-2 text-base font-normal text-muted-foreground">memes</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <span>Total votes</span>
                    <span className="text-base font-semibold text-foreground">
                      {portfolioLoading ? "—" : formatNumber(portfolio.totalVotes)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <span>Win / Loss</span>
                    <span className="text-base font-semibold text-foreground">
                      {portfolioLoading
                        ? "—"
                        : `${formatNumber(portfolio.wins)} / ${formatNumber(portfolio.losses)}`}
                    </span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <Trophy className="h-5 w-5 text-primary" />
                    Voting Power
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <span>Memes minted as NFTs</span>
                    <span className="text-base font-semibold text-foreground">
                      {portfolioLoading ? "—" : formatNumber(portfolio.nftCount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <span>Total ICP staked</span>
                    <span className="text-base font-semibold text-foreground">
                      {portfolioLoading ? "—" : `${portfolio.totalStaked.toFixed(2)} ICP`}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <span>Participation</span>
                    <span className="text-base font-semibold text-foreground">{portfolio.participation}</span>
                  </div>
                </CardContent>
              </Card>

              <Card className="border-border/60 bg-background/70 backdrop-blur-xl">
                <CardHeader>
                  <CardTitle className="flex items-center gap-3 text-lg">
                    <UserCircle className="h-5 w-5 text-primary" />
                    Profile Summary
                  </CardTitle>
                </CardHeader>
                <CardContent className="space-y-4 text-sm text-muted-foreground">
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <span>Username</span>
                    <span className="text-base font-semibold text-foreground">{heroName}</span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <span>NFTs held</span>
                    <span className="text-base font-semibold text-foreground">
                      {portfolioLoading ? "—" : formatNumber(portfolio.nftCount)}
                    </span>
                  </div>
                  <div className="flex items-center justify-between rounded-2xl border border-border/60 bg-background/70 px-4 py-3">
                    <span>Net profit</span>
                    <span className="text-base font-semibold text-foreground">
                      {portfolioLoading ? "—" : `${portfolio.netProfit.toFixed(2)} ICP`}
                    </span>
                  </div>
                </CardContent>
              </Card>
            </div>

            <div className="flex flex-col items-center justify-between gap-4 rounded-3xl border border-border/60 bg-background/80 px-6 py-6 text-center shadow-card backdrop-blur-xl sm:flex-row sm:text-left">
              <div>
                <h3 className="text-lg font-semibold">Ready to showcase the full portfolio?</h3>
                <p className="text-sm text-muted-foreground">
                  Dive into vote histories, auction entries, and NFT analytics tailored to your meme empire.
                </p>
              </div>
              <Button
                variant="hero"
                size="lg"
                className="hero-button px-8 py-4 text-sm font-semibold"
                onClick={() => navigate("/portfolio")}
              >
                View Full Portfolio
              </Button>
            </div>
          </div>
        </section>
      </main>

      <footer className="relative z-10 border-t border-border/40 bg-gradient-to-br from-background to-background/80">
        <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="flex items-center gap-3">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
              <span className="text-xs font-semibold">ICP</span>
            </div>
            <span>Built on Internet Computer</span>
          </div>
          <div className="flex flex-wrap items-center gap-4">
            <a className="hover:text-foreground" href="/about">About</a>
            <span className="text-border">|</span>
            <a className="hover:text-foreground" href="/terms">Terms</a>
            <span className="text-border">|</span>
            <a className="hover:text-foreground" href="/privacy">Privacy</a>
            <span className="text-border">|</span>
            <a className="hover:text-foreground" href="/contact">Contact</a>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default Landing;
