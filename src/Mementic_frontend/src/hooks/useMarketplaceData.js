import { useEffect, useMemo, useState } from "react";
import backendService from "../services/backendService";
import {
  ensureArray,
  safeBigIntToNumber,
  toOptionalBigInt,
  normalizeMeme,
  deriveWeekIdFromMs,
  PAGE_SIZE,
} from "../utils/marketplaceUtils";

export const useMarketplaceData = (isAuthenticated, hasProfileName, page, sort, searchQuery) => {
  const [topMemes, setTopMemes] = useState([]);
  const [memes, setMemes] = useState([]);
  const [total, setTotal] = useState(0);
  const [loadingTop, setLoadingTop] = useState(true);
  const [loadingList, setLoadingList] = useState(true);
  const [errorMsg, setErrorMsg] = useState("");
  const defaultWeekStatus = useMemo(
    () => ({ weekId: null, remainingNs: 0, endTimeNs: 0, isCompleted: false }),
    []
  );
  const [currentWeekStatus, setCurrentWeekStatus] = useState(defaultWeekStatus);
  const [currentWeekId, setCurrentWeekId] = useState(null);
  const [previousWeekId, setPreviousWeekId] = useState(null);
  const [clearedWeekId, setClearedWeekId] = useState(null);
  const [clearedCompletionWeekId, setClearedCompletionWeekId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await backendService.ensureReady();
        const status = await backendService.getCurrentWeekStatus();
        const previousWeek = await backendService.getPreviousWeekId();
        if (!cancelled) {
          const weekId = Number(status?.weekId);
          const normalizedWeekId = Number.isFinite(weekId) ? weekId : null;
          const normalizedPreviousWeekId = previousWeek ? Number(previousWeek) : null;

          setCurrentWeekId(normalizedWeekId);
          setPreviousWeekId(normalizedPreviousWeekId);
          setCurrentWeekStatus({
            weekId: normalizedWeekId,
            remainingNs: Number(status?.remainingNs) || 0,
            endTimeNs: Number(status?.endTimeNs) || 0,
            isCompleted: Boolean(status?.isCompleted),
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to fetch week status:", error);
          setCurrentWeekId(null);
          setPreviousWeekId(null);
          setCurrentWeekStatus(defaultWeekStatus);
        }
      }
    })();

    return () => {
      cancelled = true;
    };
  }, [defaultWeekStatus]);

  useEffect(() => {
    const weekId = currentWeekStatus?.weekId;
    if (weekId == null) {
      return;
    }

    if (clearedWeekId == null || clearedWeekId !== weekId) {
      setTopMemes([]);
      setMemes([]);
      setTotal(0);
      setClearedWeekId(weekId);
    }
  }, [clearedWeekId, currentWeekStatus?.weekId, previousWeekId]);

  useEffect(() => {
    const { isCompleted, weekId } = currentWeekStatus ?? {};
    if (!isCompleted || weekId == null) {
      return;
    }

    if (clearedCompletionWeekId !== weekId) {
      setTopMemes([]);
      setMemes([]);
      setTotal(0);
      setClearedCompletionWeekId(weekId);
    }
  }, [clearedCompletionWeekId, currentWeekStatus, previousWeekId]);

  // Fetch Top 3
  useEffect(() => {
    if (!isAuthenticated || !hasProfileName) {
      setTopMemes([]);
      setLoadingTop(false);
      return () => undefined;
    }

    let cancelled = false;
    (async () => {
      setLoadingTop(true);
      setErrorMsg("");
      try {
        const leaderboard = await backendService.getCurrentLeaderboard(0, 50);
        const entries = ensureArray(leaderboard);

        if (entries.length === 0) {
          if (!cancelled) setTopMemes([]);
          return;
        }

        const resolved = await Promise.all(
          entries.map(async (entry) => {
            const rawId = Array.isArray(entry?.meme_id)
              ? entry.meme_id[0]
              : entry?.meme_id;
            const memeId = safeBigIntToNumber(rawId);
            if (!Number.isFinite(memeId) || memeId <= 0) {
              return null;
            }
            try {
              const meme = await backendService.getMeme(memeId);
              return meme ? { entry, meme } : null;
            } catch (error) {
              console.warn(`Failed to fetch meme ${memeId} for leaderboard:`, error);
              return null;
            }
          })
        );

        const valid = resolved.filter(Boolean);
        if (valid.length === 0) {
          if (!cancelled) setTopMemes([]);
          return;
        }

        const uniqueOwners = [
          ...new Set(
            valid
              .map(({ meme }) => {
                const owner = meme?.owner ?? meme?.meme_data?.owner ?? meme?.creator;
                if (owner) {
                  if (typeof owner === "string") return owner;
                  if (typeof owner === "object" && owner.toText) return owner.toText();
                  return String(owner);
                }
                return null;
              })
              .filter(Boolean)
          ),
        ];

        const userProfiles = new Map();
        for (const principal of uniqueOwners) {
          try {
            const profile = await backendService.getUserProfileByPrincipal(principal);
            if (profile) {
              userProfiles.set(principal, profile);
            }
          } catch (error) {
            console.warn(`Failed to fetch profile for ${principal}:`, error);
          }
        }

        const arr = valid.map(({ entry, meme }) => {
          const upvotes = safeBigIntToNumber(entry?.votes ?? entry?.votes?.upvotes ?? 0);
          const normalized = normalizeMeme(
            meme,
            { rank: entry?.rank, votes: { upvotes } },
            userProfiles
          );

          return {
            ...normalized,
            votes: upvotes,
            likeCount: upvotes,
            downvoteCount: 0,
            voteScore: upvotes,
            voteDetails: { upvotes, downvotes: 0 },
          };
        });

        const filtered =
          currentWeekId == null
            ? arr
            : arr.filter((meme) => {
                const week = deriveWeekIdFromMs(meme?.created_at);
                // Only include memes from the current week
                // Exclude all memes from previous weeks (not just the immediate previous one)
                return week === currentWeekId;
              });

        // Filter out finalized, week-ended memes, and memes with 0 votes from leaderboard
        const cleanedFiltered = filtered.filter((meme) => {
          const isFinalized = Boolean(meme?.finalized);
          const isWeekEnded = Boolean(meme?.week_ended);
          const hasVotes = (meme?.votes ?? 0) > 0;
          return !isFinalized && !isWeekEnded && hasVotes;
        });

        if (!cancelled) setTopMemes(cleanedFiltered);
      } catch (e) {
        if (!cancelled) setErrorMsg("Failed to load top memes.");
      } finally {
        if (!cancelled) setLoadingTop(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [hasProfileName, isAuthenticated, currentWeekId]);

  // Fetch paginated list
  const fetchList = async ({ reset = false } = {}) => {
    if (!isAuthenticated || !hasProfileName) {
      if (reset) {
        setMemes([]);
        setTotal(0);
      }
      setLoadingList(false);
      if (!isAuthenticated || !hasProfileName) {
        setErrorMsg("Please login to view the marketplace.");
      }
      return;
    }

    if (currentWeekStatus?.isCompleted) {
      setMemes([]);
      setTotal(0);
      setLoadingList(false);
      return;
    }

    setLoadingList(true);
    setErrorMsg("");
    try {
      const pageSize = PAGE_SIZE;
      const offset = (page - 1) * pageSize;
      const cards = await backendService.listPremarketMemes(offset, pageSize);
      const entries = ensureArray(cards);

      if (entries.length === 0) {
        if (reset || page === 1) {
          setMemes([]);
        }
        setTotal(offset);
        setLoadingList(false);
        return;
      }

      const resolved = await Promise.all(
        entries.map(async (card) => {
          const rawId = Array.isArray(card?.id) ? card.id[0] : card?.id;
          const memeId = safeBigIntToNumber(rawId);
          if (!Number.isFinite(memeId) || memeId <= 0) {
            return null;
          }
          try {
            const detail = await backendService.getMeme(memeId);
            return detail ? { detail } : null;
          } catch (error) {
            console.warn(`Failed to fetch meme ${memeId}:`, error);
            return null;
          }
        })
      );

      const valid = resolved.filter(Boolean);
      if (valid.length === 0) {
        if (reset || page === 1) {
          setMemes([]);
        }
        setTotal(offset);
        setLoadingList(false);
        return;
      }

      const uniqueOwners = [
        ...new Set(
          valid
            .map(({ detail }) => {
              const owner = detail?.owner ?? detail?.meme_data?.owner ?? detail?.creator;
              if (owner) {
                if (typeof owner === "string") return owner;
                if (typeof owner === "object" && owner.toText) return owner.toText();
                return String(owner);
              }
              return null;
            })
            .filter(Boolean)
        ),
      ];

      const userProfiles = new Map();
      for (const principal of uniqueOwners) {
        try {
          const profile = await backendService.getUserProfileByPrincipal(principal);
          if (profile) {
            userProfiles.set(principal, profile);
          }
        } catch (error) {
          console.warn(`Failed to fetch profile for ${principal}:`, error);
        }
      }

      const arr = valid.map(({ detail }) => normalizeMeme(detail, {}, userProfiles));

      const getCreatedAt = (meme) => safeBigIntToNumber(meme?.created_at || 0);
      const getVotes = (meme) => safeBigIntToNumber(meme?.votes || 0);
      const getViews = (meme) => safeBigIntToNumber(meme?.views || 0);
      const getSale = (meme) => meme?.sale_metadata ?? meme?.market_data;

      if (sort === "newest") {
        arr.sort((a, b) => {
          const dateDiff = getCreatedAt(b) - getCreatedAt(a);
          if (dateDiff !== 0) return dateDiff;
          return getVotes(b) - getVotes(a);
        });
      } else if (sort === "top") {
        arr.sort((a, b) => {
          const voteDiff = getVotes(b) - getVotes(a);
          if (voteDiff !== 0) return voteDiff;
          return getViews(b) - getViews(a);
        });
      } else if (sort === "listed") {
        arr.sort((a, b) => {
          const aListed = getSale(a)?.is_listed ? 1 : 0;
          const bListed = getSale(b)?.is_listed ? 1 : 0;
          if (aListed !== bListed) return bListed - aListed;
          const voteDiff = getVotes(b) - getVotes(a);
          if (voteDiff !== 0) return voteDiff;
          return getCreatedAt(b) - getCreatedAt(a);
        });
      } else {
        arr.sort((a, b) => {
          const scoreA = getVotes(a) * 2 + getViews(a);
          const scoreB = getVotes(b) * 2 + getViews(b);
          if (scoreB !== scoreA) return scoreB - scoreA;
          return getCreatedAt(b) - getCreatedAt(a);
        });
      }

      const filteredByWeek =
        currentWeekId == null
          ? arr
          : arr.filter((meme) => {
              const week = deriveWeekIdFromMs(meme?.created_at);
              // Only include memes from the current week
              // Exclude all memes from previous weeks
              return week === currentWeekId;
            });

        const filteredForListing = filteredByWeek.filter((meme) => {
          const sale = meme?.sale_metadata ?? meme?.market_data ?? {};
          const isListed = Boolean(sale?.is_listed ?? sale?.isListed);
          const isFinalized = Boolean(meme?.finalized); // Don't show finalized memes from completed weeks
          const isWeekEnded = Boolean(meme?.week_ended); // Don't show memes from ended weeks
          return !isListed && !isFinalized && !isWeekEnded;
        });

        const slice = filteredForListing;

        setTotal(offset + filteredForListing.length);
        setMemes((prev) =>
          page === 1 || reset ? filteredForListing : [...ensureArray(prev), ...filteredForListing]
        );

      // Refresh vote counts for newly loaded memes
      if (slice.length > 0) {
        setTimeout(async () => {
          try {
            const currentMemeIds = slice.map((m) => m.id);
            const updatedMemes = await Promise.all(
              currentMemeIds.map(async (memeId) => {
                try {
                  const bid = toOptionalBigInt(String(memeId));
                  if (!bid) return slice.find((m) => m.id === memeId);
                  const voteData = await backendService.getMemeVotes(bid);
                  if (voteData) {
                    return {
                      ...slice.find((m) => m.id === memeId),
                      votes:
                        safeBigIntToNumber(voteData.upvotes) -
                        safeBigIntToNumber(voteData.downvotes),
                    };
                  }
                  return slice.find((m) => m.id === memeId);
                } catch (error) {
                  console.warn(
                    `Failed to get initial votes for meme ${memeId}:`,
                    error
                  );
                  return slice.find((m) => m.id === memeId);
                }
              })
            );
            const sanitizedUpdates = updatedMemes.filter((meme) => {
              const sale = meme?.sale_metadata ?? meme?.market_data ?? {};
              const isListed = sale?.is_listed ?? sale?.isListed;
              const isFinalized = meme?.finalized; // Filter out finalized memes
              const isWeekEnded = meme?.week_ended; // Filter out memes from ended weeks
              
              // Also filter by week - only include current week memes
              const week = deriveWeekIdFromMs(meme?.created_at);
              const isCurrentWeek = currentWeekId == null || week === currentWeekId;
              
              return !isListed && !isFinalized && !isWeekEnded && isCurrentWeek;
            });

            setMemes((prev) => {
              if (page === 1 || reset) {
                return sanitizedUpdates;
              }

              const preserved = ensureArray(prev)
                .slice(0, -slice.length)
                .filter((meme) => {
                  const sale = meme?.sale_metadata ?? meme?.market_data ?? {};
                  const isListed = sale?.is_listed ?? sale?.isListed;
                  const isFinalized = meme?.finalized; // Filter out finalized memes
                  const isWeekEnded = meme?.week_ended; // Filter out memes from ended weeks
                  
                  // Also filter by week - only include current week memes
                  const week = deriveWeekIdFromMs(meme?.created_at);
                  const isCurrentWeek = currentWeekId == null || week === currentWeekId;
                  
                  return !isListed && !isFinalized && !isWeekEnded && isCurrentWeek;
                });

              return [...preserved, ...sanitizedUpdates];
            });
          } catch (error) {
            console.warn("Failed to refresh initial vote counts:", error);
          }
        }, 500);
      }
    } catch (e) {
      console.error("Failed to load memes:", e);
      setErrorMsg("Failed to load memes. Please try again.");
    } finally {
      setLoadingList(false);
    }
  };

  useEffect(() => {
    fetchList({ reset: page === 1 });
  }, [page, sort, currentWeekId, previousWeekId]);

  useEffect(() => {
    if (isAuthenticated && hasProfileName) {
      fetchList({ reset: true });
    }
  }, [isAuthenticated, hasProfileName, currentWeekId, previousWeekId]);

  return {
    topMemes,
    memes,
    total,
    loadingTop,
    loadingList,
    errorMsg,
    fetchList,
    setTopMemes,
    setMemes,
    currentWeekStatus,
  };
};