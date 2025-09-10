import { useState, useEffect } from "react";
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
  Share2,
  TrendingUp,
  Coins,
  Crown,
  Zap,
} from "../components/ui/Icon";
import { useToast } from "../hooks/use-toast";
import backendService from "../services/backendService";

export const MemeCard = ({ meme, onVote, onShare, isAuthenticated, currentUserPrincipal }) => {
  const [hasVoted, setHasVoted] = useState(false);
  const [hasStaked, setHasStaked] = useState(false);
  const [isOwnMeme, setIsOwnMeme] = useState(false);
  const [loadingVoteStatus, setLoadingVoteStatus] = useState(false);
  const [isVoting, setIsVoting] = useState(false);
  const [isExpanded, setIsExpanded] = useState(false);
  const { toast } = useToast();

  // Support both snake_case (backend) and camelCase (legacy)
  const {
    title = "Untitled Meme",
    creator = "Anonymous",
    votes = 0,
    stakeAmount = 0,
    isViral = false,
    isNFT = false,
  } = meme || {};
  const image = meme?.image_url || meme?.imageUrl || "";
  const memeId = meme?.id || meme?.meme_id;

  // Check user's vote status and ownership on component mount
  useEffect(() => {
    const checkVoteStatus = async () => {
      if (!isAuthenticated || !memeId) return;

      setLoadingVoteStatus(true);
      try {
        // Check if this is the user's own meme first (this is faster)
        if (currentUserPrincipal && meme?.owner) {
          // Handle both Principal objects and string representations
          const ownerText = typeof meme.owner === 'object' && meme.owner.toText
            ? meme.owner.toText()
            : String(meme.owner);
          setIsOwnMeme(currentUserPrincipal === ownerText);
        } else if (currentUserPrincipal && meme?.creator) {
          // Fallback to creator field if owner is not available
          setIsOwnMeme(currentUserPrincipal === String(meme.creator));
        }

        // Only check vote status if it's not the user's own meme
        if (!isOwnMeme) {
          // Convert string ID to BigInt for backend call
          const memeIdBigInt = BigInt(memeId);
          const userVote = await backendService.getUserVote(memeIdBigInt);
          if (userVote) {
            setHasVoted(true);
          }
        }
      } catch (error) {
        console.error("Failed to check vote status:", error);
        // Don't show error toast for vote status check failures
      } finally {
        setLoadingVoteStatus(false);
      }
    };

    checkVoteStatus();
  }, [isAuthenticated, memeId, currentUserPrincipal, meme?.owner, meme?.creator]);

  const handleVote = async () => {
    if (!isAuthenticated) {
      toast({
        title: "Authentication Required",
        description: "Please login to vote on memes",
        variant: "destructive",
      });
      return;
    }

    if (isOwnMeme) {
      toast({
        title: "Cannot Vote",
        description: "You cannot vote on your own memes",
        variant: "destructive",
      });
      return;
    }

    if (hasVoted) {
      toast({
        title: "Already Voted",
        description: "You have already voted on this meme",
        variant: "destructive",
      });
      return;
    }

    if (onVote && memeId != null) {
      setIsVoting(true);
      try {
        // Pass owner information for self-voting prevention
        const owner = meme?.owner || meme?.creator;
        await onVote(memeId, votes || 0, owner);
        setHasVoted(true);
        // Success toast is handled by parent component (Marketplace)
      } catch (error) {
        // Error handling is done in the parent component
        console.error("Vote failed:", error);
      } finally {
        setIsVoting(false);
      }
    } else {
      toast({
        title: "Action unavailable",
        description: "Voting is not enabled for this card",
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
      className={`group overflow-hidden transition-all duration-200 cursor-pointer ${hasVoted ? 'ring-2 ring-primary/20 bg-primary/5' : ''} ${isExpanded ? 'ring-2 ring-primary/50' : ''}`}
      onClick={handleCardClick}
    >
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
          <div className="flex gap-1">
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
        <div className="aspect-square bg-muted rounded-lg overflow-hidden mb-4 relative group-hover:scale-[1.02] transition-transform duration-300">
          <img
            src={image}
            alt={title}
            className="w-full h-full object-cover"
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
              <Coins className="h-4 w-4" />
              {stakeAmount} ICP
            </span>
          </div>
          <Button variant="ghost" size="sm">
            <Share2 className="h-4 w-4" />
          </Button>
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
        >
          <Heart className={`h-4 w-4 mr-1 ${hasVoted ? "fill-current" : ""}`} />
          {isVoting ? (
            <>
              <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
              Voting...
            </>
          ) : loadingVoteStatus ? (
            "Loading..."
          ) : isOwnMeme ? (
            "Your Meme"
          ) : hasVoted ? (
            "Voted"
          ) : (
            "Vote"
          )}
        </Button>

        {/* ICP Staking Button - Locks 10 ICP to support this meme and earn rewards */}
        <Button
          variant={hasStaked ? "default" : "glow"}
          size="sm"
          onClick={handleStake}
          className="flex-1"
          disabled={!isAuthenticated}
          title="Stake ICP to support this meme and earn rewards as it gains popularity"
        >
          <Zap className="h-4 w-4 mr-1" />
          {hasStaked ? "Staked (10 ICP)" : "Stake 10 ICP"}
        </Button>
      </CardFooter>
    </Card>
  );
};
