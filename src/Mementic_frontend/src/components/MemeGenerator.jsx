import { useState } from "react";
import { Button } from "../components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/card";
import { Input } from "../components/ui/input";
import { Textarea } from "../components/ui/textarea";
import { useToast } from "../hooks/use-toast";
import { Sparkles, Zap, TrendingUp } from "lucide-react";

export const MemeGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [isGenerating, setIsGenerating] = useState(false);
  const { toast } = useToast();

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Enter a meme prompt",
        description: "Describe the meme you want to create!",
        variant: "destructive",
      });
      return;
    }

    setIsGenerating(true);
    
    // Simulate AI generation
    setTimeout(() => {
      setIsGenerating(false);
      toast({
        title: "Meme Generated! 🎉",
        description: "Your viral meme is ready for staking!",
      });
    }, 3000);
  };

  return (
    <Card className="w-full max-w-2xl mx-auto">
      <CardHeader>
        <CardTitle className="flex items-center gap-2 text-2xl bg-gradient-primary bg-clip-text text-transparent">
          <Sparkles className="h-6 w-6 text-primary animate-pulse-glow" />
          AI Meme Generator
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="space-y-2">
          <label htmlFor="prompt" className="text-sm font-medium">
            Meme Prompt
          </label>
          <Textarea
            id="prompt"
            placeholder="When crypto goes to the moon but you sold too early..."
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            className="min-h-[100px] bg-background/50 border-border focus:border-primary transition-colors"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <Card className="p-4 border-primary/20">
            <div className="flex items-center gap-2">
              <Zap className="h-4 w-4 text-secondary" />
              <span className="text-sm font-medium">AI Powered</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Advanced meme generation using latest AI models
            </p>
          </Card>
          
          <Card className="p-4 border-primary/20">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-4 w-4 text-accent" />
              <span className="text-sm font-medium">Viral Ready</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Optimized for maximum memetic potential
            </p>
          </Card>
          
          <Card className="p-4 border-primary/20">
            <div className="flex items-center gap-2">
              <Sparkles className="h-4 w-4 text-primary" />
              <span className="text-sm font-medium">NFT Mintable</span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Top memes become valuable NFTs
            </p>
          </Card>
        </div>

        <Button
          variant="hero"
          size="xl"
          onClick={handleGenerate}
          disabled={isGenerating}
          className="w-full"
        >
          {isGenerating ? (
            <>
              <div className="animate-spin h-5 w-5 border-2 border-background border-t-transparent rounded-full" />
              Generating Meme...
            </>
          ) : (
            <>
              <Sparkles className="h-5 w-5" />
              Generate Viral Meme
            </>
          )}
        </Button>
      </CardContent>
    </Card>
  );
};