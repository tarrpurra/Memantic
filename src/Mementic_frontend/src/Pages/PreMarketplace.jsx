import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import Navigation from "../components/Navigation";
import WeeklyLeaderboard from "../components/marketplace/WeeklyLeaderboard";
import MarketplaceFeed from "../components/marketplace/MarketplaceFeed";
import PreviewModal from "../components/marketplace/PreviewModal";
import { useMarketplaceData } from "../hooks/useMarketplaceData";
import { useMarketplaceVoting } from "../hooks/useMarketplaceVoting";
import { getWeekEndIST, formatRemaining } from "../utils/marketplaceUtils";
import backendService from "../services/backendService";



const PreMarketplace = () => {
  const { principal, username, isLoading: authLoading, isAuthenticated } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();

  const sanitizedUsername = typeof username === "string" ? username.trim() : "";
  const hasProfileName = sanitizedUsername.length > 0;

  // UI State
  const [searchInput, setSearchInput] = useState("");
  const [sort, setSort] = useState("trending");
  const [selectedCreator, setSelectedCreator] = useState("all");
  const [page, setPage] = useState(1);

  // Week countdown
  const [now, setNow] = useState(new Date());
  const weekEnd = useMemo(() => getWeekEndIST(now), [now]);
  useEffect(() => {
    const t = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(t);
  }, []);
  const timeLeft = formatRemaining(weekEnd.getTime() - now.getTime());

  // Debounce search
  const [searchQuery, setSearchQuery] = useState("");
  useEffect(() => {
    const t = setTimeout(() => {
      setPage(1);
      setSearchQuery(searchInput.trim());
    }, 400);
    return () => clearTimeout(t);
  }, [searchInput]);

  // Custom hooks
  const {
    topMemes,
    memes,
    total,
    loadingTop,
    loadingList,
    errorMsg,
    setTopMemes,
    setMemes,
  } = useMarketplaceData(isAuthenticated, hasProfileName, page, sort, searchQuery);

  const {
    handleVote,
    checkMemeOwnership,
  } = useMarketplaceVoting(isAuthenticated, hasProfileName, memes, setMemes, setTopMemes);

  // Filter memes based on search query and creator
  const filteredMemes = useMemo(() => {
    let base = memes;
    if (selectedCreator !== "all") {
      base = base.filter((meme) => meme.creator === selectedCreator);
    }
    if (!searchQuery.trim()) return base;
    const query = searchQuery.toLowerCase();
    return base.filter(
      (meme) =>
        (meme.title?.toLowerCase() ?? "").includes(query) ||
        (meme.caption?.toLowerCase() ?? "").includes(query) ||
        (meme.prompt?.toLowerCase() ?? "").includes(query)
    );
  }, [memes, searchQuery, selectedCreator]);

  // Computed stats
  const totalVotes = useMemo(
    () => memes.reduce((acc, meme) => acc + (meme?.votes || 0), 0),
    [memes]
  );

  const totalViews = useMemo(
    () => memes.reduce((acc, meme) => acc + (meme?.views || 0), 0),
    [memes]
  );

  const listedCount = useMemo(
    () =>
      memes.filter((meme) => {
        const sale = meme?.sale_metadata ?? meme?.market_data;
        return sale?.is_listed;
      }).length,
    [memes]
  );

  const uniqueCreators = useMemo(() => {
    const creators = new Set();
    memes.forEach((meme) => {
      if (meme?.creator) creators.add(meme.creator);
    });
    return creators.size;
  }, [memes]);

  const creatorStats = useMemo(() => {
    const stats = new Map();
    memes.forEach((meme) => {
      const creator = meme?.creator || "Anonymous";
      if (!stats.has(creator)) {
        stats.set(creator, { creator, count: 0, votes: 0 });
      }
      const entry = stats.get(creator);
      entry.count += 1;
      entry.votes += meme?.votes || 0;
    });
    return Array.from(stats.values())
      .sort((a, b) =>
        b.votes !== a.votes ? b.votes - a.votes : b.count - a.count
      )
      .slice(0, 6);
  }, [memes]);

  const topTrending = useMemo(
    () => topMemes.filter(Boolean).slice(0, 3),
    [topMemes]
  );

  const shareOfTop = useMemo(() => {
    if (!totalVotes || topTrending.length === 0) return 0;
    const leadVotes = topTrending[0]?.votes || 0;
    return Math.round((leadVotes / totalVotes) * 100);
  }, [topTrending, totalVotes]);

  const sortOptions = useMemo(
    () => [
      {
        value: "trending",
        label: "Trending",
        icon: "TrendingUp",
        meta: `${totalVotes} votes`,
      },
      {
        value: "newest",
        label: "Newest",
        icon: "Sparkles",
        meta: `${memes.length} drops`,
      },
      {
        value: "top",
        label: "Top Voted",
        icon: "Crown",
        meta: `${totalViews} views`,
      },
      {
        value: "listed",
        label: "Listed",
        icon: "Coins",
        meta: `${listedCount} live`,
      },
    ],
    [listedCount, memes, totalViews, totalVotes]
  );

  const selectedCreatorLabel =
    selectedCreator === "all" ? "all creators" : selectedCreator;

  useEffect(() => {
    if (authLoading) {
      return;
    }

    if (!isAuthenticated) {
      toast({
        title: "Login required",
        description: "Sign in to access the marketplace.",
        variant: "destructive",
      });
      navigate("/login", {
        replace: true,
        state: { from: location.pathname },
      });
      return;
    }

    if (!hasProfileName) {
      toast({
        title: "Complete your profile",
        description: "Choose a username before exploring the marketplace.",
      });
      navigate("/portfolio", {
        replace: true,
        state: { from: location.pathname, requireUsername: true },
      });
    }
  }, [authLoading, hasProfileName, isAuthenticated, location.pathname, navigate, toast]);

  // Preview Modal State
  const [previewOpen, setPreviewOpen] = useState(false);
  const [selectedMeme, setSelectedMeme] = useState(null);

  // Open preview modal
  const openPreview = (meme) => {
    setSelectedMeme(meme);
    setPreviewOpen(true);
  };

  // Force finalize week for testing
  const handleForceFinalize = async () => {
    try {
      await backendService.forceFinalizeCurrentWeek();
      toast({
        title: "Week Finalized!",
        description: "Current week has been force-completed. Check winner notifications.",
      });
      // Refresh data
      window.location.reload();
    } catch (error) {
      toast({
        title: "Failed to finalize week",
        description: error.message,
        variant: "destructive",
      });
    }
  };

  const canLoadMore = memes.length < total;

  if (authLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center text-muted-foreground">
          Checking your session…
        </div>
      </div>
    );
  }

  if (!isAuthenticated || !hasProfileName) {
    return (
      <div className="min-h-screen bg-background">
        <Navigation />
        <div className="mx-auto max-w-4xl px-6 py-24 text-center text-muted-foreground">
          Redirecting to login…
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />

      <div className="w-screen flex flex-col gap-10 px-4 py-10 lg:px-6">
        <main className="w-full w- max-w-[200rem] space-y-6">
           <div className="flex justify-end mb-4">
             <button
               onClick={handleForceFinalize}
               className="px-4 py-2 bg-red-500 text-white rounded-lg hover:bg-red-600 text-sm"
             >
               Force Finalize Week (Testing)
             </button>
           </div>
           <WeeklyLeaderboard
             timeLeft={timeLeft}
             onPreview={openPreview}
           />

          <MarketplaceFeed
            memes={memes}
            filteredMemes={filteredMemes}
            loadingList={loadingList}
            errorMsg={errorMsg}
            searchQuery={searchQuery}
            sort={sort}
            setSort={setSort}
            setPage={setPage}
            selectedCreator={selectedCreator}
            creatorStats={creatorStats}
            total={total}
            canLoadMore={canLoadMore}
            onVote={(id, votes, owner) => handleVote(id, votes, owner, principal)}
            onVoteSuccess={() => undefined}
            isAuthenticated={isAuthenticated}
            currentUserPrincipal={principal}
            onOpenPreview={openPreview}
          />
        </main>

        <aside className="space-y-6">
        </aside>
      </div>

      <PreviewModal
        open={previewOpen}
        onClose={() => setPreviewOpen(false)}
        meme={selectedMeme}
        onLike={(id, votes, owner) => handleVote(id, votes, owner, principal)}
        isAuthenticated={isAuthenticated}
        isOwn={selectedMeme ? checkMemeOwnership(selectedMeme, principal) : false}
        hasProfileName={hasProfileName}
      />
    </div>
  );
};

export default PreMarketplace;


