import { Button } from "../components/ui/Button";
import { Card } from "../components/ui/Card";
import { Sparkles, TrendingUp, Coins, Zap } from "../components/ui/Icon";
// import memeMascot from "@/assets/meme-mascot.png";
// import heroBg from "@/assets/hero-bg.jpg";

export const HeroSection = () => {
  return (
    <section className="relative min-h-screen flex items-center justify-center overflow-hidden">
      {/* Background */}
      {/* <div 
        className="absolute inset-0 bg-cover bg-center bg-no-repeat"
        style={{ backgroundImage: `url(${heroBg})` }}
      /> */}
      <div className="absolute inset-0 bg-gradient-to-b from-background/80 via-background/60 to-background/80" />

      {/* Floating Elements */}
      <div className="absolute top-20 left-10 animate-float">
        <div className="w-16 h-16 bg-gradient-primary rounded-full opacity-20 blur-xl" />
      </div>
      <div
        className="absolute bottom-32 right-16 animate-float"
        style={{ animationDelay: "1s" }}
      >
        <div className="w-24 h-24 bg-gradient-secondary rounded-full opacity-20 blur-xl" />
      </div>

      {/* Main Content */}
      <div className="relative z-10 max-w-6xl mx-auto px-6 text-center">
        <div className="flex justify-center mb-8 animate-slide-up">
          {/* <img 
            src={memeMascot} 
            alt="Mementic Mascot"
            className="w-32 h-32 animate-float filter drop-shadow-lg"
          /> */}
        </div>

        <div
          className="space-y-6 animate-slide-up"
          style={{ animationDelay: "0.2s" }}
        >
          <h1 className="text-6xl md:text-8xl font-bold bg-gradient-hero bg-clip-text text-transparent leading-tight">
            MEMENTIC
          </h1>

          <p className="text-xl md:text-2xl text-foreground/80 max-w-3xl mx-auto leading-relaxed">
            <span className="text-primary font-semibold">
              Decentralized Meme Economy
            </span>
            <br />
            Built for creators. Powered by culture. Minted on-chain.
          </p>

          <div className="flex flex-wrap justify-center gap-4 text-sm md:text-base">
            <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-full">
              <Sparkles className="h-4 w-4 text-primary" />
              <span>AI-Generated Memes</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-full">
              <TrendingUp className="h-4 w-4 text-secondary" />
              <span>Community Voting</span>
            </div>
            <div className="flex items-center gap-2 px-4 py-2 bg-card/50 backdrop-blur-sm rounded-full">
              <Coins className="h-4 w-4 text-accent" />
              <span>NFT Minting</span>
            </div>
          </div>
        </div>

        <div
          className="flex flex-col sm:flex-row gap-4 justify-center mt-12 animate-slide-up"
          style={{ animationDelay: "0.4s" }}
        >
          <Button variant="hero" size="xl" className="group">
            <Zap className="h-5 w-5 mr-2 group-hover:rotate-12 transition-transform" />
            Start Creating Memes
          </Button>
          <Button variant="glow" size="xl">
            <TrendingUp className="h-5 w-5 mr-2" />
            Explore Gallery
          </Button>
        </div>

        {/* Stats Cards */}
        <div
          className="grid grid-cols-1 md:grid-cols-3 gap-6 mt-16 animate-slide-up"
          style={{ animationDelay: "0.6s" }}
        >
          <Card className="p-6 text-center border-primary/20">
            <div className="text-3xl font-bold bg-gradient-primary bg-clip-text text-transparent mb-2">
              10K+
            </div>
            <p className="text-sm text-muted-foreground">Memes Generated</p>
          </Card>

          <Card className="p-6 text-center border-secondary/20">
            <div className="text-3xl font-bold bg-gradient-secondary bg-clip-text text-transparent mb-2">
              500+
            </div>
            <p className="text-sm text-muted-foreground">NFTs Minted</p>
          </Card>

          <Card className="p-6 text-center border-accent/20">
            <div className="text-3xl font-bold text-accent mb-2">2.5K ICP</div>
            <p className="text-sm text-muted-foreground">Total Staked</p>
          </Card>
        </div>
      </div>
    </section>
  );
};
