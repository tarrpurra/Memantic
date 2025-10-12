import { useEffect, useRef, useState } from "react";
import backendService from "../services/backendService";
import { useToast } from "../hooks/use-toast";
import { safeBigIntToNumber, toOptionalBigInt, ensureArray } from "../utils/marketplaceUtils";

export const useMarketplaceVoting = (isAuthenticated, hasProfileName, memes, setMemes, setTopMemes) => {
  const { toast } = useToast();
  const votingLock = useRef(false);

  const checkMemeOwnership = (meme, principal) => {
    if (!principal || !meme) return false;

    // Method 1: Check meme.owner
    if (meme.owner) {
      const ownerText =
        typeof meme.owner === "object" && meme.owner.toText
          ? meme.owner.toText()
          : String(meme.owner).trim();
      if (ownerText && principal === ownerText) return true;
    }

    // Method 2: Check meme.creator (already string-shortened in normalizeMeme)
    if (meme.creator) {
      const creatorText = String(meme.creator).trim();
      if (creatorText && principal === creatorText) return true;
    }

    // Method 3: Check raw meme data
    if (meme.__raw) {
      const raw = meme.__raw;
      if (raw.owner) {
        const rawOwnerText =
          typeof raw.owner === "object" && raw.owner.toText
            ? raw.owner.toText()
            : String(raw.owner).trim();
        if (rawOwnerText && principal === rawOwnerText) return true;
      }
      if (raw.meme_data?.owner) {
        const memeDataOwnerText =
          typeof raw.meme_data.owner === "object" && raw.meme_data.owner.toText
            ? raw.meme_data.owner.toText()
            : String(raw.meme_data.owner).trim();
        if (memeDataOwnerText && principal === memeDataOwnerText) return true;
      }
    }

    return false;
  };

  const handleVote = async (memeId, currentVotes = 0, memeOwner = null, principal) => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to vote on memes",
        variant: "destructive",
      });
      return;
    }

    if (!hasProfileName) {
      toast({
        title: "Set a username first",
        description: "Choose a username before interacting with marketplace memes.",
      });
      return;
    }

    // Enhanced self-voting prevention
    const isOwnMeme = checkMemeOwnership({
      owner: memeOwner,
      creator: memeOwner,
    }, principal);
    if (isOwnMeme) {
      toast({
        title: "Cannot Vote on Own Meme",
        description:
          "You cannot vote on your own memes to maintain fair competition",
        variant: "destructive",
      });
      return;
    }

    if (votingLock.current) return;
    votingLock.current = true;

    // optimistic update
    setMemes((prev) =>
      ensureArray(prev).map((m) =>
        String(m.id) === String(memeId)
          ? { ...m, votes: safeBigIntToNumber(m.votes || 0) + 1 }
          : m
      )
    );

    // Also update top memes if this meme is in the top 3
    setTopMemes((prev) =>
      ensureArray(prev).map((m) =>
        String(m.id) === String(memeId)
          ? { ...m, votes: safeBigIntToNumber(m.votes || 0) + 1 }
          : m
      )
    );

    try {
      const bid = toOptionalBigInt(String(memeId));
      if (!bid) {
        // Non-numeric/sample ids cannot be voted via backend
        throw new Error("Invalid meme id (non-numeric) for voting");
      }

      await backendService.voteMeme(bid, "Upvote");
      toast({
        title: "Voted! 🚀",
        description: "Your vote has been recorded successfully",
      });

      // Refresh the leaderboard after successful vote
      setTimeout(() => {
        backendService
          .getCurrentLeaderboard(3)
          .then(async (res) => {
            const entries = ensureArray(res?.top_memes);

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
              if (pm) {
                return normalizeMeme(pm, { rank: e?.rank, votes: e?.votes }, userProfiles);
              }
              return normalizeMeme(
                { id: e?.meme_id, owner: e?.owner, meme_data: e?.meme_data },
                { rank: e?.rank, votes: e?.votes },
                userProfiles
              );
            });
            const weekStart = getWeekStartIST();
            const filteredArr = arr.filter(m => m.created_at >= weekStart.getTime());
            setTopMemes(filteredArr);
          })
          .catch((err) => console.warn("Failed to refresh leaderboard:", err));
      }, 1000);
    } catch (error) {
      console.error("Voting failed:", error);

      // revert optimistic update
      setMemes((prev) =>
        ensureArray(prev).map((m) =>
          String(m.id) === String(memeId) ? { ...m, votes: currentVotes } : m
        )
      );

      setTopMemes((prev) =>
        ensureArray(prev).map((m) =>
          String(m.id) === String(memeId) ? { ...m, votes: currentVotes } : m
        )
      );

      // Provide user-friendly error messages
      let errorTitle = "Voting Failed";
      let errorDescription = "Failed to vote on meme";

      if (error?.message) {
        if (error.message.includes("Cannot vote on your own meme")) {
          errorTitle = "Cannot Vote";
          errorDescription = "You cannot vote on your own memes";
        } else if (
          error.message.includes("Can only vote on memes from the current week")
        ) {
          errorTitle = "Voting Period Ended";
          errorDescription =
            "This meme is from a previous week and voting has ended";
        } else if (
          error.message.includes("Voting period for the current week has ended")
        ) {
          errorTitle = "Voting Period Ended";
          errorDescription = "The voting period for this week has ended";
        } else if (error.message.includes("Authentication required")) {
          errorTitle = "Authentication Required";
          errorDescription = "Please login to vote on memes";
        } else {
          errorDescription = error.message;
        }
      }

      toast({
        title: errorTitle,
        description: errorDescription,
        variant: "destructive",
      });
    } finally {
      votingLock.current = false;
    }
  };

  return {
    handleVote,
    checkMemeOwnership,
  };
};