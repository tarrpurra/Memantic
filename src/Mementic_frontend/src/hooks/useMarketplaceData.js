import { useEffect, useMemo, useState } from "react";
import backendService from "../services/backendService";
import {
  ensureArray,
  safeBigIntToNumber,
  toOptionalBigInt,
  normalizeMeme,
  deriveWeekIdFromMs,
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
  const [clearedWeekId, setClearedWeekId] = useState(null);
  const [clearedCompletionWeekId, setClearedCompletionWeekId] = useState(null);

  useEffect(() => {
    let cancelled = false;

    (async () => {
      try {
        await backendService.ensureReady();
        const status = await backendService.getCurrentWeekStatus();
        if (!cancelled) {
          const weekId = Number(status?.weekId);
          const normalizedWeekId = Number.isFinite(weekId) ? weekId : null;
          setCurrentWeekId(normalizedWeekId);
          setCurrentWeekStatus({
            weekId: normalizedWeekId,
            remainingNs: Number(status?.remainingNs) || 0,
            endTimeNs: Number(status?.endTimeNs) || 0,
            isCompleted: Boolean(status?.isCompleted),
          });
        }
      } catch (error) {
        if (!cancelled) {
          console.warn("Failed to fetch current week status:", error);
          setCurrentWeekId(null);
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
  }, [clearedWeekId, currentWeekStatus?.weekId]);

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
  }, [clearedCompletionWeekId, currentWeekStatus]);

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
        const res = await backendService.getTopLikedMemes(3);
        const entries = ensureArray(res?.top_memes ?? res);

        // Get unique owners for profile fetching
        const uniqueOwners = [...new Set(entries.map(e => {
          const owner = e?.owner;
          if (owner) {
            if (typeof owner === "string") return owner;
            if (typeof owner === "object" && owner.toText) return owner.toText();
            return String(owner);
          }
          return null;
        }).filter(Boolean))];

        // Fetch user profiles for leaderboard owners
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

        const arr = entries.map((e) => {
          const pm = Array.isArray(e?.meme_data)
            ? e.meme_data[0]
            : e?.meme_data;
          const normalized = pm
            ? normalizeMeme(pm, { rank: e?.rank, votes: e?.votes }, userProfiles)
            : normalizeMeme(
                {
                  id: e?.meme_id,
                  title: `Meme #${e?.meme_id ?? "?"}`,
                  owner: e?.owner,
                  meme_data: e?.meme_data,
                },
                { rank: e?.rank, votes: e?.votes },
                userProfiles
              );

          const likeCount = safeBigIntToNumber(e?.votes?.upvotes ?? normalized.votes ?? 0);
          const downvoteCount = safeBigIntToNumber(e?.votes?.downvotes ?? 0);

          return {
            ...normalized,
            votes: likeCount,
            likeCount,
            downvoteCount,
            voteScore: normalized.votes,
            voteDetails: e?.votes ?? null,
          };
        });
        const filtered =
          currentWeekId == null
            ? arr
            : arr.filter((meme) => {
                const week = deriveWeekIdFromMs(meme?.created_at);
                return week == null || week >= currentWeekId;
              });

        if (!cancelled) setTopMemes(filtered);
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
      let arr = [];
      let userProfiles = new Map();

      try {
        // Try to get all memes first
        const rawAll = await backendService.getAllMemes();
        const rawMemes = ensureArray(rawAll);

        // Get unique owners for profile fetching
        const uniqueOwners = [...new Set(rawMemes.map(m => {
          const owner = m?.owner ?? m?.meme_data?.owner ?? m?.creator;
          if (owner) {
            if (typeof owner === "string") return owner;
            if (typeof owner === "object" && owner.toText) return owner.toText();
            return String(owner);
          }
          return null;
        }).filter(Boolean))];

        // Fetch user profiles for all owners
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

        arr = rawMemes.map((m) => normalizeMeme(m, {}, userProfiles));
      } catch (err) {
        console.warn("getAllMemes failed, trying getMarketplaceMemes:", err);
        try {
          const rawMarketplace = await backendService.getMarketplaceMemes();
          const rawMemes = ensureArray(rawMarketplace);

          // Get unique owners for profile fetching
          const uniqueOwners = [...new Set(rawMemes.map(m => {
            const owner = m?.owner ?? m?.meme_data?.owner ?? m?.creator;
            if (owner) {
              if (typeof owner === "string") return owner;
              if (typeof owner === "object" && owner.toText) return owner.toText();
              return String(owner);
            }
            return null;
          }).filter(Boolean))];

          // Fetch user profiles for all owners
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

          arr = rawMemes.map((m) => normalizeMeme(m, {}, userProfiles));
        } catch (err2) {
          console.warn(
            "getMarketplaceMemes failed, trying getUserMemes:",
            err2
          );
          try {
            const rawUser = await backendService.getUserMemes();
            const rawMemes = ensureArray(rawUser);

            // Get unique owners for profile fetching
            const uniqueOwners = [...new Set(rawMemes.map(m => {
              const owner = m?.owner ?? m?.meme_data?.owner ?? m?.creator;
              if (owner) {
                if (typeof owner === "string") return owner;
                if (typeof owner === "object" && owner.toText) return owner.toText();
                return String(owner);
              }
              return null;
            }).filter(Boolean))];

            // Fetch user profiles for all owners
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

            arr = rawMemes.map((m) => normalizeMeme(m, {}, userProfiles));
          } catch (err3) {
            console.warn("All meme fetching methods failed:", err3);
            // Sample data fallback
            arr = [
              normalizeMeme({
                id: "sample-1",
                title: "Sample Meme 1",
                prompt: "A funny sample meme",
                caption: "Sample Meme 1",
                owner: "SampleUser",
                image_url: "",
                votes: 5,
                views: 10,
                created_at: Date.now(),
                emoji: "😂",
              }, {}, userProfiles),
              normalizeMeme({
                id: "sample-2",
                title: "Sample Meme 2",
                prompt: "Another sample meme",
                caption: "Sample Meme 2",
                owner: "SampleUser2",
                image_url: "",
                votes: 3,
                views: 8,
                created_at: Date.now() - 86400000,
                emoji: "🤣",
              }, {}, userProfiles),
            ];
          }
        }
      }

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

      // Filter to current week only (cleanup old memes)
      const filteredByWeek =
        currentWeekId == null
          ? arr
          : arr.filter((meme) => {
              const week = deriveWeekIdFromMs(meme?.created_at);
              return week == null || week >= currentWeekId;
            });

      const filteredForListing = filteredByWeek.filter((meme) => {
        const sale = meme?.sale_metadata ?? meme?.market_data ?? {};
        const isListed = Boolean(sale?.is_listed ?? sale?.isListed);
        return !isListed;
      });

      // Client-side paging
      const start = (page - 1) * 12; // PAGE_SIZE = 12
      const slice = filteredForListing.slice(start, start + 12);

      setTotal(filteredForListing.length);
      setMemes((prev) =>
        page === 1 || reset ? slice : [...ensureArray(prev), ...slice]
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
              return !(sale?.is_listed ?? sale?.isListed);
            });

            setMemes((prev) => {
              if (page === 1 || reset) {
                return sanitizedUpdates;
              }

              const preserved = ensureArray(prev)
                .slice(0, -slice.length)
                .filter((meme) => {
                  const sale = meme?.sale_metadata ?? meme?.market_data ?? {};
                  return !(sale?.is_listed ?? sale?.isListed);
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
  }, [page, sort, currentWeekId]);

  useEffect(() => {
    if (isAuthenticated && hasProfileName) {
      fetchList({ reset: true });
    }
  }, [isAuthenticated, hasProfileName, currentWeekId]);

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