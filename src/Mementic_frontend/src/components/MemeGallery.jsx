import { useState } from "react";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Button } from "../components/ui/Button";
import { TrendingUp, Crown, Flame, Filter } from "../components/ui/Icon";
import { MemeCard } from "./MemeCard";

// Mock data for demo
const mockMemes = [
  {
    id: "1",
    title: "When ICP hits $100 but you're still holding",
    imageUrl:
      "https://images.unsplash.com/photo-1518709268805-4e9042af2176?w=400&h=400&fit=crop",
    creator: "cryptokid",
    votes: 1250,
    stakeAmount: 45,
    isViral: true,
    isNFT: true,
  },
  {
    id: "2",
    title: "Me checking my portfolio at 3 AM",
    imageUrl:
      "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=400&h=400&fit=crop",
    creator: "moonlover",
    votes: 890,
    stakeAmount: 32,
    isViral: false,
    isNFT: false,
  },
  {
    id: "3",
    title: "When someone says blockchain is just a fad",
    imageUrl:
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop",
    creator: "degenmaster",
    votes: 670,
    stakeAmount: 28,
    isViral: true,
    isNFT: false,
  },
  {
    id: "4",
    title: "HODLing through the bear market like...",
    imageUrl:
      "https://images.unsplash.com/photo-1425082661705-1834bfd09dca?w=400&h=400&fit=crop",
    creator: "diamondhands",
    votes: 456,
    stakeAmount: 15,
    isViral: false,
    isNFT: true,
  },
  {
    id: "5",
    title: "When gas fees cost more than your transaction",
    imageUrl:
      "https://images.unsplash.com/photo-1543466835-00a7907e9de1?w=400&h=400&fit=crop",
    creator: "ethburner",
    votes: 1100,
    stakeAmount: 38,
    isViral: true,
    isNFT: false,
  },
  {
    id: "6",
    title: "Trying to explain DeFi to my parents",
    imageUrl:
      "https://images.unsplash.com/photo-1514888286974-6c03e2ca1dba?w=400&h=400&fit=crop",
    creator: "web3wizard",
    votes: 320,
    stakeAmount: 8,
    isViral: false,
    isNFT: false,
  },
];

export const MemeGallery = () => {
  return (
    <section className="py-20 px-6">
      <div className="max-w-6xl mx-auto">
        {/* Header */}
        <div className="text-center mb-12">
          <h2 className="text-4xl md:text-5xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-4">
            Trending Memes
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Vote, stake, and mint the most viral memes in the crypto space
          </p>
        </div>

        {/* Filter Tabs */}
        <div className="flex flex-wrap justify-center gap-4 mb-12">
          <Button variant="glow" className="gap-2">
            <Flame className="h-4 w-4" />
            Trending
          </Button>
          <Button variant="outline" className="gap-2">
            <TrendingUp className="h-4 w-4" />
            Most Voted
          </Button>
          <Button variant="outline" className="gap-2">
            <Crown className="h-4 w-4" />
            NFT Collection
          </Button>
          <Button variant="outline" className="gap-2">
            <Filter className="h-4 w-4" />
            All Memes
          </Button>
        </div>

        {/* Meme Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-12">
          {mockMemes.map((meme) => (
            <MemeCard key={meme.id} {...meme} />
          ))}
        </div>

        {/* Load More */}
        <div className="text-center">
          <Button variant="glow" size="lg">
            Load More Memes
          </Button>
        </div>

        {/* Weekly Highlights */}
        <div className="mt-20">
          <Card className="p-8 border-primary/20">
            <CardHeader className="text-center pb-6">
              <CardTitle className="text-2xl bg-gradient-secondary bg-clip-text text-transparent">
                🏆 This Week's Viral Champions
              </CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="text-center p-6 bg-card/50 rounded-lg border border-primary/10">
                  <div className="text-3xl mb-2">🥇</div>
                  <h3 className="font-semibold mb-1">Most Voted</h3>
                  <p className="text-sm text-muted-foreground">
                    When ICP hits $100...
                  </p>
                  <p className="text-primary font-bold mt-2">1,250 votes</p>
                </div>

                <div className="text-center p-6 bg-card/50 rounded-lg border border-secondary/10">
                  <div className="text-3xl mb-2">🥈</div>
                  <h3 className="font-semibold mb-1">Highest Stake</h3>
                  <p className="text-sm text-muted-foreground">
                    When someone says blockchain...
                  </p>
                  <p className="text-secondary font-bold mt-2">45 ICP staked</p>
                </div>

                <div className="text-center p-6 bg-card/50 rounded-lg border border-accent/10">
                  <div className="text-3xl mb-2">🥉</div>
                  <h3 className="font-semibold mb-1">Fresh NFT</h3>
                  <p className="text-sm text-muted-foreground">
                    HODLing through bear market...
                  </p>
                  <p className="text-accent font-bold mt-2">Newly Minted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </section>
  );
};
