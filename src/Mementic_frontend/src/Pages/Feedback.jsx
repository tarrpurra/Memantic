import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  MessageSquare,
  Star,
  ThumbsUp,
  ThumbsDown,
  Lightbulb,
  ArrowLeft,
  TrendingUp
} from "lucide-react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import PageShell from "../components/layout/PageShell";
import { FeedbackForm } from "../components/FeedbackForm";
import backendService from "../services/backendService";

const Feedback = () => {
  const navigate = useNavigate();
  const [feedback, setFeedback] = useState([]);
  const [feedbackLoading, setFeedbackLoading] = useState(true);
  const [stats, setStats] = useState({ total: 0, approved: 0, returnRate: 0 });

  useEffect(() => {
    let isMounted = true;

    const fetchFeedback = async () => {
      try {
        setFeedbackLoading(true);
        await backendService.ensureReady();

        // Fetch all feedback (including non-approved for admin view)
        const allFeedback = await backendService.getAllFeedback();
        if (!isMounted) return;

        // Filter to only approved feedback for public display
        const approvedFeedback = allFeedback.filter(item => item.is_approved) || [];
        setFeedback(approvedFeedback);

        // Get stats
        const feedbackStats = await backendService.getFeedbackStats();
        if (!isMounted) return;
        setStats({
          total: feedbackStats[0] || 0,
          approved: feedbackStats[1] || 0,
          returnRate: Math.round(feedbackStats[2] || 0)
        });

      } catch (error) {
        console.warn("Failed to fetch feedback:", error);
        if (isMounted) {
          setFeedback([]);
          setStats({ total: 0, approved: 0, returnRate: 0 });
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

  return (
    <PageShell>
      <div className="min-h-screen bg-background">
        {/* Header */}
        <div className="border-b border-border/40 bg-background/80 backdrop-blur-sm sticky top-0 z-40">
          <div className="max-w-6xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => navigate("/")}
                  className="gap-2"
                >
                  <ArrowLeft className="h-4 w-4" />
                  Back to Home
                </Button>
                <div>
                  <h1 className="text-2xl font-bold">Community Feedback</h1>
                  <p className="text-sm text-muted-foreground">
                    What our users are saying about Mementic
                  </p>
                </div>
              </div>

              {/* Stats */}
              <div className="hidden md:flex items-center gap-6 text-sm">
                <div className="text-center">
                  <div className="font-semibold text-lg">{stats.total}</div>
                  <div className="text-muted-foreground">Total Responses</div>
                </div>
                <div className="text-center">
                  <div className="font-semibold text-lg text-green-600">{stats.returnRate}%</div>
                  <div className="text-muted-foreground">Will Return</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-6xl mx-auto px-6 py-8">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
            {/* Feedback Display */}
            <div className="lg:col-span-2 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-xl font-semibold">
                  All Community Reviews ({feedback.length})
                </h2>
                <div className="flex items-center gap-2 text-sm text-muted-foreground">
                  <TrendingUp className="h-4 w-4" />
                  Most recent first
                </div>
              </div>

              {feedbackLoading ? (
                <div className="grid gap-6">
                  {[...Array(6)].map((_, i) => (
                    <Card key={i} className="animate-pulse">
                      <CardContent className="p-6">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="h-8 w-8 bg-muted rounded-full"></div>
                          <div className="h-4 bg-muted rounded w-24"></div>
                          <div className="h-4 bg-muted rounded w-16"></div>
                        </div>
                        <div className="space-y-2">
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded"></div>
                          <div className="h-3 bg-muted rounded w-3/4"></div>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              ) : feedback.length === 0 ? (
                <Card className="p-12 text-center">
                  <MessageSquare className="h-12 w-12 mx-auto mb-4 text-muted-foreground" />
                  <h3 className="text-lg font-semibold mb-2">No Reviews Yet</h3>
                  <p className="text-muted-foreground">
                    Be the first to share your thoughts about Mementic!
                  </p>
                </Card>
              ) : (
                <div className="grid gap-6">
                  {feedback.map((item, index) => (
                    <motion.div
                      key={item.id}
                      initial={{ opacity: 0, y: 20 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ delay: index * 0.1, duration: 0.5 }}
                    >
                      <Card className="hover:shadow-lg transition-shadow">
                        <CardContent className="p-6">
                          {/* Header with name and return indicator */}
                          <div className="flex items-center justify-between mb-4">
                            <div className="flex items-center gap-3">
                              <div className="h-10 w-10 rounded-full bg-primary/10 flex items-center justify-center">
                                <span className="text-sm font-semibold text-primary">
                                  {item.name.charAt(0).toUpperCase()}
                                </span>
                              </div>
                              <div>
                                <div className="font-medium">{item.name}</div>
                                <div className="text-xs text-muted-foreground">
                                  {new Date(Number(item.timestamp) / 1_000_000).toLocaleDateString()}
                                </div>
                              </div>
                            </div>
                            {item.will_return ? (
                              <div className="flex items-center gap-1 text-green-600 bg-green-50 dark:bg-green-900/20 px-3 py-1 rounded-full">
                                <ThumbsUp className="h-4 w-4" />
                                <span className="text-xs font-medium">Will return</span>
                              </div>
                            ) : (
                              <div className="flex items-center gap-1 text-orange-600 bg-orange-50 dark:bg-orange-900/20 px-3 py-1 rounded-full">
                                <ThumbsDown className="h-4 w-4" />
                                <span className="text-xs font-medium">Maybe not</span>
                              </div>
                            )}
                          </div>

                          {/* Feedback content */}
                          <div className="space-y-4">
                            {/* What they like */}
                            {item.likes && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Star className="h-4 w-4 text-green-500" />
                                  <span className="text-sm font-medium text-green-600">What they liked</span>
                                </div>
                                <p className="text-sm text-muted-foreground pl-6 border-l-2 border-green-200 dark:border-green-800">
                                  "{item.likes}"
                                </p>
                              </div>
                            )}

                            {/* What they don't like */}
                            {item.dislikes && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <ThumbsDown className="h-4 w-4 text-orange-500" />
                                  <span className="text-sm font-medium text-orange-600">Areas for improvement</span>
                                </div>
                                <p className="text-sm text-muted-foreground pl-6 border-l-2 border-orange-200 dark:border-orange-800">
                                  "{item.dislikes}"
                                </p>
                              </div>
                            )}

                            {/* Suggestions */}
                            {item.suggestions && (
                              <div>
                                <div className="flex items-center gap-2 mb-2">
                                  <Lightbulb className="h-4 w-4 text-blue-500" />
                                  <span className="text-sm font-medium text-blue-600">Suggestions</span>
                                </div>
                                <p className="text-sm text-muted-foreground pl-6 border-l-2 border-blue-200 dark:border-blue-800">
                                  "{item.suggestions}"
                                </p>
                              </div>
                            )}
                          </div>
                        </CardContent>
                      </Card>
                    </motion.div>
                  ))}
                </div>
              )}
            </div>

            {/* Feedback Form Sidebar */}
            <div className="lg:col-span-1">
              <div className="sticky top-24">
                <FeedbackForm />
              </div>
            </div>
          </div>
        </div>
      </div>
    </PageShell>
  );
};

export default Feedback;