import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Input } from "../components/ui/input";
import { useNavigate } from "react-router";
import { 
  ArrowUp, 
  Search, 
  Filter, 
  Trophy, 
  Timer, 
  User, 
  TrendingUp,
  Crown,
  Sparkles
} from "lucide-react";

const Marketplace = () => {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");

  // Mock countdown timer (7 days from now)
  const timeLeft = "6d 14h 32m";

  const topMemes = [
    { id: 1, title: "Diamond Hands Forever", creator: "CryptoKing", votes: 2840, emoji: "💎", rank: 1 },
    { id: 2, title: "To The Moon Baby", creator: "MoonWalker", votes: 2650, emoji: "🚀", rank: 2 },
    { id: 3, title: "HODL Strong Together", creator: "DiamondQueen", votes: 2420, emoji: "🙌", rank: 3 },
  ];

  const allMemes = [
    { id: 4, title: "AI Robot Learning Memes", creator: "TechMemer", votes: 1850, emoji: "🤖" },
    { id: 5, title: "Web3 Explained Simply", creator: "SimplifyGuru", votes: 1620, emoji: "🌐" },
    { id: 6, title: "NFT Collection Goals", creator: "ArtCollector", votes: 1480, emoji: "🎨" },
    { id: 7, title: "Blockchain for Beginners", creator: "CryptoTeacher", votes: 1350, emoji: "⛓️" },
    { id: 8, title: "DeFi Summer Vibes", creator: "DeFiExplorer", votes: 1200, emoji: "☀️" },
    { id: 9, title: "Smart Contract Humor", creator: "CodeComedy", votes: 1150, emoji: "📝" },
    { id: 10, title: "Gas Fees Reality Check", creator: "EthereumMemer", votes: 980, emoji: "⛽" },
    { id: 11, title: "Metaverse Adventures", creator: "VRExplorer", votes: 890, emoji: "🥽" },
    { id: 12, title: "Crypto Winter Survival", creator: "WinterWarrior", votes: 750, emoji: "❄️" },
  ];

  const handleVote = (memeId) => {
    console.log(`Voted for meme ${memeId}`);
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
            <div>
              <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                Meme Marketplace
              </h1>
              <p className="text-muted-foreground">Discover and vote on viral content</p>
            </div>
            <div className="flex items-center gap-3">
              <Button variant="outline" onClick={() => navigate("/portfolio")}>
                <User className="w-4 h-4 mr-2" />
                My Portfolio
              </Button>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Search and Filters */}
        <div className="flex flex-col sm:flex-row gap-4 mb-8">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-muted-foreground w-4 h-4" />
            <Input
              placeholder="Search memes..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="pl-10"
            />
          </div>
          <Button variant="outline">
            <Filter className="w-4 h-4 mr-2" />
            Filters
          </Button>
        </div>

        {/* Top 3 Memes Section */}
        <Card className="mb-8 bg-gradient-glow border-primary/30">
          <CardHeader>
            <div className="flex items-center justify-between">
              <CardTitle className="flex items-center gap-2 text-2xl">
                <Trophy className="w-6 h-6 text-yellow-500" />
                Top 3 Memes of the Week
              </CardTitle>
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Timer className="w-4 h-4" />
                <span>Ends in {timeLeft}</span>
              </div>
            </div>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
              {topMemes.map((meme) => (
                <Card key={meme.id} className="relative overflow-hidden">
                  {meme.rank === 1 && (
                    <div className="absolute top-2 left-2">
                      <Crown className="w-6 h-6 text-yellow-500" />
                    </div>
                  )}
                  <CardContent className="p-6">
                    <div className="text-center">
                      <Badge 
                        variant={meme.rank === 1 ? "default" : "secondary"} 
                        className="mb-4"
                      >
                        #{meme.rank}
                      </Badge>
                      <div className="text-6xl mb-4">{meme.emoji}</div>
                      <h3 className="font-bold text-lg mb-2">{meme.title}</h3>
                      <p className="text-sm text-muted-foreground mb-4">by {meme.creator}</p>
                      <div className="flex items-center justify-center gap-2">
                        <Button size="sm" variant="outline" onClick={() => handleVote(meme.id)}>
                          <ArrowUp className="w-4 h-4 mr-1" />
                          {meme.votes}
                        </Button>
                      </div>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>

        {/* All Memes Grid */}
        <div className="mb-6">
          <h2 className="text-2xl font-bold mb-4 flex items-center gap-2">
            <TrendingUp className="w-6 h-6" />
            All Memes
          </h2>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-6">
          {allMemes
            .filter(meme => 
              meme.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
              meme.creator.toLowerCase().includes(searchQuery.toLowerCase())
            )
            .map((meme) => (
            <Card key={meme.id} className="group hover:shadow-glow transition-all duration-300">
              <CardContent className="p-6">
                <div className="text-center">
                  <div className="text-5xl mb-4 group-hover:animate-float">{meme.emoji}</div>
                  <h3 className="font-bold text-lg mb-2 line-clamp-2">{meme.title}</h3>
                  <div className="flex items-center justify-center gap-1 text-sm text-muted-foreground mb-4">
                    <User className="w-3 h-3" />
                    <span>{meme.creator}</span>
                  </div>
                  <Button 
                    size="sm" 
                    variant="outline" 
                    className="w-full"
                    onClick={() => handleVote(meme.id)}
                  >
                    <ArrowUp className="w-4 h-4 mr-2" />
                    {meme.votes} votes
                  </Button>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>

        {/* Load More */}
        <div className="text-center mt-12">
          <Button variant="outline" size="lg">
            <Sparkles className="w-4 h-4 mr-2" />
            Load More Memes
          </Button>
        </div>
      </div>
    </div>
  );
};

export default Marketplace;