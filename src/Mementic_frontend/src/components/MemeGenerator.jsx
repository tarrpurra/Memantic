import { useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import {
  Sparkles,
  Zap,
  TrendingUp,
  AlertCircle,
  Download,
  Share2,
  Image,
} from "../components/ui/Icon";
import { useAuth } from "../contexts/AuthContext";
import { useMemeGeneration } from "../hooks/useMemeGeneration";

// Enhanced Image Display Component
const MemeImageDisplay = ({ generatedMeme, onClear }) => {
  const [imageLoading, setImageLoading] = useState(true);
  const [imageError, setImageError] = useState(false);

  const handleImageLoad = () => {
    setImageLoading(false);
    setImageError(false);
  };

  const handleImageError = () => {
    setImageLoading(false);
    setImageError(true);
  };

  const handleDownload = async () => {
    try {
      const response = await fetch(generatedMeme.image_url);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const link = document.createElement("a");
      link.href = url;
      link.download = generatedMeme.image_filename || `meme_${Date.now()}.jpg`;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
    } catch (error) {
      console.error("Download failed:", error);
    }
  };

  const handleShare = async () => {
    if (navigator.share) {
      try {
        await navigator.share({
          title: "Check out this meme!",
          text: generatedMeme.prompt,
          url: generatedMeme.image_url,
        });
      } catch (error) {
        console.error("Share failed:", error);
      }
    } else {
      // Fallback: copy to clipboard
      try {
        await navigator.clipboard.writeText(generatedMeme.image_url);
        alert("Image URL copied to clipboard!");
      } catch (error) {
        console.error("Copy failed:", error);
      }
    }
  };

  return (
    <div className="mt-6 p-4 border border-primary/20 rounded-lg bg-primary/5">
      <div className="flex items-center justify-between mb-3">
        <h3 className="text-lg font-semibold flex items-center gap-2">
          <Sparkles className="h-5 w-5 text-primary" />
          Generated Meme
        </h3>
        <Button
          variant="outline"
          size="sm"
          onClick={onClear}
          className="text-xs"
        >
          Generate Another
        </Button>
      </div>

      <div className="space-y-4">
        {/* Prompt Display */}
        <div>
          <span className="text-sm font-medium">Prompt:</span>
          <p className="text-sm text-muted-foreground bg-background/50 p-2 rounded border">
            {generatedMeme.prompt}
          </p>
        </div>

        {/* Image Display with Loading and Error States */}
        {generatedMeme.image_url && (
          <div>
            <span className="text-sm font-medium">Generated Image:</span>
            <div className="mt-2 relative">
              {/* Loading Spinner */}
              {imageLoading && (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-border">
                  <div className="flex flex-col items-center gap-2">
                    <div className="animate-spin h-8 w-8 border-2 border-primary border-t-transparent rounded-full" />
                    <p className="text-sm text-muted-foreground">
                      Loading image...
                    </p>
                  </div>
                </div>
              )}

              {/* Error State */}
              {imageError && (
                <div className="flex items-center justify-center h-64 bg-muted rounded-lg border border-destructive/20">
                  <div className="flex flex-col items-center gap-2 text-destructive">
                    <Image className="h-8 w-8" />
                    <p className="text-sm">Failed to load image</p>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => {
                        setImageError(false);
                        setImageLoading(true);
                      }}
                    >
                      Retry
                    </Button>
                  </div>
                </div>
              )}

              {/* Actual Image */}
              <img
                src={generatedMeme.image_url}
                alt={`Generated meme: ${generatedMeme.prompt}`}
                crossOrigin="anonymous"
                className={`max-w-full h-auto rounded-lg border border-border transition-opacity duration-200 ${
                  imageLoading || imageError
                    ? "opacity-0 absolute"
                    : "opacity-100"
                }`}
                onLoad={handleImageLoad}
                onError={handleImageError}
                loading="lazy"
              />
            </div>

            {/* Action Buttons */}
            <div className="flex gap-2 mt-3">
              <Button
                variant="outline"
                size="sm"
                onClick={handleDownload}
                className="flex items-center gap-1"
              >
                <Download className="h-4 w-4" />
                Download
              </Button>
              <Button
                variant="outline"
                size="sm"
                onClick={handleShare}
                className="flex items-center gap-1"
              >
                <Share2 className="h-4 w-4" />
                Share
              </Button>
            </div>
          </div>
        )}

        {/* Metadata */}
        <div className="grid grid-cols-2 gap-4 text-xs text-muted-foreground">
          <div>
            <span className="font-medium">Created:</span>
            <br />
            {new Date(
              Number(generatedMeme.metadata.timestamp) * 1000
            ).toLocaleString()}
          </div>
          <div>
            <span className="font-medium">Processing Time:</span>
            <br />
            {generatedMeme.metadata.processing_time.toFixed(2)}s
          </div>
        </div>

        {/* File Info */}
        {generatedMeme.image_filename && (
          <div className="text-xs text-muted-foreground">
            <span className="font-medium">Filename:</span>{" "}
            {generatedMeme.image_filename}
            {generatedMeme.metadata.file_size_bytes && (
              <span>
                {" "}
                • Size:{" "}
                {(generatedMeme.metadata.file_size_bytes / 1024).toFixed(1)}KB
              </span>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export const MemeGenerator = () => {
  const [prompt, setPrompt] = useState("");
  const [style, setStyle] = useState("");
  const [error, setError] = useState(null);

  // Wrap auth and meme generation hooks in error boundary
  let authContext, memeGenerationHook;
  try {
    authContext = useAuth();
    memeGenerationHook = useMemeGeneration();
  } catch (err) {
    console.error("Failed to initialize MemeGenerator:", err);
    setError(err.message);
    return (
      <Card className="w-full max-w-2xl mx-auto">
        <CardContent className="p-6">
          <div className="text-center text-destructive">
            <AlertCircle className="h-8 w-8 mx-auto mb-2" />
            <p>Failed to load meme generator. Please refresh the page.</p>
            <p className="text-sm text-muted-foreground mt-1">{err.message}</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const { isAuthenticated, login } = authContext;
  const {
    isGenerating,
    generatedMeme,
    canGenerate,
    generateMeme,
    clearGeneratedMeme,
    remainingCalls,
  } = memeGenerationHook;

  const handleGenerate = async (e) => {
    // Prevent any default form submission behavior
    e.preventDefault();
    e.stopPropagation();

    // Clear any previous errors
    setError(null);

    try {
      await generateMeme(prompt, style);
    } catch (err) {
      console.error("Meme generation error:", err);
      setError(err.message);
    }
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

        <div className="space-y-2">
          <label htmlFor="style" className="text-sm font-medium">
            Style (Optional)
          </label>
          <Input
            id="style"
            placeholder="e.g., cartoon, realistic, anime, pixel art..."
            value={style}
            onChange={(e) => setStyle(e.target.value)}
            className="bg-background/50 border-border focus:border-primary transition-colors"
          />
        </div>

        {/* Authentication Status */}
        {!isAuthenticated ? (
          <Card className="p-4 border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Authentication Required
              </span>
            </div>
            <p className="text-xs text-muted-foreground mt-1">
              Please login to generate memes
            </p>
            <Button
              variant="outline"
              size="sm"
              onClick={login}
              className="mt-2"
            >
              Login with Internet Identity
            </Button>
          </Card>
        ) : (
          <Card className="p-4 border-primary/20 bg-primary/5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm font-medium">Ready to Generate</span>
              </div>
              <div className="text-right">
                <span className="text-xs text-muted-foreground">
                  Calls Remaining
                </span>
                <div className="text-lg font-bold text-primary">
                  {remainingCalls}
                </div>
              </div>
            </div>
          </Card>
        )}

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

        {/* Error Display */}
        {error && (
          <Card className="p-4 border-destructive/20 bg-destructive/5">
            <div className="flex items-center gap-2">
              <AlertCircle className="h-4 w-4 text-destructive" />
              <span className="text-sm font-medium text-destructive">
                Error: {error}
              </span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={() => setError(null)}
              className="mt-2"
            >
              Dismiss
            </Button>
          </Card>
        )}

        <Button
          type="button"
          variant="hero"
          size="xl"
          onClick={handleGenerate}
          disabled={!canGenerate || !prompt.trim()}
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

        {/* Enhanced Generated Meme Display */}
        {generatedMeme && (
          <MemeImageDisplay
            generatedMeme={generatedMeme.meme_data || generatedMeme}
            onClear={clearGeneratedMeme}
          />
        )}
      </CardContent>
    </Card>
  );
};
