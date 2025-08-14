import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Badge } from "../components/ui/badge";
import { useNavigate } from "react-router";
import { TrendingUp, Zap, Users } from "lucide-react";


const Landing = () => {
  const navigate = useNavigate();

  const trendingMemes = [
    {
      id: 1,
      title: "Diamond Hands Doge",
      votes: 1250,
      creator: "CryptoMemer42",
    },
    { id: 2, title: "To The Moon Cat", votes: 980, creator: "MemeQueen" },
    { id: 3, title: "HODL Strong", votes: 875, creator: "DiamondHands" },
  ];

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center min-h-screen">
        {/* Background image */}
        <div className="absolute inset-0 bg-[url('/back2.gif')] bg-cover bg-center"></div>

        {/* Blur overlay */}
        <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>

        {/* Content */}
        <div className="relative z-10 max-w-4xl mx-auto pl-6">
          <h1 className="text-5xl  md:text-7xl font-black bg-gradient-hero bg-clip-text text-transparent mb-8 leading-tight">
            Create and Share Memes That Make the Internet Laugh
          </h1>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            Join the revolution where AI meets meme culture in a decentralized
            economy. Create, share, and earn from viral content.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button
              variant="hero"
              size="xl"
              onClick={() => navigate("/myplace")}
              className="w-full sm:w-auto border-2 p-2 bg-gradient-hero hero-button"
            >
              <Zap className="mr-2" />
              Create Meme
            </Button>

            <Button
              variant="glow"
              size="xl"
              onClick={() => navigate("/marketplace")}
              className="w-full sm:w-auto border-2 p-2 border-pink-400 hero-button"
            >
              <TrendingUp className="mr-2" />
              Marketplace
            </Button>
          </div>

          {/* Stats */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 max-w-2xl mx-auto">
            <div className="text-center">
              <div className="text-3xl font-bold text-primary">50K+</div>
              <div className="text-muted-foreground">Memes Created</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-secondary">15K+</div>
              <div className="text-muted-foreground">Active Creators</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-accent">1M+</div>
              <div className="text-muted-foreground">Total Votes</div>
            </div>
          </div>
        </div>
      </section>

      {/* Trending Memes Section */}
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <Badge variant="secondary" className="mb-4">
              <TrendingUp className="w-4 h-4 mr-2" />
              Trending Now
            </Badge>
            <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Viral Memes This Week
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            {trendingMemes.map((meme, index) => (
              <Card key={meme.id} className="group cursor-pointer">
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <Badge variant={index === 0 ? "default" : "outline"}>
                      #{index + 1}
                    </Badge>
                    <div className="flex items-center text-sm text-muted-foreground">
                      <Users className="w-4 h-4 mr-1" />
                      {meme.votes}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="aspect-square bg-gradient-glow rounded-lg mb-4 flex items-center justify-center">
                    <div className="text-6xl">🚀</div>
                  </div>
                  <CardTitle className="text-lg mb-2">{meme.title}</CardTitle>
                  <p className="text-sm text-muted-foreground">
                    by {meme.creator}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>

          <div className="text-center mt-12 ">
            <Button
              variant="outline"
              size="lg"
              onClick={() => navigate("/marketplace")}
              className="text-white hover:ease-in hover:text-amber-50"
            >
              View All Trending Memes
            </Button>
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="py-20 px-6 text-center">
        <div className="max-w-3xl mx-auto">
          <h2 className="text-4xl font-bold mb-6">
            Ready to Create Your First Viral Meme?
          </h2>
          <p className="text-xl text-muted-foreground mb-8">
            Join thousands of creators earning from their creativity in the
            world's first decentralized meme economy.
          </p>
          <Button
            variant="hero"
            size="xl"
            onClick={() => navigate("/myplace")}
            className="bg-primary p-3 hero-button"
          >
            Start Creating Now
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
