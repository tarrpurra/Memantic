import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Trophy,
  ShieldCheck,
  Wand2,
  Flame,
  Sparkles,
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Lightbulb
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import PageShell from "../components/layout/PageShell";
import { useAuth } from "../contexts/AuthContext";
import backendService from "../services/backendService";


const ACTION_CARDS = [
  {
    title: "Create",
    description:
      "Compose with AI prompts, remix templates, and spark meme magic.",
    icon: Wand2,
    href: "/myplace",
    accent: "from-purple-500/60 to-cyan-400/50",
  },
  {
    title: "Compete",
    description:
      "Join weekly brackets, earn votes, and climb the on-chain leaderboard.",
    icon: Trophy,
    href: "/pre-marketplace",
    accent: "from-cyan-400/50 to-sky-400/40",
  },
  {
    title: "Own",
    description:
      "Mint as NFTs, stake ICP, and list in the marketplace you control.",
    icon: ShieldCheck,
    href: "/pre-marketplace",
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

const formatDisplayName = (name, principal) => {
  const value = (typeof name === 'string' ? name.trim() : '') || principal;
  if (!value) return "Creator";
  if (value.length <= 12) return value;
  return `${value.slice(0, 5)}…${value.slice(-3)}`;
};

const Landing = () => {
  const navigate = useNavigate();
  const { isAuthenticated, principal, username } = useAuth();

  const [globalStats, setGlobalStats] = useState({ memesCreated: 12 });
  const [globalLoading, setGlobalLoading] = useState(true);
  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);

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
        console.warn(
          "Failed to fetch total memes, falling back to placeholder",
          error
        );
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

    const fetchFeedback = async () => {
      try {
        setFeedbackLoading(true);
        await backendService.ensureReady();
        const feedbackData = await backendService.getApprovedFeedback();
        if (!isMounted) return;
        setFeedback(feedbackData || []);
      } catch (error) {
        console.warn("Failed to fetch feedback:", error);
        if (isMounted) {
          setFeedback([]);
        }
      } finally {
        if (isMounted) {
          setFeedbackLoading(false);
        }
      }
    };

    fetchFeedback();

    return () => {
      isMounted = false;
    };
  }, []);


  const heroName = formatDisplayName(username, principal);

  return (
    <PageShell mainClassName="gap-0 px-0 pb-0 pt-0">
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
              Mementic is your decentralized AI meme lab on the Internet
              Computer. Generate, compete, and collect culture in a few taps—no
              gatekeepers, just on-chain virality.
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
                onClick={() => navigate("/myplace")}
              >
                Create
              </Button>
              <Button
                variant="ghost"
                size="lg"
                className="rounded-full border border-border/60 bg-background/60 px-8"
                onClick={() => navigate("/pre-marketplace")}
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
            <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
              Memes Created
            </h2>
            <motion.div
              initial={{ opacity: 0, scale: 0.9 }}
              whileInView={{ opacity: 1, scale: 1 }}
              viewport={{ once: true, amount: 0.3 }}
              className="mt-6 text-6xl font-semibold text-primary drop-shadow-sm sm:text-7xl"
            >
              {globalLoading ? "…" : formatNumber(globalStats.memesCreated)}
            </motion.div>
            <p className="mt-4 max-w-2xl text-base text-muted-foreground">
              Every meme minted here is verifiable on-chain. Track community
              growth, preview upcoming drops, and prime your submission in the
              Pre Meme Marketplace.
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
                  <div
                    className={`relative h-full rounded-[calc(theme(borderRadius.3xl)-1px)] bg-gradient-to-br ${card.accent} p-0.5 transition-colors`}
                  >
                    <div className="relative flex h-full flex-col gap-6 rounded-[calc(theme(borderRadius.3xl)-1.5px)] bg-background/90 p-6 backdrop-blur-xl">
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          <span className="flex h-12 w-12 items-center justify-center rounded-2xl bg-gradient-to-br from-purple-500/70 to-cyan-400/60 text-white shadow-glow">
                            <Icon className="h-5 w-5" />
                          </span>
                          <span className="text-xl font-semibold">
                            {card.title}
                          </span>
                        </div>
                      </div>
                      <p className="text-sm text-muted-foreground">
                        {card.description}
                      </p>
                    </div>
                  </div>
                </motion.button>
              );
            })}
          </div>
        </section>

        {/* Feedback Section */}
        <section className="section-wrapper relative">
          <div className="mx-auto max-w-6xl">
            <div className="text-center mb-12">
              <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/70 px-3 py-1 text-xs font-semibold uppercase tracking-widest text-muted-foreground">
                <MessageSquare className="h-3.5 w-3.5 text-primary" />
                Community Voice
              </span>
              <h2 className="mt-4 text-3xl font-semibold sm:text-4xl">
                What Users Are Saying
              </h2>
              <p className="mt-4 max-w-2xl mx-auto text-base text-muted-foreground">
                Real feedback from our community members about their Mementic experience
              </p>
            </div>

            {feedbackLoading ? (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {[...Array(6)].map((_, i) => (
                  <Card key={i} className="animate-pulse">
                    <CardContent className="p-6">
                      <div className="h-4 bg-muted rounded mb-3"></div>
                      <div className="h-3 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded mb-2"></div>
                      <div className="h-3 bg-muted rounded w-2/3"></div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : feedback.length === 0 ? (
              <Card className="p-12 text-center">
                <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                <h3 className="text-lg font-semibold mb-2">No Feedback Yet</h3>
                <p className="text-muted-foreground mb-6">
                  Be the first to share your thoughts about Mementic!
                </p>
                <Button
                  variant="outline"
                  onClick={() => navigate("/feedback")}
                  className="mx-auto"
                >
                  Share Your Feedback
                </Button>
              </Card>
            ) : (
              <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {feedback.map((item) => (
                  <motion.div
                    key={item.id}
                    initial={{ opacity: 0, y: 20 }}
                    whileInView={{ opacity: 1, y: 0 }}
                    viewport={{ once: true, amount: 0.3 }}
                    transition={{ duration: 0.5 }}
                  >
                    <Card className="h-full hover:shadow-lg transition-shadow">
                      <CardContent className="p-6">
                        {/* Header with name and return indicator */}
                        <div className="flex items-center justify-between mb-4">
                          <div className="flex items-center gap-2">
                            <div className="h-8 w-8 rounded-full bg-primary/10 flex items-center justify-center">
                              <span className="text-sm font-semibold text-primary">
                                {item.name.charAt(0).toUpperCase()}
                              </span>
                            </div>
                            <span className="font-medium">{item.name}</span>
                          </div>
                          {item.will_return ? (
                            <div className="flex items-center gap-1 text-green-600">
                              <ThumbsUp className="h-4 w-4" />
                              <span className="text-xs font-medium">Will return</span>
                            </div>
                          ) : (
                            <div className="flex items-center gap-1 text-orange-600">
                              <ThumbsDown className="h-4 w-4" />
                              <span className="text-xs font-medium">Maybe not</span>
                            </div>
                          )}
                        </div>

                        {/* Feedback content */}
                        <div className="space-y-3">
                          {/* What they like */}
                          {item.likes && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Star className="h-4 w-4 text-green-500" />
                                <span className="text-sm font-medium text-green-600">Likes</span>
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                {item.likes}
                              </p>
                            </div>
                          )}

                          {/* What they don't like */}
                          {item.dislikes && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <ThumbsDown className="h-4 w-4 text-orange-500" />
                                <span className="text-sm font-medium text-orange-600">Could improve</span>
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                {item.dislikes}
                              </p>
                            </div>
                          )}

                          {/* Suggestions */}
                          {item.suggestions && (
                            <div>
                              <div className="flex items-center gap-2 mb-1">
                                <Lightbulb className="h-4 w-4 text-blue-500" />
                                <span className="text-sm font-medium text-blue-600">Suggestions</span>
                              </div>
                              <p className="text-sm text-muted-foreground pl-6">
                                {item.suggestions}
                              </p>
                            </div>
                          )}
                        </div>

                        {/* Timestamp */}
                        <div className="mt-4 pt-3 border-t border-border/50">
                          <p className="text-xs text-muted-foreground">
                            {new Date(Number(item.timestamp) / 1_000_000).toLocaleDateString()}
                          </p>
                        </div>
                      </CardContent>
                    </Card>
                  </motion.div>
                ))}
              </div>
            )}

            {/* Show all feedback button */}
            {feedback.length > 0 && (
              <div className="text-center mt-8">
                <Button
                  variant="outline"
                  onClick={() => navigate("/feedback")}
                  className="gap-2"
                >
                  <MessageSquare className="h-4 w-4" />
                  {feedback.length > 6 ? "View All Feedback" : "Share Your Feedback"}
                </Button>
              </div>
            )}
          </div>
        </section>

        <footer className="relative z-10 border-t border-border/40 bg-gradient-to-br from-background to-background/80">
          <div className="mx-auto flex max-w-6xl flex-col gap-6 px-5 py-8 text-sm text-muted-foreground sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-black text-white">
                <span className="text-xs font-semibold">ICP</span>
              </div>
              <span>Built on Internet Computer</span>
            </div>
            <div className="flex flex-wrap items-center gap-4">
              <a className="hover:text-foreground" href="/about">
                About
              </a>
              <span className="text-border">|</span>
              <a className="hover:text-foreground" href="/terms">
                Terms
              </a>
              <span className="text-border">|</span>
              <a className="hover:text-foreground" href="/privacy">
                Privacy
              </a>
              <span className="text-border">|</span>
              <a className="hover:text-foreground" href="/contact">
                Contact
              </a>
            </div>
          </div>
        </footer>
      </PageShell>
  );
};

export default Landing;

