import { useState, useEffect, useCallback } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardFooter,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import {
  Heart,
  TrendingUp,
  Coins,
  Crown,
  Zap,
  Eye,
  User,
} from "../components/ui/Icon";
import { useToast } from "../hooks/use-toast";
import backendService from "../services/backendService";

export const MemeCard = ({ meme, onVote, onShare, isAuthenticated, currentUserPrincipal, onVoteSuccess }) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [hasStaked, setHasStaked] = useState(false);
  const [isOwnMeme, setIsOwnMeme] = useState(false);
  const [loadingVoteStatus, setLoadingVoteStatus] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const [views, setViews] = useState(meme?.views || 0);
  const { toast } = useToast();

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
  const votes = typeof rawVotes === 'bigint'
    ? (rawVotes > Number.MAX_SAFE_INTEGER ? Number.MAX_SAFE_INTEGER :
       rawVotes < Number.MIN_SAFE_INTEGER ? Number.MIN_SAFE_INTEGER :
       Number(rawVotes))
    : Number(rawVotes) || 0;
  const image = meme?.image_url || meme?.imageUrl || "";
  const memeId = meme?.id || meme?.meme_id;

  // Enhanced ownership detection with multiple fallback methods
  const checkOwnership = () => {
    if (!currentUserPrincipal || !meme) return false;

    // Method 1: Check meme.owner (primary method)
    if (meme.owner) {
      const ownerText = typeof meme.owner === 'object' && meme.owner.toText
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
        const rawOwnerText = typeof raw.owner === 'object' && raw.owner.toText
          ? raw.owner.toText()
          : String(raw.owner).trim();
        if (rawOwnerText && currentUserPrincipal === rawOwnerText) {
          return true;
        }
      }
      if (raw.meme_data?.owner) {
        const memeDataOwnerText = typeof raw.meme_data.owner === 'object' && raw.meme_data.owner.toText
          ? raw.meme_data.owner.toText()
          : String(raw.meme_data.owner).trim();
        if (memeDataOwnerText && currentUserPrincipal === memeDataOwnerText) {
          return true;
        }
      }
    }

    return false;
  };

  // Function to check and update vote status
  const checkAndUpdateVoteStatus = useCallback(async () => {
    if (!isAuthenticated || !memeId) {
      setLoadingVoteStatus(false);
      setHasVoted(false);
      setIsOwnMeme(false);
      return;
    }

    // Prevent multiple simultaneous calls
    if (loadingVoteStatus) {
      console.log("Vote status check already in progress, skipping");
      return;
    }

    setLoadingVoteStatus(true);

    try {
      // Check ownership using enhanced method
      const ownershipResult = checkOwnership();
      setIsOwnMeme(ownershipResult);

      // Only check vote status if it's not the user's own meme
      if (!ownershipResult) {
        // Convert string ID to BigInt for backend call
        const memeIdBigInt = BigInt(memeId);

        // Create a timeout promise
        const timeoutPromise = new Promise((_, reject) => {
          setTimeout(() => reject(new Error('Vote status check timed out')), 10000);
        });

        // Race the backend call against the timeout
        const userVote = await Promise.race([
          backendService.getUserVote(memeIdBigInt),
          timeoutPromise
        ]);

        // userVote will be null/undefined if user hasn't voted, or a VoteRecord if they have
        setHasVoted(!!userVote);
        console.log(`Vote status for meme ${memeId}:`, !!userVote ? "voted" : "not voted");
      } else {
        setHasVoted(false);
        console.log(`Meme ${memeId} is owned by user, cannot vote`);
      }
    } catch (error) {
      console.error("Failed to check vote status:", error);
      // Still check ownership even if vote check fails
      const ownershipResult = checkOwnership();
      setIsOwnMeme(ownershipResult);
      setHasVoted(false);
    } finally {
      setLoadingVoteStatus(false);
    }
  }, [isAuthenticated, memeId, currentUserPrincipal]);

  // Check user's vote status and ownership on component mount
  useEffect(() => {
    checkAndUpdateVoteStatus();
  }, [checkAndUpdateVoteStatus]);

  // Increment view count when component mounts
  useEffect(() => {
    const incrementViews = async () => {
      if (memeId) {
        try {
          await backendService.incrementMemeViews(BigInt(memeId));
          // Update local view count
          setViews(prev => prev + 1);
        } catch (error) {
          // Silently fail - view tracking is not critical
          console.warn(`Failed to increment views for meme ${memeId}:`, error);
        }
      }
    };

    incrementViews();
  }, [memeId]);

  const handleVote = async () => {
    // Authentication check
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to vote on memes",
        variant: "destructive",
      });
      return;
    }

    // Double-check ownership to prevent any bypass attempts
    const currentOwnership = checkOwnership();
    if (currentOwnership || isOwnMeme) {
      toast({
        title: "Cannot Vote on Own Meme",
        description: "You cannot vote on your own memes to maintain fair competition",
        variant: "destructive",
      });
      return;
    }

    // Check if already voted
    if (hasVoted) {
      toast({
        title: "Already Voted",
        description: "You have already voted on this meme",
        variant: "destructive",
      });
      return;
    }

    // Validate meme ID
    if (!memeId) {
      console.log("Invalid meme ID:", memeId);
      toast({
        title: "Invalid Meme",
        description: "Cannot vote on this meme - invalid meme ID",
        variant: "destructive",
      });
      return;
    }

    console.log("All checks passed, proceeding with vote");

    // Execute vote
    if (onVote) {
      console.log("Calling onVote function");
      setIsVoting(true);
      try {
        // Get owner information for additional backend validation
        const owner = meme?.owner || meme?.creator;
        console.log("Voting with params:", { memeId, votes, owner });

        await onVote(memeId, votes || 0, owner);
        console.log("Vote successful, updating state");

        // Re-check vote status after successful vote to update hasVoted state
        await checkAndUpdateVoteStatus();

        // Call optional success callback if provided
        if (onVoteSuccess) {
          onVoteSuccess(memeId);
        }

        console.log("Vote process completed successfully");
        // Success toast is handled by parent component (Marketplace)
      } catch (error) {
        console.error("Vote failed:", error);
        // Re-check ownership in case of error
        const recheckOwnership = checkOwnership();
        if (recheckOwnership) {
          toast({
            title: "Cannot Vote on Own Meme",
            description: "You cannot vote on your own memes",
            variant: "destructive",
          });
        } else {
          // Show generic error for other failures
          toast({
            title: "Vote Failed",
            description: error?.message || "An error occurred while voting",
            variant: "destructive",
          });
        }
      } finally {
        setIsVoting(false);
      }
    } else {
      console.log("onVote function not provided");
      toast({
        title: "Voting Unavailable",
        description: "Voting functionality is not available for this meme",
        variant: "destructive",
      });
    }
  };

  const handleStake = () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to stake ICP on memes",
        variant: "destructive",
      });
      return;
    }

    // Prevent staking on own memes
    if (isOwnMeme) {
      toast({
        title: "Cannot Stake on Own Meme",
        description: "You cannot stake ICP on your own memes",
        variant: "destructive",
      });
      return;
    }

    // For now, this is a mock implementation
    // In a real implementation, this would:
    // 1. Check user's ICP balance
    // 2. Transfer ICP to a staking contract
    // 3. Update the meme's staked amount
    // 4. Provide staking rewards over time

    setHasStaked(!hasStaked);
    toast({
      title: hasStaked ? "Stake withdrawn" : "Staked! 💎",
      description: hasStaked
        ? "ICP stake withdrawn from this meme"
        : "Successfully staked 10 ICP on this meme! You'll earn rewards as it gains votes.",
    });
  };

  const handleCardClick = (e) => {
    // Prevent expansion if clicking on buttons
    if (e.target.closest('button')) return;
    setIsExpanded(!isExpanded);
  };

  return (
    <Card
      className={`group overflow-hidden transition-all duration-200 cursor-pointer ${hasVoted ? 'ring-2 ring-primary/20 bg-primary/5' : ''} ${isExpanded ? 'ring-2 ring-primary/50' : ''} ${isOwnMeme ? 'ring-2 ring-orange-500/30 bg-orange-500/5' : ''}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
          <div className="flex gap-1">
            {isOwnMeme && (
              <Badge variant="outline" className="text-xs border-orange-500 text-orange-600">
                <User className="h-3 w-3 mr-1" />
                Your Meme
              </Badge>
            )}
            {hasVoted && (
              <Badge variant="default" className="text-xs bg-primary">
                <Heart className="h-3 w-3 mr-1 fill-current" />
                Voted
              </Badge>
            )}
            {isViral && (
              <Badge variant="secondary" className="text-xs">
                <TrendingUp className="h-3 w-3 mr-1" />
                Viral
              </Badge>
            )}
            {isNFT && (
              <Badge variant="default" className="text-xs">
                <Crown className="h-3 w-3 mr-1" />
                NFT
              </Badge>
            )}
          </div>
        </div>
        <p className="text-sm text-muted-foreground">by @{creator}</p>
      </CardHeader>

      <CardContent className="pb-4">
        <div className="bg-muted rounded-lg overflow-hidden mb-4 relative group-hover:scale-[1.02] transition-transform duration-300">
          <img
            src={image}
            alt={title}
            className="w-full h-auto object-contain max-h-96"
          />
          <div className="absolute inset-0 bg-gradient-glow opacity-0 group-hover:opacity-30 transition-opacity duration-300" />
        </div>

        <div className="flex justify-between items-center text-sm">
          <div className="flex items-center gap-4">
            <span className="flex items-center gap-1">
              <Heart className="h-4 w-4" />
              {votes}
            </span>
            <span className="flex items-center gap-1">
              <Eye className="h-4 w-4" />
              {views}
            </span>
            <span className="flex items-center gap-1">
              <Coins className="h-4 w-4" />
              {stakeAmount} ICP
            </span>
          </div>
        </div>

        {/* Expanded Content */}
        {isExpanded && (
          <div className="mt-4 pt-4 border-t border-border">
            <div className="space-y-3">
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Prompt</h4>
                <p className="text-sm bg-muted/50 p-2 rounded-md">
                  {meme?.prompt || "No prompt available"}
                </p>
              </div>
              <div>
                <h4 className="text-sm font-medium text-muted-foreground mb-1">Owner</h4>
                <p className="text-sm bg-muted/50 p-2 rounded-md">
                  {creator}
                  {isOwnMeme && <span className="ml-2 text-xs text-primary">(You)</span>}
                </p>
              </div>
            </div>
          </div>
        )}
      </CardContent>

      <CardFooter className="pt-0 space-x-2">
        {/* Vote Button */}
        <Button
          variant={hasVoted ? "secondary" : "outline"}
          size="sm"
          onClick={handleVote}
          className="flex-1"
          disabled={isOwnMeme || hasVoted || loadingVoteStatus || isVoting}
          title={
            isOwnMeme
              ? "You cannot vote on your own memes"
              : hasVoted
              ? "You have already voted on this meme"
              : loadingVoteStatus
              ? "Checking vote status..."
              : isVoting
              ? "Voting in progress..."
              : "Click to vote on this meme"
          }
        >
          <Heart className={`h-4 w-4 mr-1 ${hasVoted ? "fill-current" : ""}`} />
          {isVoting ? (
            <>
              <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
              Voting...
            </>
          ) : loadingVoteStatus ? (
            <>
              <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
              Loading...
            </>
          ) : isOwnMeme ? (
            "Your Meme"
          ) : hasVoted ? (
            "Voted ✓"
          ) : (
            "Vote"
          )}
        </Button>

        {/* Refresh Vote Status Button (only show if there might be an issue) */}
        {(loadingVoteStatus || (!isOwnMeme && !hasVoted && isAuthenticated)) && (
          <Button
            variant="ghost"
            size="sm"
            onClick={(e) => {
              e.stopPropagation();
              console.log("Manually refreshing vote status");
              checkAndUpdateVoteStatus();
            }}
            className="px-2"
            title="Refresh vote status"
            disabled={loadingVoteStatus}
          >
            <div className="w-3 h-3 border border-current border-t-transparent rounded-full animate-spin" />
          </Button>
        )}

        {/* ICP Staking Button - Locks 10 ICP to support this meme and earn rewards */}
        <Button
          variant={hasStaked ? "default" : "glow"}
          size="sm"
          onClick={handleStake}
          className="flex-1"
          disabled={!isAuthenticated || isOwnMeme}
          title={isOwnMeme ? "Cannot stake on your own meme" : "Stake ICP to support this meme and earn rewards as it gains popularity"}
        >
          <Zap className="h-4 w-4 mr-1" />
          {isOwnMeme ? "Your Meme" : hasStaked ? "Staked (10 ICP)" : "Stake 10 ICP"}
        </Button>
      </CardFooter>
    </Card>
  );
};
