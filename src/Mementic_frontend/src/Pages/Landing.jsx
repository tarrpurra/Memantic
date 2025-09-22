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
import { Sparkles, MessageSquare, Heart, RefreshCw, TrendingUp,Zap } from "lucide-react";
import backendService from "../services/backendService";

const Landing = () => {
  const navigate = useNavigate();
  const { principal, isLoading, isAuthenticated } = useAuth();

  const [feedback, setFeedback] = useState([]);
  const [feedbackStats, setFeedbackStats] = useState({ total: 0, approved: 0, returnRate: 0 });
  const [loadingFeedback, setLoadingFeedback] = useState(true);
  const [stats, setStats] = useState({
    users: 0,
    memes: 0,
    reviews: 0
  });
  const [loadingStats, setLoadingStats] = useState(true);

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      navigate("/myplace");
    }
  };

  // Fetch feedback data
  useEffect(() => {
    const fetchFeedback = async () => {
      try {
        setLoadingFeedback(true);
        console.log("Fetching real feedback data from backend...");

        const [feedbackData, statsData] = await Promise.all([
          backendService.getApprovedFeedback(50), // Get all approved feedback
          backendService.getFeedbackStats()
        ]);

        console.log("Feedback data received:", {
          feedbackCount: feedbackData?.length || 0,
          feedbackStats: statsData
        });

        setFeedback(feedbackData || []);
        setFeedbackStats({
          total: statsData?.[0] || 0,
          approved: statsData?.[1] || 0,
          returnRate: Math.round(statsData?.[2] || 0)
        });

        console.log("Feedback state updated successfully");
      } catch (error) {
        console.error("Failed to fetch real feedback from backend:", error);
        // Use fallback data
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
      const feedbackSubmitted = localStorage.getItem('feedbackSubmitted');
      if (feedbackSubmitted) {
        console.log("Feedback was submitted, refreshing landing page data...");
        // Clear the flag
        localStorage.removeItem('feedbackSubmitted');

        // Refresh feedback data
        const refreshData = async () => {
          try {
            setLoadingFeedback(true);
            setLoadingStats(true);

            const [feedbackData, statsData, totalUsers, totalMemes] = await Promise.all([
              backendService.getApprovedFeedback(50),
              backendService.getFeedbackStats(),
              backendService.getTotalUsers(),
              backendService.getTotalMemes()
            ]);

            setFeedback(feedbackData || []);
            setFeedbackStats({
              total: statsData?.[0] || 0,
              approved: statsData?.[1] || 0,
              returnRate: Math.round(statsData?.[2] || 0)
            });

            setStats({
              users: Number(totalUsers) || 0,
              memes: Number(totalMemes) || 0,
              reviews: statsData?.[1] || 0
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

    // Check immediately and also listen for storage changes
    checkForFeedbackUpdate();

    const handleStorageChange = (e) => {
      if (e.key === 'feedbackSubmitted') {
        checkForFeedbackUpdate();
      }
    };

    window.addEventListener('storage', handleStorageChange);
    return () => window.removeEventListener('storage', handleStorageChange);
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
          backendService.getFeedbackStats()
        ]);

        console.log("Backend data received:", {
          totalUsers: Number(totalUsers),
          totalMemes: Number(totalMemes),
          feedbackStats: feedbackStats
        });

        const newStats = {
          users: Number(totalUsers) || 0,
          memes: Number(totalMemes) || 0,
          reviews: feedbackStats?.[1] || 0,
          returnRate: Math.round(feedbackStats?.[2] || 0)
        };

        console.log("Setting stats to:", newStats);
        setStats(newStats);
      } catch (error) {
        console.error("Failed to fetch real stats from backend:", error);
        // Keep default values
      } finally {
        setLoadingStats(false);
      }
    };

    fetchStats();
  }, []);

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center min-h-screen">
        <div className="absolute inset-0 bg-[url('/back2.gif')] bg-cover bg-center"></div>
        <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>

        <div className="relative z-10 max-w-4xl mx-auto pl-6">
          <div className="flex items-center justify-center mb-8">
            <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-primary mr-4" />
            <h1 className="text-5xl md:text-7xl font-black bg-gradient-hero bg-clip-text text-transparent leading-tight">
              Mementic – The Future of Meme Culture
            </h1>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            A decentralized platform where AI meets memes. Create, share, and
            earn from viral content while the community decides what deserves to
            become a collectible NFT.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button
              variant="hero"
              size="xl"
              onClick={handleCreateClick}
              className="w-full sm:w-auto border-2 p-2 bg-gradient-hero hero-button"
              disabled={isLoading}
            >
              <Zap className="mr-2" />
              {isLoading
                ? "Loading..."
                : isAuthenticated
                ? "Create Meme"
                : "Login to Create Meme"}
            </Button>

            <Button
              variant="glow"
              size="xl"
              onClick={() => navigate("/marketplace")}
              className="w-full sm:w-auto border-2 p-2 border-pink-400 hero-button"
            >
              <TrendingUp className="mr-2" />
              Marketplace
            </Button>
          </div>
        </div>
      </section>
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Memes, owned.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Mementic turns viral jokes into ownable, tradable digital
              assets—built on ICP. Create with AI, battle for upvotes, and mint
              winners as NFTs. Welcome to the meme economy.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-card/60 p-4 border border-border">
                <div className="text-sm text-muted-foreground">Create</div>
                <div className="mt-1 font-semibold">AI Meme Studio</div>
              </div>
              <div className="rounded-xl bg-card/60 p-4 border border-border">
                <div className="text-sm text-muted-foreground">Compete</div>
                <div className="mt-1 font-semibold">Weekly Battles</div>
              </div>
              <div className="rounded-xl bg-card/60 p-4 border border-border">
                <div className="text-sm text-muted-foreground">Own</div>
                <div className="mt-1 font-semibold">NFT Minting & Auctions</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-6 border border-border">
            <h3 className="text-xl font-bold">Business Model</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• NFT auction fees (small %)</li>
              <li>• Sponsored meme contests (brands/DAOs)</li>
              <li>• Premium tools (boosts, analytics)</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <div className="flex items-center justify-between">
            <h2 className="text-3xl font-bold">Traction</h2>
            <button
              onClick={async () => {
                console.log("Manually refreshing real data...");
                try {
                  setLoadingStats(true);
                  const [totalUsers, totalMemes, feedbackStats] = await Promise.all([
                    backendService.getTotalUsers(),
                    backendService.getTotalMemes(),
                    backendService.getFeedbackStats()
                  ]);

                  console.log("Manual refresh - Backend data:", {
                    totalUsers: Number(totalUsers),
                    totalMemes: Number(totalMemes),
                    feedbackStats: feedbackStats
                  });

                  setStats({
                    users: Number(totalUsers) || 0,
                    memes: Number(totalMemes) || 0,
                    reviews: feedbackStats?.[1] || 0
                  });

                  console.log("Real data refreshed successfully");
                } catch (error) {
                  console.error("Manual refresh failed:", error);
                } finally {
                  setLoadingStats(false);
                }
              }}
              className="text-sm text-muted-foreground hover:text-primary transition-colors flex items-center gap-1"
              disabled={loadingStats}
            >
              {loadingStats ? (
                <RefreshCw className="w-4 h-4 animate-spin" />
              ) : (
                <RefreshCw className="w-4 h-4" />
              )}
              Refresh Data
            </button>
          </div>
          <div className="mt-6 grid gap-6 sm:grid-cols-2 lg:grid-cols-2">
            <div className="rounded-xl bg-card p-6 border border-border">
              <div className="text-3xl font-black">
                {loadingStats ? "..." : stats.memes}
              </div>
              <div className="text-sm text-muted-foreground mt-1">
                Memes created
              </div>
            </div>
            <div className="rounded-xl bg-gradient-to-br from-blue-50 to-blue-100 dark:from-blue-900/20 dark:to-blue-800/20 p-6 border border-blue-200">
              <div className="text-3xl font-black text-blue-700 dark:text-blue-300">
                {loadingStats ? "..." : stats.reviews}
              </div>
              <div className="text-sm text-blue-600 dark:text-blue-400 mt-1 font-medium">
                User reviews
              </div>
            </div>
          </div>

          {/* What Users Love About Mementic - Only show if real feedback exists */}
          {feedback.filter(item => item.likes && item.likes.trim() !== '').length > 0 && (
            <div className="mt-8">
              <div className="flex items-center gap-2 mb-6">
                <Heart className="w-5 h-5 text-red-500" />
                <h3 className="text-xl font-semibold">What Users Love About Mementic</h3>
                {loadingFeedback && (
                  <RefreshCw className="w-4 h-4 animate-spin text-muted-foreground" />
                )}
              </div>

              {loadingFeedback ? (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {Array.from({ length: 6 }).map((_, i) => (
                    <div key={i} className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 border border-green-200 animate-pulse">
                      <div className="h-4 bg-green-200 rounded mb-2"></div>
                      <div className="h-4 bg-green-200 rounded mb-2 w-3/4"></div>
                      <div className="h-3 bg-green-200 rounded w-1/3"></div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 lg:grid-cols-3">
                  {feedback
                    .filter(item => item.likes && item.likes.trim() !== '') // Only show feedback with positive comments
                    .map((item) => (
                    <div key={item.id} className="rounded-2xl bg-gradient-to-br from-green-50 to-green-100 dark:from-green-900/20 dark:to-green-800/20 p-6 border border-green-200">
                      <div className="flex items-center gap-2 mb-3">
                        <Heart className="w-4 h-4 text-red-500 fill-current" />
                        <span className="text-sm font-semibold text-green-700 dark:text-green-300">What they love</span>
                      </div>
                      <p className="text-base italic text-gray-700 dark:text-gray-300 mb-4 leading-relaxed">
                        "{item.likes}"
                      </p>
                      <div className="flex items-center justify-between text-sm">
                        <span className="font-medium text-gray-600 dark:text-gray-400">— {item.name}</span>
                        {item.will_return && (
                          <span className="text-green-600 font-medium flex items-center gap-1">
                            <span className="text-xs">Will return</span>
                            <span className="text-green-600">✅</span>
                          </span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* Complete User Feedback - Only show if real feedback exists */}
          {feedback.length > 0 && (
            <div className="mt-12">
              <div className="flex items-center gap-2 mb-6">
                <MessageSquare className="w-5 h-5 text-primary" />
                <h3 className="text-xl font-semibold">Complete User Feedback</h3>
              </div>

              <div className="grid gap-6 sm:grid-cols-1 lg:grid-cols-2">
                {feedback.slice(0, 4).map((item) => (
                  <div key={item.id} className="rounded-2xl bg-card p-6 border border-border">
                    <div className="space-y-3">
                      {item.likes && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Heart className="w-3 h-3 text-green-500" />
                            <span className="text-xs font-medium text-green-600">What they love</span>
                          </div>
                          <p className="text-sm italic text-muted-foreground ml-4">"{item.likes}"</p>
                        </div>
                      )}
                      {item.dislikes && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <TrendingUp className="w-3 h-3 text-orange-500" />
                            <span className="text-xs font-medium text-orange-600">Could improve</span>
                          </div>
                          <p className="text-sm italic text-muted-foreground ml-4">"{item.dislikes}"</p>
                        </div>
                      )}
                      {item.suggestions && (
                        <div>
                          <div className="flex items-center gap-1 mb-1">
                            <Sparkles className="w-3 h-3 text-blue-500" />
                            <span className="text-xs font-medium text-blue-600">Suggestions</span>
                          </div>
                          <p className="text-sm italic text-muted-foreground ml-4">"{item.suggestions}"</p>
                        </div>
                      )}
                    </div>
                    <div className="mt-4 pt-3 border-t border-border text-xs text-muted-foreground flex items-center justify-between">
                      <span>— {item.name}</span>
                      {item.will_return ? (
                        <span className="text-green-600 font-medium">Will return! ✅</span>
                      ) : (
                        <span className="text-red-600 font-medium">Won't return ❌</span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </section>
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold">Roadmap</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-card p-6 border border-border">
              <div className="text-sm uppercase tracking-wide text-muted-foreground">
                Short-term
              </div>
              <h3 className="mt-2 font-semibold">Ship & Smooth</h3>
              <ul className="mt-3 text-sm text-muted-foreground space-y-2">
                <li>• Auction & leaderboard polish</li>
                <li>• Faster image delivery</li>
                <li>• Anti-spam & rate limits</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-card p-6 border border-border">
              <div className="text-sm uppercase tracking-wide text-muted-foreground">
                Mid-term
              </div>
              <h3 className="mt-2 font-semibold">Grow Communities</h3>
              <ul className="mt-3 text-sm text-muted-foreground space-y-2">
                <li>• Hosted meme challenges (DAOs/brands)</li>
                <li>• Creator profiles & badges</li>
                <li>• Advanced AI tools (remix, presets)</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-card p-6 border border-border">
              <div className="text-sm uppercase tracking-wide text-muted-foreground">
                Long-term
              </div>
              <h3 className="mt-2 font-semibold">Meme Layer of Web3</h3>
              <ul className="mt-3 text-sm text-muted-foreground space-y-2">
                <li>• ICP dApp/marketplace integrations</li>
                <li>• Portable meme identity</li>
                <li>• Culture primitives for Web3</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* Roadmap Section */}
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm mb-4">
              <TrendingUp className="w-4 h-4 mr-2" />
              Roadmap
            </div>
            <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Our Journey Ahead
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🚀 Beta Launch</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  AI-powered meme generator is live. Users can authenticate with
                  Internet Identity and start creating memes today.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎭 Community Voting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Upvote your favorite memes. Top 3 winners in each round will
                  be immortalized as NFTs on the Internet Computer.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🌐 Future Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Meme staking, creator rewards, and integration with major NFT
                  marketplaces. Building the world’s first meme economy.
                </p>
              </CardContent>
            </Card>
          </div>
        </div>
      </section>
      {/* CTA Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Create Your First Viral Meme?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Be part of the decentralized meme revolution. Your creativity could
            be the next viral NFT.
          </p>
          <Button
            variant="hero"
            size="xl"
            onClick={handleCreateClick}
            className="bg-primary p-3 hero-button"
            disabled={isLoading}
          >
            {isLoading
              ? "Loading..."
              : isAuthenticated
              ? "Start Creating Now"
              : "Login to Start Creating"}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
