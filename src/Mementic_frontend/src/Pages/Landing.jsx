import { useEffect, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import {
  Sparkles,
  MessageSquare,
  Heart,
  RefreshCw,
  TrendingUp,
  Zap,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import backendService from "../services/backendService";
import ThemeToggle from "../components/ThemeToggle";

const highlightTiles = [
  {
    label: "Create",
    title: "AI Meme Studio",
    description: "Craft viral-ready memes with guided prompts, remix tools, and instant previews.",
  },
  {
    label: "Compete",
    title: "Community Battles",
    description: "Join weekly showdowns where the community votes to mint top memes as collectibles.",
  },
  {
    label: "Own",
    title: "NFT Auctions",
    description: "Turn momentum into value with transparent, on-chain auctions and creator royalties.",
  },
];

const businessModelItems = [
  "NFT auction fees (community-first)",
  "Sponsored meme challenges",
  "Creator boosts & analytics",
];

const roadmapPhases = [
  {
    title: "🚀 Beta Launch",
    description:
      "AI-powered meme generator is live. Authenticate with Internet Identity and publish your first drop in minutes.",
  },
  {
    title: "🎭 Community Voting",
    description:
      "Upvote favourite memes and immortalize the winners as NFTs on the Internet Computer blockchain.",
  },
  {
    title: "🌐 Future Plans",
    description:
      "Meme staking, creator rewards, and cross-marketplace integrations power the world's first meme economy.",
  },
];

const roadmapFocus = [
  {
    stage: "Short-term",
    title: "Ship & Smooth",
    bullets: ["Auction & leaderboard polish", "Faster image delivery", "Anti-spam & rate limits"],
  },
  {
    stage: "Mid-term",
    title: "Grow Communities",
    bullets: [
      "Hosted meme challenges (DAOs/brands)",
      "Creator profiles & badges",
      "Advanced AI tools (remix, presets)",
    ],
  },
  {
    stage: "Long-term",
    title: "Meme Layer of Web3",
    bullets: [
      "ICP dApp/marketplace integrations",
      "Portable meme identity",
      "Culture primitives for Web3",
    ],
  },
];

const Landing = () => {
  const navigate = useNavigate();
  const { isLoading, isAuthenticated } = useAuth();

  const [feedback, setFeedback] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ total: 0, approved: 0, returnRate: 0 });
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    memes: 0,
    reviews: 0,
  });
  const [loadingStats, setLoadingStats] = useState(true);
  const [currentFeedbackIndex, setCurrentFeedbackIndex] = useState(0);

  const formatNumber = (value) => Intl.NumberFormat().format(Number(value || 0));

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      navigate("/myplace");
    }
  };

  const nextFeedback = () => {
    setCurrentFeedbackIndex((prev) => (prev < feedback.length - 1 ? prev + 1 : 0));
  };

  const prevFeedback = () => {
    setCurrentFeedbackIndex((prev) => (prev > 0 ? prev - 1 : feedback.length - 1));
  };

  const handleManualRefresh = async () => {
    console.log("Manually refreshing real data...");
    try {
      setLoadingStats(true);
      const [totalUsers, totalMemes, statsData] = await Promise.all([
        backendService.getTotalUsers(),
        backendService.getTotalMemes(),
        backendService.getFeedbackStats(),
      ]);

      setStats({
        users: Number(totalUsers) || 0,
        memes: Number(totalMemes) || 0,
        reviews: statsData?.[1] || 0,
      });

      setFeedbackStats((prev) => ({
        ...prev,
        returnRate: Math.round(statsData?.[2] || 0),
      }));

      console.log("Real data refreshed successfully");
    } catch (error) {
      console.error("Manual refresh failed:", error);
    } finally {
      setLoadingStats(false);
    }
  };

  // Fetch feedback data
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoadingFeedback(true);
        console.log("Fetching real feedback data from backend...");

        const [feedbackData, statsData] = await Promise.all([
          backendService.getAllFeedback(), // Get all feedback
          backendService.getFeedbackStats(),
        ]);

        console.log("Feedback data received:", {
          feedbackCount: feedbackData?.length || 0,
          feedbackStats: statsData,
        });

        setFeedback(feedbackData || []);
        setFeedbackStats({
          total: statsData?.[0] || 0,
          approved: statsData?.[1] || 0,
          returnRate: Math.round(statsData?.[2] || 0),
        });

        console.log("Feedback state updated successfully");
      } catch (error) {
        console.error("Failed to fetch real feedback from backend:", error);
        setFeedback([]);
        setFeedbackStats({ total: 0, approved: 0, returnRate: 0 });
      } finally {
        setLoadingFeedback(false);
      }
    };

    fetchFeedback();
  }, []);

  // Check for feedback submission trigger and refresh data
  useEffect(() => {
    const checkForFeedbackUpdate = () => {
      const feedbackSubmitted = localStorage.getItem("feedbackSubmitted");
      if (feedbackSubmitted) {
        console.log("Feedback was submitted, refreshing landing page data...");
        localStorage.removeItem("feedbackSubmitted");

        const refreshData = async () => {
          try {
            setLoadingFeedback(true);
            setLoadingStats(true);

            const [feedbackData, statsData, totalUsers, totalMemes] = await Promise.all([
              backendService.getAllFeedback(),
              backendService.getFeedbackStats(),
              backendService.getTotalUsers(),
              backendService.getTotalMemes(),
            ]);

            setFeedback(feedbackData || []);
            setFeedbackStats({
              total: statsData?.[0] || 0,
              approved: statsData?.[1] || 0,
              returnRate: Math.round(statsData?.[2] || 0),
            });
            setCurrentFeedbackIndex(0);

            setStats({
              users: Number(totalUsers) || 0,
              memes: Number(totalMemes) || 0,
              reviews: statsData?.[1] || 0,
            });

            console.log("Landing page data refreshed after feedback submission");
          } catch (error) {
            console.error("Failed to refresh data after feedback submission:", error);
          } finally {
            setLoadingFeedback(false);
            setLoadingStats(false);
          }
        };

        refreshData();
      }
    };

    checkForFeedbackUpdate();

    const handleStorageChange = (event) => {
      if (event.key === "feedbackSubmitted") {
        checkForFeedbackUpdate();
      }
    };

    window.addEventListener("storage", handleStorageChange);
    return () => window.removeEventListener("storage", handleStorageChange);
  }, []);

  // Fetch real statistics
  useEffect(() => {
    const fetchStats = async () => {
      try {
        setLoadingStats(true);
        console.log("Fetching real statistics from backend...");

        const [totalUsers, totalMemes, feedbackStats] = await Promise.all([
          backendService.getTotalUsers(),
          backendService.getTotalMemes(),
          backendService.getFeedbackStats(),
        ]);

        console.log("Backend data received:", {
          totalUsers: Number(totalUsers),
          totalMemes: Number(totalMemes),
          feedbackStats: feedbackStats,
        });

        const newStats = {
          users: Number(totalUsers) || 0,
          memes: Number(totalMemes) || 0,
          reviews: feedbackStats?.[1] || 0,
          returnRate: Math.round(feedbackStats?.[2] || 0),
        };

        console.log("Setting stats to:", newStats);
        setStats(newStats);
      } catch (error) {
        console.error("Failed to fetch real stats from backend:", error);
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  const positiveFeedback = feedback.filter((item) => item.likes && item.likes.trim() !== "");
  const currentFeedback = feedback[currentFeedbackIndex];

  const tractionHighlights = [
    {
      label: "Creators",
      value: loadingStats ? "…" : formatNumber(stats.users),
    },
    {
      label: "Memes minted",
      value: loadingStats ? "…" : formatNumber(stats.memes),
    },
    {
      label: "Reviews logged",
      value: loadingStats ? "…" : formatNumber(stats.reviews),
    },
    {
      label: "Return rate",
      value: loadingStats ? "…" : `${feedbackStats.returnRate || 0}%`,
    },
  ];

  return (
    <div className="min-h-screen bg-background text-foreground">
      <section className="relative overflow-hidden">
        <div className="absolute inset-0 bg-gradient-hero" />
        <div className="absolute inset-0 bg-gradient-glow opacity-80" />
        <div className="relative section-wrapper pb-24 sm:pb-28">
          <div className="mx-auto flex max-w-6xl flex-col gap-12">
            <header className="flex flex-col gap-4 rounded-3xl border border-border/50 bg-white/70 px-5 py-4 shadow-sm backdrop-blur dark:border-border/60 dark:bg-card/80 sm:flex-row sm:items-center sm:justify-between">
              <div className="flex items-center gap-3">
                <span className="inline-flex h-11 w-11 items-center justify-center rounded-2xl bg-primary/15 text-lg font-semibold text-primary shadow-sm">
                  MM
                </span>
                <div className="text-left">
                  <p className="text-xs font-semibold uppercase tracking-[0.3em] text-primary/80">Mementic</p>
                  <p className="text-sm text-muted-foreground">AI + community-powered meme collectibles</p>
                </div>
              </div>
              <div className="flex w-full items-center justify-end gap-3 sm:w-auto">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate(isAuthenticated ? "/myplace" : "/login")}
                  className="hidden rounded-full border border-border/60 bg-white/70 px-4 py-2 text-sm font-semibold text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary hover:text-primary dark:bg-card/70 sm:inline-flex"
                >
                  {isAuthenticated ? "My Space" : "Sign in"}
                </Button>
                <ThemeToggle />
              </div>
            </header>

            <div className="mx-auto flex max-w-3xl flex-col items-center text-center sm:max-w-4xl">
              <span className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-white/70 px-4 py-2 text-sm font-medium text-primary shadow-sm backdrop-blur dark:bg-card/70">
                <Sparkles className="h-4 w-4" />
                Built for mobile-first meme makers
              </span>
              <h1 className="mt-6 text-4xl font-black leading-tight tracking-tight text-balance sm:text-5xl md:text-6xl">
                Mementic – Where AI Creativity Meets Web3 Ownership
              </h1>
              <p className="mt-4 text-lg text-muted-foreground sm:text-xl">
                Design thumb-stopping memes, rally the community, and mint cultural moments into on-chain collectibles built on the Internet Computer.
              </p>
              <div className="mt-8 flex w-full flex-col items-center gap-4 sm:flex-row sm:justify-center">
                <Button
                  variant="hero"
                  size="xl"
                  onClick={handleCreateClick}
                  className="w-full rounded-full px-8 py-3 text-base font-semibold hero-button sm:w-auto"
                  disabled={isLoading}
                >
                  <Zap className="mr-2 h-5 w-5" />
                  {isLoading ? "Loading..." : isAuthenticated ? "Launch Studio" : "Login to Create"}
                </Button>
                <Button
                  variant="outline"
                  size="xl"
                  onClick={() => navigate("/marketplace")}
                  className="w-full rounded-full border-2 border-border/70 bg-white/70 px-8 py-3 text-base font-semibold text-foreground shadow-sm backdrop-blur transition-all hover:border-primary hover:text-primary dark:bg-card/70 sm:w-auto"
                >
                  <TrendingUp className="mr-2 h-5 w-5" />
                  Explore Marketplace
                </Button>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4 sm:grid-cols-4">
              {tractionHighlights.map((item) => (
                <div key={item.label} className="glass-surface rounded-2xl p-4 text-center">
                  <p className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">{item.label}</p>
                  <p className="mt-2 text-2xl font-bold text-foreground">{item.value}</p>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="section-wrapper">
        <div className="mx-auto flex max-w-6xl flex-col gap-12">
          <div className="grid gap-6 lg:grid-cols-[minmax(0,1.6fr)_minmax(0,1fr)]">
            <div className="rounded-3xl border border-border/50 bg-card/80 p-6 shadow-card backdrop-blur">
              <h2 className="text-3xl font-bold sm:text-4xl">Memes, owned.</h2>
              <p className="mt-4 text-base text-muted-foreground sm:text-lg">
                Mementic turns viral jokes into ownable, tradable digital assets—built on the Internet Computer. Create with AI, battle for upvotes, and mint winners as NFTs. Welcome to the meme economy.
              </p>
              <div className="mt-8 grid gap-4 sm:grid-cols-3">
                {highlightTiles.map((tile) => (
                  <div key={tile.title} className="rounded-2xl border border-border/60 bg-white/80 p-5 text-left shadow-sm dark:bg-card/90">
                    <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">{tile.label}</span>
                    <p className="mt-2 text-lg font-semibold text-foreground">{tile.title}</p>
                    <p className="mt-2 text-sm text-muted-foreground">{tile.description}</p>
                  </div>
                ))}
              </div>
            </div>
            <div className="glass-surface rounded-3xl p-6">
              <h3 className="text-lg font-semibold text-foreground">How Mementic grows</h3>
              <p className="mt-1 text-sm text-muted-foreground">A sustainable flywheel for creators and collectors.</p>
              <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
                {businessModelItems.map((item) => (
                  <li key={item} className="flex items-start gap-3">
                    <span className="mt-1 inline-flex h-2 w-2 rounded-full bg-primary" />
                    <span>{item}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </section>

      <section className="section-wrapper bg-muted/40 dark:bg-muted/10">
        <div className="mx-auto max-w-6xl space-y-10">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-3xl font-bold">Traction in motion</h2>
              <p className="mt-1 text-sm text-muted-foreground">
                Live metrics from early creators and collectors. Updated in real time.
              </p>
            </div>
            <button
              onClick={handleManualRefresh}
              className="inline-flex items-center gap-2 self-start rounded-full border border-border/60 bg-white/70 px-4 py-2 text-sm font-medium text-muted-foreground shadow-sm backdrop-blur transition-colors hover:border-primary hover:text-primary dark:bg-card/70"
              disabled={loadingStats}
            >
              <RefreshCw className={`h-4 w-4 ${loadingStats ? "animate-spin" : ""}`} />
              Refresh data
            </button>
          </div>

          <div className="grid gap-4 md:grid-cols-2">
            <div className="glass-surface rounded-3xl p-6 text-left">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">Memes created</p>
              <p className="mt-2 text-3xl font-black text-primary">
                {loadingStats ? "…" : formatNumber(stats.memes)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Generated by the community and ready for the next meme battle.
              </p>
            </div>
            <div className="glass-surface rounded-3xl p-6 text-left">
              <p className="text-sm font-semibold uppercase tracking-wider text-muted-foreground">User reviews</p>
              <p className="mt-2 text-3xl font-black text-secondary">
                {loadingStats ? "…" : formatNumber(stats.reviews)}
              </p>
              <p className="mt-2 text-sm text-muted-foreground">
                Real feedback shaping how Mementic evolves for mobile-first creators.
              </p>
            </div>
          </div>

          {positiveFeedback.length > 0 && (
            <div className="space-y-6">
              <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2 text-left">
                  <Heart className="h-5 w-5 text-rose-500" />
                  <h3 className="text-xl font-semibold">What creators love</h3>
                  {loadingFeedback && <RefreshCw className="h-4 w-4 animate-spin text-muted-foreground" />}
                </div>
                <p className="text-sm text-muted-foreground">
                  {feedbackStats.approved} approvals from {feedbackStats.total} total submissions
                </p>
              </div>

              {loadingFeedback ? (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, index) => (
                    <div key={index} className="glass-surface rounded-3xl p-6 animate-pulse">
                      <div className="mb-2 h-4 rounded-full bg-muted" />
                      <div className="mb-2 h-4 w-3/4 rounded-full bg-muted" />
                      <div className="h-3 w-1/3 rounded-full bg-muted" />
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                  {positiveFeedback.map((item) => (
                    <div key={item.id} className="glass-surface rounded-3xl p-6 text-left">
                      <div className="flex items-center gap-2 text-sm font-semibold text-green-600 dark:text-green-300">
                        <Heart className="h-4 w-4 fill-current" /> What they love
                      </div>
                      <p className="mt-3 text-base italic text-muted-foreground">“{item.likes}”</p>
                      <div className="mt-4 flex items-center justify-between text-sm text-muted-foreground">
                        <span>— {item.name}</span>
                        {item.will_return && <span className="font-medium text-green-600">Will return ✅</span>}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {feedback.length > 0 && currentFeedback && (
            <div className="space-y-6">
              <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                <div className="flex items-center gap-2">
                  <MessageSquare className="h-5 w-5 text-primary" />
                  <h3 className="text-xl font-semibold">Complete user feedback</h3>
                </div>
                <div className="flex items-center gap-2 self-start">
                  <button
                    onClick={prevFeedback}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/70 text-foreground transition-colors hover:border-primary dark:bg-card/80 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={feedback.length <= 1}
                  >
                    <ChevronLeft className="h-5 w-5" />
                  </button>
                  <span className="min-w-[60px] text-center text-sm text-muted-foreground">
                    {currentFeedbackIndex + 1} / {feedback.length}
                  </span>
                  <button
                    onClick={nextFeedback}
                    className="inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-white/70 text-foreground transition-colors hover:border-primary dark:bg-card/80 disabled:cursor-not-allowed disabled:opacity-50"
                    disabled={feedback.length <= 1}
                  >
                    <ChevronRight className="h-5 w-5" />
                  </button>
                </div>
              </div>

              <div className="mx-auto max-w-2xl">
                <div className="glass-surface rounded-3xl p-8">
                  <div className="space-y-5 text-left">
                    {currentFeedback.likes && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-green-600">
                          <Heart className="h-4 w-4" /> What they love
                        </div>
                        <p className="mt-2 text-base italic text-muted-foreground">“{currentFeedback.likes}”</p>
                      </div>
                    )}
                    {currentFeedback.dislikes && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-orange-500">
                          <TrendingUp className="h-4 w-4" /> Could improve
                        </div>
                        <p className="mt-2 text-base italic text-muted-foreground">“{currentFeedback.dislikes}”</p>
                      </div>
                    )}
                    {currentFeedback.suggestions && (
                      <div>
                        <div className="flex items-center gap-2 text-sm font-semibold text-blue-500">
                          <Sparkles className="h-4 w-4" /> Suggestions
                        </div>
                        <p className="mt-2 text-base italic text-muted-foreground">“{currentFeedback.suggestions}”</p>
                      </div>
                    )}
                  </div>
                  <div className="mt-6 flex items-center justify-between border-t border-border pt-4 text-sm text-muted-foreground">
                    <span className="font-medium">— {currentFeedback.name}</span>
                    {currentFeedback.will_return ? (
                      <span className="font-medium text-green-600">Will return ✅</span>
                    ) : (
                      <span className="font-medium text-red-500">Won't return ❌</span>
                    )}
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </section>

      <section className="section-wrapper">
        <div className="mx-auto max-w-6xl space-y-12">
          <div className="text-center">
            <div className="mx-auto inline-flex items-center gap-2 rounded-full border border-secondary/40 bg-secondary/10 px-4 py-2 text-sm font-semibold text-secondary">
              <TrendingUp className="h-4 w-4" /> Roadmap
            </div>
            <h2 className="mt-6 text-3xl font-bold sm:text-4xl">Our journey ahead</h2>
            <p className="mt-3 text-base text-muted-foreground sm:text-lg">
              Focused milestones to make Mementic the most delightful meme studio on mobile and beyond.
            </p>
          </div>

          <div className="grid gap-6 md:grid-cols-3">
            {roadmapPhases.map((phase) => (
              <Card key={phase.title} className="glass-surface rounded-3xl border-none">
                <CardHeader className="space-y-3 p-6">
                  <CardTitle className="text-2xl font-semibold text-foreground">{phase.title}</CardTitle>
                </CardHeader>
                <CardContent className="p-6 pt-0 text-sm text-muted-foreground">
                  {phase.description}
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            {roadmapFocus.map((item) => (
              <div key={item.title} className="glass-surface rounded-3xl p-6 text-left">
                <span className="text-xs font-semibold uppercase tracking-widest text-primary/70">{item.stage}</span>
                <h3 className="mt-2 text-lg font-semibold text-foreground">{item.title}</h3>
                <ul className="mt-4 space-y-2 text-sm text-muted-foreground">
                  {item.bullets.map((bullet) => (
                    <li key={bullet} className="flex items-start gap-2">
                      <span className="mt-1 inline-flex h-1.5 w-1.5 rounded-full bg-primary/70" />
                      <span>{bullet}</span>
                    </li>
                  ))}
                </ul>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="section-wrapper pb-24 text-center">
        <div className="mx-auto max-w-3xl space-y-6">
          <h2 className="text-3xl font-bold sm:text-4xl">Ready to create your first viral meme?</h2>
          <p className="text-lg text-muted-foreground">
            Be part of the decentralized meme revolution. Your creativity could be the next viral NFT.
          </p>
          <div className="flex flex-col items-center justify-center gap-4 sm:flex-row">
            <Button
              variant="hero"
              size="xl"
              onClick={handleCreateClick}
              className="w-full rounded-full px-8 py-3 text-base font-semibold hero-button sm:w-auto"
              disabled={isLoading}
            >
              {isLoading ? "Loading..." : isAuthenticated ? "Start creating" : "Login to start"}
            </Button>
            <Button
              variant="outline"
              size="xl"
              onClick={() => navigate("/marketplace")}
              className="w-full rounded-full border-2 border-border/70 bg-white/70 px-8 py-3 text-base font-semibold text-foreground shadow-sm backdrop-blur transition-colors hover:border-primary hover:text-primary dark:bg-card/70 sm:w-auto"
            >
              Explore live drops
            </Button>
          </div>
        </div>
      </section>
    </div>
  );
};

export default Landing;
