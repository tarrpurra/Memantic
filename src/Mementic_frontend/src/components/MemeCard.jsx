import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardFooter, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useToast } from "../hooks/use-toast";
import { Heart, Share2, TrendingUp, Coins, Crown, Zap } from "lucide-react";


export const MemeCard = ({ 
  title, 
  imageUrl, 
  creator, 
  votes, 
  stakeAmount, 
  isViral = false,
  isNFT = false 
})=> {
  const [hasVoted, setHasVoted] = useState(false);
  const [hasStaked, setHasStaked] = useState(false);
  const { toast } = useToast();

  const handleVote = () => {
    setHasVoted(!hasVoted);
    toast({
      title: hasVoted ? "Vote removed" : "Voted! 🚀",
      description: hasVoted ? "Your vote has been removed" : "Supporting this meme for viral status!",
    });
  };

  const handleStake = () => {
    setHasStaked(!hasStaked);
    toast({
      title: hasStaked ? "Stake withdrawn" : "Staked! 💎",
      description: hasStaked ? "ICP stake withdrawn" : "Backing this meme with 10 ICP!",
    });
  };

  return (
    <Card className="group overflow-hidden">
      <CardHeader className="pb-3">
        <div className="flex justify-between items-start">
          <CardTitle className="text-lg line-clamp-2">{title}</CardTitle>
          <div className="flex gap-1">
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
            src={imageUrl} 
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
      </CardContent>

      <CardFooter className="pt-0 space-x-2">
        <Button
          variant={hasVoted ? "secondary" : "outline"}
          size="sm"
          onClick={handleVote}
          className="flex-1"
        >
          <Heart className={`h-4 w-4 mr-1 ${hasVoted ? 'fill-current' : ''}`} />
          {hasVoted ? 'Voted' : 'Vote'}
        </Button>
        
        <Button
          variant={hasStaked ? "default" : "glow"}
          size="sm"
          onClick={handleStake}
          className="flex-1"
        >
          <Zap className="h-4 w-4 mr-1" />
          {hasStaked ? 'Staked' : 'Stake ICP'}
        </Button>
      </CardFooter>
    </Card>
  );
};