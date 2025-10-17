import { useMemo } from "react";
import { Button } from "../ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../ui/Card";
import { MemeCard } from "../MemeCard";
import { Crown, Sparkles, TrendingUp, Coins } from "lucide-react";
import { PAGE_SIZE, formatNumber, ensureArray, safeBigIntToNumber } from "../../utils/marketplaceUtils";
import SkeletonCard from "./SkeletonCard";

const MarketplaceFeed = ({
  memes,
  filteredMemes,
  loadingList,
  errorMsg,
  searchQuery,
  sort,
  setSort,
  setPage,
  selectedCreator,
  creatorStats,
  total,
  canLoadMore,
  onVote,
  onVoteSuccess,
  isAuthenticated,
  currentUserPrincipal,
  onOpenPreview,
  setSelectedCreator,
  onClearFilters,
  isClearing = false,
}) => {
  // Live metrics - recalculate when memes change
  const totalVotes = useMemo(
    () =>
      ensureArray(memes).reduce(
        (acc, meme) => acc + safeBigIntToNumber(meme?.votes || 0),
        0
      ),
    [memes]
  );

  const totalViews = useMemo(
    () =>
      ensureArray(memes).reduce(
        (acc, meme) => acc + safeBigIntToNumber(meme?.views || 0),
        0
      ),
    [memes]
  );

  const listedCount = useMemo(
    () =>
      ensureArray(memes).filter((meme) => {
        const sale = meme?.sale_metadata ?? meme?.market_data;
        return sale?.is_listed;
      }).length,
    [memes]
  );

  const uniqueCreators = useMemo(() => {
    const creators = new Set();
    ensureArray(memes).forEach((meme) => {
      if (meme?.creator) creators.add(meme.creator);
    });
    return creators.size;
  }, [memes]);

  const sortOptions = useMemo(
    () => [
      {
        value: "trending",
        label: "Trending",
        icon: TrendingUp,
        meta: `${formatNumber(totalVotes)} votes`,
      },
      {
        value: "newest",
        label: "Newest",
        icon: Sparkles,
        meta: `${formatNumber(ensureArray(memes).length)} drops`,
      },
      {
        value: "top",
        label: "Top Voted",
        icon: Crown,
        meta: `${formatNumber(totalViews)} views`,
      },
      {
        value: "listed",
        label: "Listed",
        icon: Coins,
        meta: `${formatNumber(listedCount)} live`,
      },
    ],
    [listedCount, memes, totalViews, totalVotes]
  );

  return (
    <Card className="border-border bg-card/80">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="flex items-center gap-2 text-lg font-semibold text-foreground">
              <TrendingUp className="h-5 w-5 text-primary" />
              Marketplace feed
            </CardTitle>
            <p className="text-xs text-muted-foreground mt-1">
              {searchQuery
                ? `Showing ${ensureArray(filteredMemes).length} result${ensureArray(filteredMemes).length === 1 ? "" : "s"} for "${searchQuery}".`
                : `${formatNumber(totalVotes)} votes • ${formatNumber(totalViews)} views • ${formatNumber(uniqueCreators)} creators`}
            </p>
          </div>
          <div className="flex items-center gap-3">
            <select
              value={sort}
              onChange={(e) => {
                setSort(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-100 focus:outline-none focus:border-primary/60"
            >
              {sortOptions.map((option) => (
                <option key={option.value} value={option.value} className="bg-slate-800 text-white">
                  {option.label}
                </option>
              ))}
            </select>
            <select
              value={selectedCreator}
              onChange={(e) => {
                setSelectedCreator?.(e.target.value);
                setPage(1);
              }}
              className="h-9 rounded-lg border border-white/10 bg-white/5 px-3 text-sm text-slate-100 focus:outline-none focus:border-primary/60"
            >
              <option value="all" className="bg-slate-800 text-white">All creators</option>
              {creatorStats.map((creator) => (
                <option key={creator.creator} value={creator.creator} className="bg-slate-800 text-white">
                  {creator.creator}
                </option>
              ))}
            </select>
          </div>
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        {errorMsg && (
          <div className="rounded-xl border border-destructive/30 bg-destructive/10 px-4 py-3 text-sm text-destructive">
            {errorMsg}
          </div>
        )}

        {isClearing && (
          <div className="rounded-xl border border-amber-400/40 bg-amber-500/10 px-6 py-8 text-center">
            <div className="flex items-center justify-center gap-3 mb-4">
              <div className="animate-pulse h-6 w-6 bg-amber-400 rounded-full"></div>
              <h3 className="text-lg font-semibold text-amber-200">Marketplace Reset</h3>
              <div className="animate-pulse h-6 w-6 bg-amber-400 rounded-full"></div>
            </div>
            <p className="text-sm text-amber-200 mb-4">
              The weekly cycle is complete! The marketplace is clearing to make way for fresh memes.
            </p>
            <div className="bg-amber-500/20 rounded-lg p-4 border border-amber-400/30 max-w-md mx-auto">
              <p className="text-xs text-amber-300">
                🚀 <strong>Get ready for the next round!</strong> New memes will appear soon for voting and trading.
              </p>
            </div>
          </div>
        )}

        {loadingList && ensureArray(memes).length === 0 ? (
          <div className="grid gap-6 sm:grid-cols-1 md:grid-cols-2 lg:grid-cols-2 xl:grid-cols-2">
            {[...Array(6).keys()].map((index) => (
              <SkeletonCard key={`feed-skeleton-${index}`} />
            ))}
          </div>
        ) : ensureArray(filteredMemes).length === 0 ? (
          <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-white/10 bg-white/5 py-16 text-center">
            <Sparkles className="h-10 w-10 text-slate-500" />
            <p className="mt-4 text-base font-semibold text-white">No memes found</p>
            <p className="mt-2 text-sm text-slate-400">
              {searchQuery
                ? "Try adjusting your filters."
                : isClearing
                  ? "Voting just ended. New drops will appear once the next week opens."
                  : "Be the first to publish a meme this week."}
            </p>
            {searchQuery && (
              <Button
                variant="outline"
                onClick={() => onClearFilters?.()}
                className="mt-4 rounded-xl border-white/20 text-white hover:bg-white/10"
              >
                Clear filters
              </Button>
            )}
          </div>
        ) : (
          <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
            {ensureArray(filteredMemes)
              .filter(Boolean)
              .map((meme) => (
                <MemeCard
                  key={meme.id}
                  meme={meme}
                  onVote={(id, votes) => onVote(id, votes, meme.creator)}
                  onVoteSuccess={() => undefined}
                  isAuthenticated={isAuthenticated}
                  currentUserPrincipal={currentUserPrincipal}
                  onOpenPreview={onOpenPreview}
                />
              ))}
          </div>
        )}

        {ensureArray(filteredMemes).length > 0 && canLoadMore && (
          <div className="text-center">
            <Button
              variant="outline"
              size="lg"
              onClick={() => setPage((prev) => prev + 1)}
              className="rounded-xl border-white/20 px-6 text-white hover:bg-white/10"
            >
              <Sparkles className="mr-2 h-4 w-4" />
              Load more memes
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarketplaceFeed;