import { useState, useEffect, useCallback } from "react";
import {
  Heart,
  TrendingUp,
  Coins,
  Crown,
  Zap,
  Eye,
  User,
  X,
  Play,
} from "lucide-react";
import backendService from "../services/backendService.js";

export const MemeCard = ({
  meme,
  onVote,
  onShare,
  isAuthenticated,
  currentUserPrincipal,
  onVoteSuccess,
}) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [hasStaked, setHasStaked] = useState(false);
  const [isOwnMeme, setIsOwnMeme] = useState(false);
  const [loadingVoteStatus, setLoadingVoteStatus] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [showModal, setShowModal] = useState(false);
  const [views, setViews] = useState(meme?.views || 0);
  const [hasViewed, setHasViewed] = useState(false);
  const [isHovered, setIsHovered] = useState(false);

  // Support both snake_case (backend) and camelCase (legacy)
  const {
    title = "Untitled Meme",
    creator = "Anonymous",
    votes: rawVotes = 0,
    stakeAmount = 0,
    isViral = false,
    isNFT = false,
  } = meme || {};

  // Safely convert BigInt votes to number
  const votes =
    typeof rawVotes === "bigint"
      ? rawVotes > Number.MAX_SAFE_INTEGER
        ? Number.MAX_SAFE_INTEGER
        : rawVotes < Number.MIN_SAFE_INTEGER
        ? Number.MIN_SAFE_INTEGER
        : Number(rawVotes)
      : Number(rawVotes) || 0;
  const image = meme?.image_url || meme?.imageUrl || "";
  const memeId = meme?.id || meme?.meme_id;

  // Enhanced ownership detection with multiple fallback methods
  const checkOwnership = () => {
    if (!currentUserPrincipal || !meme) return false;

    // Method 1: Check meme.owner (primary method)
    if (meme.owner) {
      const ownerText =
        typeof meme.owner === "object" && meme.owner.toText
          ? meme.owner.toText()
          : String(meme.owner).trim();
      if (ownerText && currentUserPrincipal === ownerText) {
        return true;
      }
    }

    // Method 2: Check meme.creator (fallback)
    if (meme.creator) {
      const creatorText = String(meme.creator).trim();
      if (creatorText && currentUserPrincipal === creatorText) {
        return true;
      }
    }

    // Method 3: Check raw meme data for additional owner fields
    if (meme.__raw) {
      const raw = meme.__raw;
      if (raw.owner) {
        const rawOwnerText =
          typeof raw.owner === "object" && raw.owner.toText
            ? raw.owner.toText()
            : String(raw.owner).trim();
        if (rawOwnerText && currentUserPrincipal === rawOwnerText) {
          return true;
        }
      }
      if (raw.meme_data?.owner) {
        const memeDataOwnerText =
          typeof raw.meme_data.owner === "object" && raw.meme_data.owner.toText
            ? raw.meme_data.owner.toText()
            : String(raw.meme_data.owner).trim();
        if (memeDataOwnerText && currentUserPrincipal === memeDataOwnerText) {
          return true;
        }
      }
    }

    return false;
  };

  // Mock functions for demonstration (replace with actual implementations)
  const showToast = (title, description, variant = "default") => {
    console.log(`Toast: ${title} - ${description} (${variant})`);
  };

  // Function to check and update vote status
  const checkAndUpdateVoteStatus = useCallback(async () => {
    if (!isAuthenticated || !memeId) {
      setLoadingVoteStatus(false);
      setHasVoted(false);
      setIsOwnMeme(false);
      return;
    }

    if (loadingVoteStatus) {
      console.log("Vote status check already in progress, skipping");
      return;
    }

    setLoadingVoteStatus(true);

    try {
      const ownershipResult = checkOwnership();
      setIsOwnMeme(ownershipResult);

      if (!ownershipResult && isAuthenticated) {
        const memeIdBigInt = BigInt(memeId);
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(
            () => reject(new Error("Vote status check timed out")),
            10000
          );
        });

        const userVote = await Promise.race([
          backendService.getUserVote(memeIdBigInt),
          timeoutPromise,
        ]);

        setHasVoted(!!userVote);
        console.log(
          `Vote status for meme ${memeId}:`,
          !!userVote ? "voted" : "not voted"
        );
      } else {
        setHasVoted(false);
        console.log(`Meme ${memeId} is owned by user or user not authenticated, cannot vote`);
      }
    } catch (error) {
      console.error("Failed to check vote status:", error);
      const ownershipResult = checkOwnership();
      setIsOwnMeme(ownershipResult);
      setHasVoted(false);
    } finally {
      setLoadingVoteStatus(false);
    }
  }, [isAuthenticated, memeId, currentUserPrincipal]);

  useEffect(() => {
    checkAndUpdateVoteStatus();
  }, [checkAndUpdateVoteStatus]);

  const incrementViews = async () => {
    if (memeId && !hasViewed) {
      try {
        await backendService.incrementMemeViews(BigInt(memeId));
        setViews((prev) => prev + 1);
        setHasViewed(true);
      } catch (error) {
        console.warn(`Failed to increment views for meme ${memeId}:`, error);
      }
    }
  };

  const handleVote = async () => {
    if (!isAuthenticated) {
      showToast(
        "Authentication Required",
        "Please login to vote on memes",
        "destructive"
      );
      return;
    }

    const currentOwnership = checkOwnership();
    if (currentOwnership || isOwnMeme) {
      showToast(
        "Cannot Vote on Own Meme",
        "You cannot vote on your own memes to maintain fair competition",
        "destructive"
      );
      return;
    }

    if (hasVoted) {
      showToast(
        "Already Voted",
        "You have already voted on this meme",
        "destructive"
      );
      return;
    }

    if (!memeId) {
      console.log("Invalid meme ID:", memeId);
      showToast(
        "Invalid Meme",
        "Cannot vote on this meme - invalid meme ID",
        "destructive"
      );
      return;
    }

    if (onVote) {
      setIsVoting(true);
      try {
        const owner = meme?.owner || meme?.creator;
        await onVote(memeId, votes || 0, owner);
        await checkAndUpdateVoteStatus();
        if (onVoteSuccess) {
          onVoteSuccess(memeId);
        }
      } catch (error) {
        console.error("Vote failed:", error);
        const recheckOwnership = checkOwnership();
        if (recheckOwnership) {
          showToast(
            "Cannot Vote on Own Meme",
            "You cannot vote on your own memes",
            "destructive"
          );
        } else {
          showToast(
            "Vote Failed",
            error?.message || "An error occurred while voting",
            "destructive"
          );
        }
      } finally {
        setIsVoting(false);
      }
    }
  };

  const handleStake = () => {
    if (!isAuthenticated) {
      showToast(
        "Authentication Required",
        "Please login to stake ICP on memes",
        "destructive"
      );
      return;
    }

    if (isOwnMeme) {
      showToast(
        "Cannot Stake on Own Meme",
        "You cannot stake ICP on your own memes",
        "destructive"
      );
      return;
    }

    setHasStaked(!hasStaked);
    showToast(
      hasStaked ? "Stake withdrawn" : "Staked! 💎",
      hasStaked
        ? "ICP stake withdrawn from this meme"
        : "Successfully staked 10 ICP on this meme! You'll earn rewards as it gains votes."
    );
  };

  const handleCardClick = (e) => {
    if (e.target.closest("button")) return;
    setShowModal(true);
    incrementViews();
  };

  const handleCloseModal = () => {
    setShowModal(false);
  };

  return (
    <>
      {/* Enhanced Instagram-style Card - Now Larger */}
      <div
        className="group relative cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl transition-all duration-300 w-full max-w-sm mx-auto transform hover:-translate-y-1"
        onClick={handleCardClick}
        onMouseEnter={() => setIsHovered(true)}
        onMouseLeave={() => setIsHovered(false)}
      >
        {/* Aspect ratio container - Made larger */}
        <div className="aspect-[4/5] w-full relative">
          {/* Main Image Container */}
          <div className="relative w-full h-full overflow-hidden">
            {image ? (
              <img
                src={image}
                alt={title}
                className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                loading="lazy"
              />
            ) : (
              <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                <span className="text-6xl filter drop-shadow-lg">
                  {meme?.emoji || "🖼️"}
                </span>
              </div>
            )}

            {/* Enhanced Gradient Overlay */}
            <div
              className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
                isHovered ? "opacity-100" : "opacity-60"
              }`}
            />

            {/* Interactive Overlay Content */}
            <div className="absolute inset-0 flex flex-col justify-between p-4">
              {/* Top Section - Badges */}
              <div className="flex justify-between items-start">
                <div className="flex flex-wrap gap-2">
                  {isOwnMeme && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-orange-500/90 text-white border-0 backdrop-blur-sm">
                      <User className="h-3 w-3 mr-1" />
                      Mine
                    </span>
                  )}
                  {hasVoted && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-red-500/90 text-white border-0 backdrop-blur-sm">
                      <Heart className="h-3 w-3 mr-1 fill-current" />
                      Voted
                    </span>
                  )}
                  {isNFT && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-purple-500/90 text-white border-0 backdrop-blur-sm">
                      <Crown className="h-3 w-3 mr-1" />
                      NFT
                    </span>
                  )}
                  {isViral && (
                    <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-yellow-500/90 text-white border-0 backdrop-blur-sm">
                      <TrendingUp className="h-3 w-3 mr-1" />
                      Viral
                    </span>
                  )}
                </div>

                {/* Action indicators */}
                <div
                  className={`transition-opacity duration-300 ${
                    isHovered ? "opacity-100" : "opacity-0"
                  }`}
                >
                  <div className="bg-black/40 backdrop-blur-sm rounded-full p-2">
                    <Play className="h-4 w-4 text-white" />
                  </div>
                </div>
              </div>

              {/* Bottom Section - Info and Stats */}
              <div className="space-y-3">
                {/* Stats Row - Always Visible */}
                <div className="flex items-center justify-between text-white">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart
                        className={`h-4 w-4 ${
                          hasVoted ? "fill-current text-red-400" : ""
                        }`}
                      />
                      <span className="font-semibold text-sm">{votes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="h-4 w-4" />
                      <span className="font-semibold text-sm">{views}</span>
                    </div>
                    {stakeAmount > 0 && (
                      <div className="flex items-center gap-1">
                        <Coins className="h-4 w-4 text-yellow-400" />
                        <span className="font-semibold text-sm">
                          {stakeAmount}
                        </span>
                      </div>
                    )}
                  </div>
                </div>

                {/* Title and Creator */}
                <div className="text-white">
                  <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">
                    {title}
                  </h3>
                  <p className="text-white/80 text-sm">by @{creator}</p>
                  <p className="text-white/60 text-xs">
                    {new Date(meme?.created_at || Date.now()).toLocaleString("en-IN", {
                      timeZone: "Asia/Kolkata",
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </p>
                </div>

                {/* Quick Action Buttons - Visible on Hover */}
                <div
                  className={`transition-all duration-300 ${
                    isHovered
                      ? "opacity-100 translate-y-0"
                      : "opacity-0 translate-y-2"
                  }`}
                >
                  <div className="flex gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleVote();
                      }}
                      disabled={
                        isOwnMeme || hasVoted || loadingVoteStatus || isVoting
                      }
                      className="flex-1 px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center"
                    >
                      <Heart
                        className={`h-3 w-3 mr-1 ${
                          hasVoted ? "fill-current" : ""
                        }`}
                      />
                      {isVoting
                        ? "..."
                        : isOwnMeme
                        ? "Mine"
                        : hasVoted
                        ? "Voted"
                        : "Vote"}
                    </button>

                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        handleStake();
                      }}
                      disabled={!isAuthenticated || isOwnMeme}
                      className="px-3 py-2 bg-white/20 backdrop-blur-sm border border-white/30 text-white hover:bg-white/30 rounded-md text-sm font-medium transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                    >
                      <Zap className="h-3 w-3" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Subtle border glow effect */}
        <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
      </div>

      {/* Enhanced Modal */}
      {showModal && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 backdrop-blur-sm p-4"
          onClick={handleCloseModal}
        >
          <div
            className="relative max-w-5xl w-full max-h-[95vh] bg-white dark:bg-gray-900 rounded-2xl overflow-hidden shadow-2xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Close button */}
            <button
              onClick={handleCloseModal}
              className="absolute top-6 right-6 z-10 text-gray-400 hover:text-gray-600 dark:text-gray-500 dark:hover:text-gray-300 transition-colors bg-white/90 dark:bg-gray-800/90 backdrop-blur-sm rounded-full p-2 shadow-lg"
            >
              <X className="h-6 w-6" />
            </button>

            <div className="flex flex-col lg:flex-row max-h-[95vh]">
              {/* Image Section - Left Side */}
              <div className="lg:w-3/5 flex items-center justify-center bg-black p-6">
                <div className="max-h-[80vh] overflow-auto flex items-center justify-center bg-black/5 p-2 rounded-lg">
                  {image ? (
                    <img
                      src={image}
                      alt={title}
                      className="w-auto h-auto max-w-full max-h-[78vh] object-contain rounded-lg shadow-2xl"
                    />
                  ) : (
                    <div className="w-96 h-96 bg-gray-200 dark:bg-gray-700 flex items-center justify-center rounded-lg">
                      <span className="text-9xl">{meme?.emoji || "🖼️"}</span>
                    </div>
                  )}
                </div>
              </div>

              {/* Details Section - Right Side */}
              <div className="lg:w-2/5 flex flex-col bg-white dark:bg-gray-900">
                {/* Header */}
                <div className="p-8 border-b border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between mb-6">
                    <div className="flex-1">
                      <h2 className="text-2xl font-bold text-gray-900 dark:text-white mb-2 leading-tight">
                        {title}
                      </h2>
                      <p className="text-gray-600 dark:text-gray-400 text-lg">
                        by @{creator}
                      </p>
                    </div>
                  </div>

                  {/* Badges */}
                  <div className="flex gap-2 flex-wrap mb-6">
                    {isOwnMeme && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-orange-100 text-orange-800 border border-orange-300">
                        <User className="h-3 w-3 mr-1" />
                        Your Meme
                      </span>
                    )}
                    {hasVoted && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-red-100 text-red-800">
                        <Heart className="h-3 w-3 mr-1 fill-current" />
                        Voted
                      </span>
                    )}
                    {isNFT && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-purple-100 text-purple-800">
                        <Crown className="h-3 w-3 mr-1" />
                        NFT
                      </span>
                    )}
                    {isViral && (
                      <span className="inline-flex items-center px-3 py-1 rounded-full text-xs font-medium bg-yellow-100 text-yellow-800">
                        <TrendingUp className="h-3 w-3 mr-1" />
                        Viral
                      </span>
                    )}
                  </div>

                  {/* Enhanced Stats */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Heart className="h-5 w-5 mx-auto mb-1 text-red-500" />
                      <div className="font-bold text-lg text-red-600">
                        {votes}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Votes
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Eye className="h-5 w-5 mx-auto mb-1 text-blue-500" />
                      <div className="font-bold text-lg text-blue-600">
                        {views}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        Views
                      </div>
                    </div>
                    <div className="text-center p-3 bg-gray-50 dark:bg-gray-800 rounded-lg">
                      <Coins className="h-5 w-5 mx-auto mb-1 text-yellow-500" />
                      <div className="font-bold text-lg text-yellow-600">
                        {stakeAmount}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        ICP Staked
                      </div>
                    </div>
                  </div>
                </div>

                {/* Scrollable Content */}
                <div className="flex-1 overflow-y-auto p-8">
                  {/* Additional Info */}
                  <div className="space-y-4">
                    <h4 className="text-lg font-semibold text-gray-700 dark:text-gray-300">
                      Details
                    </h4>
                    <div className="space-y-3 text-gray-600 dark:text-gray-400">
                      <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                        <span className="font-medium">Created:</span>
                        <span>
                          {new Date(meme?.created_at || Date.now()).toLocaleString("en-IN", {
                            timeZone: "Asia/Kolkata",
                            dateStyle: "medium",
                            timeStyle: "short",
                          })}
                        </span>
                      </div>
                      {meme?.market_data?.is_listed && (
                        <div className="flex justify-between py-2 border-b border-gray-100 dark:border-gray-800">
                          <span className="font-medium">Price:</span>
                          <span className="font-semibold text-green-600">
                            {meme.market_data.listing_price
                              ? (
                                  meme.market_data.listing_price / 100000000
                                ).toFixed(2)
                              : "N/A"}{" "}
                            ICP
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {/* Enhanced Actions */}
                <div className="p-8 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-800/50">
                  <div className="grid grid-cols-2 gap-4">
                    <button
                      onClick={handleVote}
                      disabled={
                        isOwnMeme || hasVoted || loadingVoteStatus || isVoting
                      }
                      className="h-12 px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-300 disabled:cursor-not-allowed text-white rounded-lg text-base font-semibold transition-colors flex items-center justify-center"
                    >
                      <Heart
                        className={`h-5 w-5 mr-2 ${
                          hasVoted ? "fill-current" : ""
                        }`}
                      />
                      {isVoting
                        ? "Voting..."
                        : isOwnMeme
                        ? "Your Meme"
                        : hasVoted
                        ? "Voted"
                        : "Vote"}
                    </button>

                    <button
                      onClick={handleStake}
                      disabled={!isAuthenticated || isOwnMeme}
                      className="h-12 px-4 py-2 border border-gray-300 hover:bg-gray-50 disabled:bg-gray-100 disabled:cursor-not-allowed text-gray-700 rounded-lg text-base font-semibold transition-colors flex items-center justify-center"
                    >
                      <Zap className="h-5 w-5 mr-2" />
                      {isOwnMeme
                        ? "Your Meme"
                        : hasStaked
                        ? "Staked"
                        : "Stake ICP"}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
