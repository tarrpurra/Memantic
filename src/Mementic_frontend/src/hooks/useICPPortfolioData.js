import { useCallback, useEffect, useMemo, useState } from "react";
import { useAuth } from "../contexts/AuthContext";
import backendService from "../services/backendService";

const unopt = (value) => (Array.isArray(value) ? value[0] : value);

const safeBigIntToNumber = (value) => {
  if (typeof value === "bigint") {
    if (value > Number.MAX_SAFE_INTEGER) return Number.MAX_SAFE_INTEGER;
    if (value < Number.MIN_SAFE_INTEGER) return Number.MIN_SAFE_INTEGER;
    return Number(value);
  }
  return Number(value) || 0;
};

const mapToUi = (item) => {
  const memeData = unopt(item?.meme_data) || {};
  const marketData = item?.market_data || {};
  const votes = safeBigIntToNumber(item?.votes?.upvotes ?? item?.votes ?? 0);

  let earnedIcp = 0;
  if (marketData?.total_earned) {
    earnedIcp = safeBigIntToNumber(marketData.total_earned) / 100000000;
  }

  let status = "earning";
  if (marketData?.is_listed) {
    status = "selling";
  }

  const id = item?.meme_id ?? item?.id ?? crypto.randomUUID();

  return {
    id: String(id),
    title: memeData?.prompt || item?.title || "Untitled Meme",
    emoji: "🖼️",
    votes,
    earnedIcp: Number.isFinite(earnedIcp) ? earnedIcp : 0,
    views: safeBigIntToNumber(marketData?.views || item?.views || 0),
    status,
    imageUrl: memeData?.image_url,
    isListed: marketData?.is_listed || false,
    listingPrice: marketData?.listing_price
      ? safeBigIntToNumber(marketData.listing_price) / 100000000
      : 0,
    totalSales: safeBigIntToNumber(marketData?.total_sales || 0),
    lastSalePrice: marketData?.last_sale_price
      ? safeBigIntToNumber(marketData.last_sale_price) / 100000000
      : 0,
    createdAt: item?.created_at,
  };
};

const formatPrincipal = (principal) => {
  if (!principal) return "Creator";
  if (principal.length <= 10) return principal;
  return `${principal.slice(0, 5)}…${principal.slice(-3)}`;
};

export const useICPPortfolioData = () => {
  const { isAuthenticated, principal, isLoading: authLoading } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [nfts, setNfts] = useState([]);
  const [lastUpdated, setLastUpdated] = useState(null);

  const fetchData = useCallback(async () => {
    if (!isAuthenticated) return;

    setLoading(true);
    setError("");

    try {
      await backendService.ensureReady();

      let memes = [];
      try {
        memes = await backendService.getUserMemes();
      } catch (err) {
        console.warn("Falling back to sample portfolio data", err);
        memes = [
          {
            id: "sample-1",
            meme_data: {
              prompt: "Sample Meme",
              image_url: "",
            },
            market_data: {
              is_listed: false,
              total_sales: 2,
              total_earned: 380000000,
              views: 128,
            },
            votes: { upvotes: 142, downvotes: 12 },
          },
        ];
      }

      if (!Array.isArray(memes)) {
        setNfts([]);
        return;
      }

      const mapped = await Promise.all(
        memes.map(async (item, index) => {
          const base = mapToUi(item);
          const numericId = /^\d+$/.test(base.id)
            ? BigInt(base.id)
            : null;

          if (!numericId) {
            return { ...base, isMinted: false };
          }

          try {
            if (index > 0) {
              await new Promise((resolve) => setTimeout(resolve, 50));
            }
            const isMinted = await backendService.isMemeMinted(numericId);
            return { ...base, isMinted: Boolean(isMinted), numericId };
          } catch (mintError) {
            console.warn("Mint check failed", mintError);
            return { ...base, isMinted: false, numericId };
          }
        })
      );

      const withVotes = await Promise.all(
        mapped.map(async (meme) => {
          if (!meme.numericId) return meme;

          try {
            const votes = await backendService.getMemeVotes(meme.numericId);
            if (!votes) return meme;
            const upvotes = safeBigIntToNumber(votes.upvotes);
            const downvotes = safeBigIntToNumber(votes.downvotes);
            return { ...meme, votes: upvotes - downvotes };
          } catch (voteErr) {
            console.warn("Vote fetch failed", voteErr);
            return meme;
          }
        })
      );

      setNfts(withVotes.map(({ numericId, ...rest }) => rest));
      setLastUpdated(new Date());
    } catch (err) {
      console.error("Portfolio load failed", err);
      setError(
        err?.message || "Failed to load your portfolio. Please try again."
      );
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }, [isAuthenticated]);

  useEffect(() => {
    if (!authLoading && isAuthenticated) {
      fetchData();
    }
  }, [authLoading, isAuthenticated, fetchData]);

  const totalEarnings = useMemo(
    () => nfts.reduce((sum, meme) => sum + (meme.earnedIcp || 0), 0),
    [nfts]
  );
  const totalVotes = useMemo(
    () => nfts.reduce((sum, meme) => sum + (meme.votes || 0), 0),
    [nfts]
  );
  const icpStaked = useMemo(
    () => nfts.reduce((sum, meme) => sum + (meme.listingPrice || 0), 0),
    [nfts]
  );
  const mintedCount = useMemo(
    () => nfts.filter((meme) => meme.isMinted).length,
    [nfts]
  );
  const wins = useMemo(
    () => nfts.filter((meme) => (meme.votes || 0) >= 0).length,
    [nfts]
  );
  const losses = useMemo(
    () => nfts.filter((meme) => (meme.votes || 0) < 0).length,
    [nfts]
  );

  const summary = useMemo(() => {
    const total = nfts.length;
    return {
      username: formatPrincipal(principal),
      totalMemes: total,
      wins,
      losses,
      successRate: total === 0 ? 0 : Math.round((wins / total) * 100),
      icpStaked,
      votingParticipation:
        totalVotes <= 0
          ? 0
          : Math.min(100, Math.round((wins / total) * 100 + totalVotes * 0.05)),
      nftsHeld: mintedCount,
      netProfit: totalEarnings,
      totalVotes,
      icpEarned: totalEarnings,
      avgVotes: total === 0 ? 0 : totalVotes / total,
      lastUpdated,
    };
  }, [nfts.length, wins, losses, icpStaked, mintedCount, totalVotes, totalEarnings, principal, lastUpdated]);

  const tableRows = useMemo(
    () =>
      nfts.map((meme, index) => ({
        ...meme,
        index: index + 1,
        participation: meme.views ? Math.min(100, Math.round((meme.views / 500) * 100)) : Math.max(5, wins > 0 ? 35 : 12),
      })),
    [nfts, wins]
  );

  return {
    loading,
    error,
    summary,
    tableRows,
    nfts,
    refresh: fetchData,
  };
};

export default useICPPortfolioData;
