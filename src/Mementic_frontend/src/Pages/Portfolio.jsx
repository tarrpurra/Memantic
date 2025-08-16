// import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "../components/ui/tabs";
import { useNavigate } from "react-router";
import { useAuth } from "../hooks/useAuth";
import { 
  ArrowLeft, 
  Wallet, 
  TrendingUp, 
  Clock, 
  DollarSign,
  Eye,
  Heart,
  Share2,
  LogOut,
  User,
  Settings
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useEffect } from "react";

const Portfolio = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { principal, logout, isAuthenticated, isLoading } = useAuth();

  // Redirect if not authenticated
  useEffect(() => {
    if (!isLoading && !isAuthenticated) {
      console.log("User not authenticated, redirecting to login");
      navigate("/login");
    }
  }, [isAuthenticated, isLoading, navigate]);

  const handleLogout = async () => {
    try {
      const success = await logout();
      if (success) {
        toast({
          title: "Logged Out Successfully 👋",
          description: "You have been safely logged out of your account.",
        });
        navigate("/");
      } else {
        toast({
          title: "Logout Error",
          description: "There was an issue logging out. Please try again.",
          variant: "destructive",
        });
      }
    } catch (error) {
      console.error("Logout error:", error);
      toast({
        title: "Logout Error",
        description: "An unexpected error occurred during logout.",
        variant: "destructive",
      });
    }
  };

  const myNFTs = [
    { 
      id: 1, 
      title: "Rocket Moon Journey", 
      emoji: "🚀", 
      votes: 1250, 
      earned: "45.2 ICP",
      status: "earning",
      views: 15420
    },
    { 
      id: 2, 
      title: "Crypto Cat Wisdom", 
      emoji: "🐱", 
      votes: 890, 
      earned: "32.1 ICP",
      status: "earning",
      views: 8950
    },
    { 
      id: 3, 
      title: "DeFi Summer Vibes", 
      emoji: "☀️", 
      votes: 650, 
      earned: "18.7 ICP",
      status: "earning",
      views: 5430
    },
    { 
      id: 4, 
      title: "AI Robot Learning", 
      emoji: "🤖", 
      votes: 420, 
      earned: "12.3 ICP",
      status: "selling",
      views: 3210
    },
  ];

  const auctionListings = [
    {
      id: 5,
      title: "Diamond Hands Forever",
      emoji: "💎",
      currentBid: "150 ICP",
      timeLeft: "2d 14h",
      bidders: 8,
      status: "active"
    },
    {
      id: 6,
      title: "To The Moon Baby",
      emoji: "🌙",
      currentBid: "89 ICP",
      timeLeft: "5h 32m",
      bidders: 12,
      status: "ending"
    },
    {
      id: 7,
      title: "Web3 Revolution",
      emoji: "🌐",
      currentBid: "0 ICP",
      timeLeft: "7d 2h",
      bidders: 0,
      status: "new"
    }
  ];

  const handleSell = (nftId) => {
    toast({
      title: "NFT Listed for Sale! 📈",
      description: "Your meme is now available on the marketplace.",
    });
  };

  const handleKeep = (nftId) => {
    toast({
      title: "NFT Kept in Portfolio 💎",
      description: "Your meme will continue earning from votes.",
    });
  };

  const totalEarnings = myNFTs.reduce((sum, nft) => sum + parseFloat(nft.earned.split(' ')[0]), 0);

  // Show loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background flex items-center justify-center">
        <div className="text-center">
          <div className="w-8 h-8 border-4 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <div className="text-lg text-muted-foreground">Loading your portfolio...</div>
        </div>
      </div>
    );
  }

  // Don't render if not authenticated (useEffect will handle redirect)
  if (!isAuthenticated) {
    return null;
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <Button variant="ghost" size="icon" onClick={() => navigate("/marketplace")}>
                <ArrowLeft className="w-5 h-5" />
              </Button>
              <div>
                <h1 className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent">
                  My Portfolio
                </h1>
                <p className="text-muted-foreground">Manage your meme NFTs and earnings</p>
              </div>
            </div>
            
            {/* User Info and Logout Section */}
            <div className="flex items-center gap-4">
              <Badge variant="secondary" className="text-lg px-4 py-2">
                <Wallet className="w-4 h-4 mr-2" />
                {totalEarnings.toFixed(1)} ICP Total
              </Badge>
              
              {/* User Menu */}
              <div className="flex items-center gap-2">
                {/* User Info */}
                <div className="hidden sm:flex items-center gap-2 px-3 py-2 bg-muted/20 rounded-lg">
                  <User className="w-4 h-4 text-muted-foreground" />
                  <span className="text-sm font-mono text-muted-foreground">
                    {principal ? `${principal.slice(0, 8)}...${principal.slice(-4)}` : 'Unknown'}
                  </span>
                </div>
                
                {/* Logout Button */}
                <Button 
                  variant="outline" 
                  size="sm"
                  onClick={handleLogout}
                  className="text-red-600 border-red-200 hover:bg-red-50 hover:text-red-700 hover:border-red-300"
                >
                  <LogOut className="w-4 h-4 mr-2" />
                  <span className="hidden sm:inline">Logout</span>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-6 py-8">
        {/* Account Info Card - Mobile */}
        <Card className="mb-6 sm:hidden">
          <CardContent className="p-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <User className="w-5 h-5 text-muted-foreground" />
                <div>
                  <p className="text-sm font-medium">Logged in as:</p>
                  <p className="text-xs font-mono text-muted-foreground">
                    {principal ? `${principal.slice(0, 12)}...${principal.slice(-6)}` : 'Unknown'}
                  </p>
                </div>
              </div>
              <Button 
                variant="outline" 
                size="sm"
                onClick={handleLogout}
                className="text-red-600 bg-gradient-to-t from-red-500 to-red-50  border-red-200 hero-button">
                <LogOut className="w-4 h-4 mr-2  " />
                Logout
              </Button>
            </div>
          </CardContent>
        </Card>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
          <Card>
            <CardContent className="p-6 text-center">
              <DollarSign className="w-8 h-8 mx-auto mb-2 text-primary" />
              <div className="text-2xl font-bold">{totalEarnings.toFixed(1)} ICP</div>
              <p className="text-sm text-muted-foreground">Total Earned</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Heart className="w-8 h-8 mx-auto mb-2 text-red-500" />
              <div className="text-2xl font-bold">{myNFTs.reduce((sum, nft) => sum + nft.votes, 0)}</div>
              <p className="text-sm text-muted-foreground">Total Votes</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <Eye className="w-8 h-8 mx-auto mb-2 text-blue-500" />
              <div className="text-2xl font-bold">{myNFTs.reduce((sum, nft) => sum + nft.views, 0).toLocaleString()}</div>
              <p className="text-sm text-muted-foreground">Total Views</p>
            </CardContent>
          </Card>
          <Card>
            <CardContent className="p-6 text-center">
              <TrendingUp className="w-8 h-8 mx-auto mb-2 text-green-500" />
              <div className="text-2xl font-bold">{myNFTs.length}</div>
              <p className="text-sm text-muted-foreground">Active NFTs</p>
            </CardContent>
          </Card>
        </div>

        <Tabs defaultValue="nfts" className="space-y-6">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="nfts">My NFTs</TabsTrigger>
            <TabsTrigger value="auctions">Auction Listings</TabsTrigger>
          </TabsList>

          <TabsContent value="nfts" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">My Meme NFTs</h2>
              <Button onClick={() => navigate("/myplace")}>
                Create New Meme
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {myNFTs.map((nft) => (
                <Card key={nft.id} className="group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge variant={nft.status === "earning" ? "default" : "secondary"}>
                        {nft.status === "earning" ? "Earning" : "For Sale"}
                      </Badge>
                      <Button variant="ghost" size="icon">
                        <Share2 className="w-4 h-4" />
                      </Button>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-6xl mb-4 group-hover:animate-float">{nft.emoji}</div>
                      <h3 className="font-bold text-lg mb-2">{nft.title}</h3>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Votes:</span>
                        <span className="font-medium">{nft.votes}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Views:</span>
                        <span className="font-medium">{nft.views.toLocaleString()}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Earned:</span>
                        <span className="font-bold text-primary">{nft.earned}</span>
                      </div>
                    </div>

                    <div className="flex gap-2">
                      <Button 
                        variant="outline" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleSell(nft.id)}
                      >
                        Sell
                      </Button>
                      <Button 
                        variant="default" 
                        size="sm" 
                        className="flex-1"
                        onClick={() => handleKeep(nft.id)}
                      >
                        Keep
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>

          <TabsContent value="auctions" className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-2xl font-bold">Auction Listings</h2>
              <Button variant="outline">
                Create Auction
              </Button>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {auctionListings.map((auction) => (
                <Card key={auction.id} className="group">
                  <CardHeader>
                    <div className="flex items-center justify-between">
                      <Badge 
                        variant={
                          auction.status === "active" ? "default" : 
                          auction.status === "ending" ? "destructive" : "secondary"
                        }
                      >
                        {auction.status === "ending" ? "Ending Soon" : 
                         auction.status === "active" ? "Active" : "New"}
                      </Badge>
                      <div className="flex items-center text-sm text-muted-foreground">
                        <Clock className="w-4 h-4 mr-1" />
                        {auction.timeLeft}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="text-center">
                      <div className="text-6xl mb-4 group-hover:animate-float">{auction.emoji}</div>
                      <h3 className="font-bold text-lg mb-2">{auction.title}</h3>
                    </div>

                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Current Bid:</span>
                        <span className="font-bold text-primary">{auction.currentBid}</span>
                      </div>
                      <div className="flex justify-between">
                        <span className="text-muted-foreground">Bidders:</span>
                        <span className="font-medium">{auction.bidders}</span>
                      </div>
                    </div>

                    <Button variant="outline" size="sm" className="w-full">
                      View Auction
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
};

export default Portfolio;