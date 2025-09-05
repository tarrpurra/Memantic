import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  TrendingUp,
  Crown,
  Filter,
  Search,
  ArrowUp,
  Timer,
  User,
  Sparkles,
  LogIn,
  Home,
  Zap,
} from "../components/ui/Icon";
import { MemeCard } from "../components/MemeCard";
import { useNavigate } from "react-router-dom";
import { useAuth } from "../hooks/useAuth";

// Import actor from the correct pathckend";

// --- Small utilities ---
const PAGE_SIZE = 12;

function getWeekEndIST(now = new Date()) {
  const offsetIST = 330; // +05:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + offsetIST * 60000);

  const day = ist.getDay(); // 0=Sun ... 6=Sat
  const daysToSunday = (7 - day) % 7;
  const end = new Date(ist);
  end.setDate(ist.getDate() + daysToSunday);
  end.setHours(23, 59, 59, 999);

  const backUtc = end.getTime() - offsetIST * 60000;
  return new Date(backUtc - end.getTimezoneOffset() * 60000);
}

function formatRemaining(ms) {
  if (ms <= 0) return "0d 0h 0m";
  const d = Math.floor(ms / (24 * 3600e3));
  const h = Math.floor((ms % (24 * 3600e3)) / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  return `${d}d ${h}h ${m}m`;
}

const SkeletonCard = () => (
  <Card className="relative overflow-hidden">
    <CardContent className="p-6 animate-pulse">
      <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-muted" />
      <div className="h-5 w-3/4 mx-auto bg-muted rounded mb-2" />
      <div className="h-4 w-1/2 mx-auto bg-muted rounded mb-6" />
      <div className="h-9 w-28 mx-auto bg-muted rounded" />
    </CardContent>
  </Card>
);

const Marketplace = () => {
  const { principal, isLoading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();

  // UI State
  const [searchInput, setSearchInput] = useState("");
  const [searchQuery, setSearchQuery] = useState("");
  const [sort, setSort] = useState("trending");
  const [page, setPage] = useState(1);

  // Data State
  const [topMemes, setTopMemes] = useState([]);
  const [memes, setMemes] = useState([]);
  const [total, setTotal] = useState(0);

  // Loading/Error
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");

  // Week countdown
  const [now, setNow] = useState(new Date());
  const weekEnd = useMemo(() => getWeekEndIST(now), [now]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const timeLeft = formatRemaining(weekEnd.getTime() - now.getTime());

  // Debounce search
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Filter memes based on search query
  const filteredMemes = useMemo(() => {
    if (!searchQuery.trim()) return memes;
    const query = searchQuery.toLowerCase();
    return memes.filter(
      (meme) =>
        meme.title?.toLowerCase().includes(query) ||
        meme.prompt?.toLowerCase().includes(query)
    );
  }, [memes, searchQuery]);

  // Fetch Top 3
  useEffect(() => {
    let cancelled = false;
    (async () => {
      setLoadingTop(true);
      setErrorMsg("");
      try {
        const res = await Mementic_backend.get_leaderboard_top3();
        if (!cancelled) setTopMemes(res || []);
      } catch (e) {
        if (!cancelled) setErrorMsg("Failed to load top memes.");
      } finally {
        if (!cancelled) setLoadingTop(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  // Fetch paginated list
  async function fetchList({ reset = false } = {}) {
    setLoadingList(true);
    setErrorMsg("");
    try {
      const res = await Mementic_backend.list_memes(
        page,
        PAGE_SIZE,
        searchQuery,
        sort
      );
      setTotal(Number(res?.total || 0));
      setMemes((prev) =>
        page === 1 || reset
          ? res?.items || []
          : [...prev, ...(res?.items || [])]
      );
    } catch (e) {
      setErrorMsg("Failed to load memes.");
    } finally {
      setLoadingList(false);
    }
  }

  useEffect(() => {
    fetchList({ reset: page === 1 });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [page, searchQuery, sort]);

  // Vote
  const votingLock = useRef(false);
  const handleVote = async (memeId, currentVotes) => {
    if (!isAuthenticated) {
      alert("Please login to vote on memes!");
      navigate("/login");
      return;
    }
    if (votingLock.current) return;
    votingLock.current = true;

    // optimistic update
    setMemes((prev) =>
      prev.map((m) =>
        String(m.meme_id) === String(memeId)
          ? { ...m, votes: Number(m.votes || 0) + 1 }
          : m
      )
    );

    try {
      const res = await Mementic_backend.vote_meme(BigInt(memeId));
      if (!res?.ok) {
        setMemes((prev) =>
          prev.map((m) =>
            String(m.meme_id) === String(memeId)
              ? { ...m, votes: currentVotes }
              : m
          )
        );
        alert(res?.error || "Voting failed. You may have hit the limit.");
      } else if (typeof res.new_score === "number") {
        setMemes((prev) =>
          prev.map((m) =>
            String(m.meme_id) === String(memeId)
              ? { ...m, votes: res.new_score }
              : m
          )
        );
      }
    } catch {
      setMemes((prev) =>
        prev.map((m) =>
          String(m.meme_id) === String(memeId)
            ? { ...m, votes: currentVotes }
            : m
        )
      );
      alert("Network error while voting.");
    } finally {
      votingLock.current = false;
    }
  };

  const handleCreateMeme = () => {
    if (!isAuthenticated) navigate("/login");
    else navigate("/myplace");
  };

  const canLoadMore = memes.length < total;

  return (
    // ⬇️ Your JSX unchanged except now using `backend` directly
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Meme Marketplace
              </h1>
              <p className="text-muted-foreground">
                Discover and vote on viral content
              </p>
            </div>

            <div className="flex items-center gap-3">
              {/* Always show Home button */}
              <Button variant="ghost" onClick={() => navigate("/")}>
                <Home className="w-4 h-4 mr-2" />
                Home
              </Button>

              {authLoading ? (
                <div className="text-sm text-muted-foreground">Loading...</div>
              ) : isAuthenticated ? (
                <>
                  <Button
                    variant="outline"
                    onClick={() => navigate("/portfolio")}
                  >
                    <User className="w-4 h-4 mr-2" />
                    My Portfolio
                  </Button>
                  <Button variant="default" onClick={handleCreateMeme}>
                    <Zap className="w-4 h-4 mr-2" />
                    Create Meme
                  </Button>
                  <div className="text-sm text-muted-foreground hidden sm:block">
                    {principal?.slice(0, 8)}...
                  </div>
                </>
              ) : (
                <Button variant="default" onClick={() => navigate("/login")}>
                  <LogIn className="w-4 h-4 mr-2" />
                  Login to Vote
                </Button>
              )}
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Authentication Status Alert */}
        {!isAuthenticated && !authLoading && (
          <Card className="mb-6 border-yellow-500/20 bg-yellow-500/5">
            <CardContent className="p-4">
              <div className="flex items-center gap-3">
                <LogIn className="w-5 h-5 text-yellow-500" />
                <div>
                  <p className="text-sm font-medium">Want to participate?</p>
                  <p className="text-xs text-muted-foreground">
                    Login to vote on memes and create your own viral content
                  </p>
                </div>
                <Button size="sm" onClick={() => navigate("/login")}>
                  Login Now
                </Button>
              </div>
            </CardContent>
          </Card>
        )}

        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search memes..."
              value={searchInput}
              onChange={(e) => setSearchInput(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Top 3 Memes Section */}
        <Card className="mb-8 bg-gradient-glow border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Crown className="w-6 h-6 text-yellow-500" />
                Top 3 Memes of the Week
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="w-4 h-4" />
                <span>Ends in {timeLeft}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topMemes.map((meme) => (
                <Card key={meme.id} className="relative overflow-hidden">
                  {meme.rank === 1 && (
                    <div className="absolute top-2 left-2">
                      <Crown className="w-6 h-6 text-yellow-500" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center">
                      <div className="text-6xl mb-4">{meme.emoji}</div>
                      <h3 className="font-bold text-lg mb-2">{meme.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">
                        by {meme.creator}
                      </p>
                      <div className="flex items-center justify-center gap-2">
                        <Button
                          size="sm"
                          variant={isAuthenticated ? "outline" : "ghost"}
                          onClick={() => handleVote(meme.id)}
                          disabled={!isAuthenticated}
                          className={
                            !isAuthenticated
                              ? "opacity-50 cursor-not-allowed"
                              : ""
                          }
                        >
                          <ArrowUp className="w-4 h-4 mr-1" />
                          {meme.votes}
                          {!isAuthenticated && (
                            <span className="ml-1 text-xs">
                              (Login to vote)
                            </span>
                          )}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Memes Grid */}
        <div className="mb-6">
          <div className="flex items-center justify-between">
            <h2 className="text-2xl font-bold flex items-center gap-2">
              <TrendingUp className="w-6 h-6" />
              All Memes
            </h2>
            {searchQuery && (
              <p className="text-sm text-muted-foreground">
                Found {filteredMemes.length} meme
                {filteredMemes.length !== 1 ? "s" : ""}
              </p>
            )}
          </div>
        </div>

        {filteredMemes.length === 0 ? (
          <Card className="text-center py-12">
            <CardContent>
              <Search className="w-12 h-12 mx-auto mb-4 text-muted-foreground" />
              <h3 className="text-lg font-medium mb-2">No memes found</h3>
              <p className="text-muted-foreground mb-4">
                {searchQuery
                  ? `No results for "${searchQuery}"`
                  : "No memes available"}
              </p>
              {searchQuery && (
                <Button variant="outline" onClick={() => setSearchQuery("")}>
                  Clear Search
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
            {filteredMemes.map((meme) => (
              <MemeCard
                key={meme.id}
                meme={meme}
                onVote={handleVote}
                isAuthenticated={isAuthenticated}
              />
            ))}
          </div>
        )}

        {/* Load More */}
        {filteredMemes.length > 0 && (
          <div className="text-center mt-12">
            <Button variant="outline" size="lg">
              <Sparkles className="w-4 h-4 mr-2" />
              Load More Memes
            </Button>
          </div>
        )}

        {/* Create Your Own CTA */}
        <Card className="mt-12 bg-gradient-card border-primary/30">
          <CardContent className="text-center py-8">
            <Zap className="w-12 h-12 mx-auto mb-4 text-primary" />
            <h3 className="text-2xl font-bold mb-2">
              Ready to Create Your Own?
            </h3>
            <p className="text-muted-foreground mb-6">
              Join the community and start creating viral memes that earn votes
            </p>
            <Button size="lg" onClick={handleCreateMeme}>
              {isAuthenticated ? "Start Creating" : "Login to Create"}
            </Button>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default Marketplace;
