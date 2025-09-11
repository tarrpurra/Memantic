import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { useNavigate } from "react-router-dom";
import { TrendingUp, Zap, Users } from "../components/ui/Icon";
import { useAuth } from "../contexts/AuthContext";
import { Sparkles } from "lucide-react";

const Landing = () => {
  const navigate = useNavigate();
  const { principal, isLoading, isAuthenticated } = useAuth();

  const handleCreateClick = () => {
    if (!isAuthenticated) {
      navigate("/login");
    } else {
      navigate("/myplace");
    }
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Hero Section */}
      <section className="relative py-20 px-6 text-center min-h-screen">
        <div className="absolute inset-0 bg-[url('/back2.gif')] bg-cover bg-center"></div>
        <div className="absolute inset-0 backdrop-blur-md bg-black/20"></div>

        <div className="relative z-10 max-w-4xl mx-auto pl-6">
          <div className="flex items-center justify-center mb-8">
            <Sparkles className="w-12 h-12 md:w-16 md:h-16 text-primary mr-4" />
            <h1 className="text-5xl md:text-7xl font-black bg-gradient-hero bg-clip-text text-transparent leading-tight">
              Mementic – The Future of Meme Culture
            </h1>
          </div>

          <p className="text-xl md:text-2xl text-muted-foreground mb-12 max-w-2xl mx-auto">
            A decentralized platform where AI meets memes. Create, share, and
            earn from viral content while the community decides what deserves to
            become a collectible NFT.
          </p>

          <div className="flex flex-col sm:flex-row gap-6 justify-center items-center mb-16">
            <Button
              variant="hero"
              size="xl"
              onClick={handleCreateClick}
              className="w-full sm:w-auto border-2 p-2 bg-gradient-hero hero-button"
              disabled={isLoading}
            >
              <Zap className="mr-2" />
              {isLoading
                ? "Loading..."
                : isAuthenticated
                ? "Create Meme"
                : "Login to Create Meme"}
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
        </div>
      </section>
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto grid gap-8 md:grid-cols-3">
          <div className="md:col-span-2">
            <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Memes, owned.
            </h2>
            <p className="mt-4 text-muted-foreground">
              Mementic turns viral jokes into ownable, tradable digital
              assets—built on ICP. Create with AI, battle for upvotes, and mint
              winners as NFTs. Welcome to the meme economy.
            </p>
            <div className="mt-8 grid grid-cols-1 sm:grid-cols-3 gap-4">
              <div className="rounded-xl bg-card/60 p-4 border border-border">
                <div className="text-sm text-muted-foreground">Create</div>
                <div className="mt-1 font-semibold">AI Meme Studio</div>
              </div>
              <div className="rounded-xl bg-card/60 p-4 border border-border">
                <div className="text-sm text-muted-foreground">Compete</div>
                <div className="mt-1 font-semibold">Weekly Battles</div>
              </div>
              <div className="rounded-xl bg-card/60 p-4 border border-border">
                <div className="text-sm text-muted-foreground">Own</div>
                <div className="mt-1 font-semibold">NFT Minting & Auctions</div>
              </div>
            </div>
          </div>

          <div className="rounded-2xl bg-card p-6 border border-border">
            <h3 className="text-xl font-bold">Business Model</h3>
            <ul className="mt-4 space-y-3 text-sm text-muted-foreground">
              <li>• NFT auction fees (small %)</li>
              <li>• Sponsored meme contests (brands/DAOs)</li>
              <li>• Premium tools (boosts, analytics)</li>
            </ul>
          </div>
        </div>
      </section>
      <section className="py-16 px-6">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold">Traction</h2>
          <div className="mt-6 grid gap-6 sm:grid-cols-3">
            <div className="rounded-xl bg-card p-6 border border-border">
              <div className="text-3xl font-black">15</div>
              <div className="text-sm text-muted-foreground mt-1">
                Active creators in beta
              </div>
            </div>
            <div className="rounded-xl bg-card p-6 border border-border">
              <div className="text-3xl font-black">40</div>
              <div className="text-sm text-muted-foreground mt-1">
                Memes created (avg 2.7/user)
              </div>
            </div>
            <div className="rounded-xl bg-card p-6 border border-border">
              <div className="text-3xl font-black">53%</div>
              <div className="text-sm text-muted-foreground mt-1">
                Next-day retention
              </div>
            </div>
          </div>

          <div className="mt-8 grid gap-6 sm:grid-cols-2">
            <div className="rounded-2xl bg-card p-6 border border-border">
              <p className="text-sm italic">
                “This made my friends’ group chat go wild.”
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                — Beta User
              </div>
            </div>
            <div className="rounded-2xl bg-card p-6 border border-border">
              <p className="text-sm italic">
                “I’d happily mint the weekly winner.”
              </p>
              <div className="mt-2 text-xs text-muted-foreground">
                — Beta Creator
              </div>
            </div>
          </div>
        </div>
      </section>
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <h2 className="text-3xl font-bold">Roadmap</h2>
          <div className="mt-6 grid gap-6 md:grid-cols-3">
            <div className="rounded-2xl bg-card p-6 border border-border">
              <div className="text-sm uppercase tracking-wide text-muted-foreground">
                Short-term
              </div>
              <h3 className="mt-2 font-semibold">Ship & Smooth</h3>
              <ul className="mt-3 text-sm text-muted-foreground space-y-2">
                <li>• Auction & leaderboard polish</li>
                <li>• Faster image delivery</li>
                <li>• Anti-spam & rate limits</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-card p-6 border border-border">
              <div className="text-sm uppercase tracking-wide text-muted-foreground">
                Mid-term
              </div>
              <h3 className="mt-2 font-semibold">Grow Communities</h3>
              <ul className="mt-3 text-sm text-muted-foreground space-y-2">
                <li>• Hosted meme challenges (DAOs/brands)</li>
                <li>• Creator profiles & badges</li>
                <li>• Advanced AI tools (remix, presets)</li>
              </ul>
            </div>
            <div className="rounded-2xl bg-card p-6 border border-border">
              <div className="text-sm uppercase tracking-wide text-muted-foreground">
                Long-term
              </div>
              <h3 className="mt-2 font-semibold">Meme Layer of Web3</h3>
              <ul className="mt-3 text-sm text-muted-foreground space-y-2">
                <li>• ICP dApp/marketplace integrations</li>
                <li>• Portable meme identity</li>
                <li>• Culture primitives for Web3</li>
              </ul>
            </div>
          </div>
        </div>
      </section>
      {/* Roadmap Section */}
      <section className="py-16 px-6 bg-muted/20">
        <div className="max-w-6xl mx-auto">
          <div className="text-center mb-12">
            <div className="inline-flex items-center px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm mb-4">
              <TrendingUp className="w-4 h-4 mr-2" />
              Roadmap
            </div>
            <h2 className="text-4xl font-bold bg-gradient-primary bg-clip-text text-transparent">
              Our Journey Ahead
            </h2>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <Card>
              <CardHeader>
                <CardTitle>🚀 Beta Launch</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  AI-powered meme generator is live. Users can authenticate with
                  Internet Identity and start creating memes today.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🎭 Community Voting</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Upvote your favorite memes. Top 3 winners in each round will
                  be immortalized as NFTs on the Internet Computer.
                </p>
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>🌐 Future Plans</CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-muted-foreground">
                  Meme staking, creator rewards, and integration with major NFT
                  marketplaces. Building the world’s first meme economy.
                </p>
              </CardContent>
            </Card>
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
            Be part of the decentralized meme revolution. Your creativity could
            be the next viral NFT.
          </p>
          <Button
            variant="hero"
            size="xl"
            onClick={handleCreateClick}
            className="bg-primary p-3 hero-button"
            disabled={isLoading}
          >
            {isLoading
              ? "Loading..."
              : isAuthenticated
              ? "Start Creating Now"
              : "Login to Start Creating"}
          </Button>
        </div>
      </section>
    </div>
  );
};

export default Landing;
