import { useState, useRef, useEffect } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Textarea } from "../components/ui/Textarea";
import { Input } from "../components/ui/Input";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  User,
  Sparkles,
  Image as ImageIcon,
  ArrowLeft,
  Send,
  Loader2,
  X
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useMemeGeneration } from "../hooks/useMemeGeneration";
import backendService from "../services/backendService";

const MyPlace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);

  // used to force img re-mount on each new URL (avoids stale cache/render)
  const [imgKey, setImgKey] = useState(0);

  // lightbox for enlarged preview + details
  const [isPreviewOpen, setIsPreviewOpen] = useState(false);

  const {
    isGenerating,
    generatedMeme,
    canGenerate,
    generateMeme,
    clearGeneratedMeme,
    remainingCalls,
  } = useMemeGeneration();

  // bump key whenever a new image_url appears
  useEffect(() => {
    if (generatedMeme?.image_url) {
      setImgKey((k) => k + 1);
    }
  }, [generatedMeme?.image_url]);

  const handleFileUpload = (event) => {
    const file = event.target.files[0];
    if (file) {
      if (file.type.startsWith("image/")) {
        const reader = new FileReader();
        reader.onload = (e) => {
          setUploadedImage(e.target.result);
        };
        reader.readAsDataURL(file);
        toast({
          title: "Image Uploaded! 📷",
          description: "Your custom image is ready to use.",
        });
      } else {
        toast({
          title: "Invalid File Type",
          description: "Please upload an image file (PNG, JPG, GIF, etc.).",
          variant: "destructive",
        });
      }
    }
  };

  const handleUploadClick = () => {
    fileInputRef.current?.click();
  };

  const handleGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Missing Prompt",
        description: "Please enter a prompt to generate your meme.",
        variant: "destructive",
      });
      return;
    }

    try {
      const result = await generateMeme(prompt);
      console.log("Meme generation result:", result);
    } catch (error) {
      console.error("Meme generation failed:", error);
      toast({
        title: "Generation Failed",
        description: error.message || "Failed to generate meme",
        variant: "destructive",
      });
    }
  };

  const handlePostToMarketplace = async () => {
    try {
      if (!generatedMeme || !generatedMeme.image_url) {
        toast({
          title: "No Meme to Post",
          description: "Generate a meme first before posting to marketplace.",
          variant: "destructive",
        });
        return;
      }

      // Build MemeData expected by canister
      const url = generatedMeme.image_url;
      const deriveFilename = (u) => {
        try {
          const parsed = new URL(u);
          const last = parsed.pathname.split("/").filter(Boolean).pop();
          return last || "meme.jpg";
        } catch {
          return "meme.jpg";
        }
      };
      const filename =
        generatedMeme.image_filename || deriveFilename(url);
      const ext = (filename.split(".").pop() || "jpg").toLowerCase();

      const md = generatedMeme.metadata || {};
      const memeData = {
        prompt: generatedMeme.prompt || prompt || "",
        image_url: url,
        image_filename: filename,
        image_format: ext,
        metadata: {
          processing_time: Number(md.processing_time ?? 0),
          // Backend expects ns (u64). If missing, approximate from now (ms -> ns).
          timestamp:
            typeof md.timestamp === "bigint"
              ? md.timestamp
              : BigInt(md.timestamp ?? Date.now() * 1_000_000),
          file_size_bytes:
            typeof md.file_size_bytes === "bigint"
              ? md.file_size_bytes
              : BigInt(md.file_size_bytes ?? 0),
          service: String(md.service ?? "mementic-worker"),
        },
      };

      const created = await backendService.publishMeme(memeData);

      toast({
        title: "Posted to Marketplace! 🚀",
        description: `Meme #${created?.id ?? ""} is now live for votes.`,
      });
      navigate("/marketplace");
    } catch (error) {
      console.error("Failed to publish meme:", error);
      toast({
        title: "Publish Failed",
        description: error?.message || "Could not post meme to marketplace",
        variant: "destructive",
      });
    }
  };

  const handleTagClick = (tag) => {
    const tagText = `#${tag.toLowerCase()} `;
    if (!prompt.includes(tagText)) {
      setPrompt((prev) => prev + tagText);
    }
  };


  // Prepare a cache-busted src so new images always show fresh
  const imageSrc = (() => {
    const url = generatedMeme?.image_url;
    if (!url) return null;
    const stamp =
      generatedMeme?.metadata?.timestamp || Date.now(); // server timestamp if available
    const finalUrl = url + (url.includes("?") ? "&" : "?") + "t=" + stamp;
    console.log("Generated image URL:", finalUrl);
    console.log("Original image URL:", url);
    return finalUrl;
  })();

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <div className="border-b border-border bg-card/50 backdrop-blur-sm sticky top-0 z-10">
        <div className="max-w-6xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Button
              variant="ghost"
              size="icon"
              onClick={() => navigate("/marketplace")}
              aria-label="Go back to marketplace"
            >
              <ArrowLeft className="w-5 h-5" />
            </Button>
            <div>
              <div className="flex items-center gap-2 mb-1">
                <Sparkles className="w-6 h-6 text-primary" />
                <h1 className="text-2xl font-bold">My Creative Space</h1>
              </div>
              <p className="text-sm text-muted-foreground">
                AI-Powered Meme Generation
                {remainingCalls !== undefined && (
                  <span className="ml-2 text-primary font-medium">
                    • {remainingCalls} calls remaining
                  </span>
                )}
              </p>
            </div>
          </div>
          <div
            className="px-3 py-1 rounded-full bg-secondary text-secondary-foreground text-sm cursor-pointer hover:bg-secondary/80 transition-colors"
            onClick={() => navigate("/portfolio")}
          >
            <User className="w-4 h-4 mr-2 inline" />
            Portfolio
          </div>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
          {/* Creation Panel */}
          <div className="space-y-8">
            {/* ⬇️ Removed the entire “Choose Your Template” card */}

            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <Sparkles className="w-5 h-5" />
                  AI Prompt
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {/* Inline upload (moved here since template card is gone) */}
                <div
                  className="border-2 border-dashed border-border rounded-lg p-4 text-center hover:border-primary transition-colors cursor-pointer"
                  onClick={handleUploadClick}
                >
                  <ImageIcon className="w-6 h-6 mx-auto mb-2 text-muted-foreground" />
                  <p className="text-sm text-muted-foreground">
                    {uploadedImage
                      ? "Change uploaded image"
                      : "Upload your own image or drag & drop"}
                  </p>
                  {uploadedImage && (
                    <div className="mt-2 text-xs text-primary">
                      ✓ Custom image uploaded
                    </div>
                  )}
                  <Input
                    ref={fileInputRef}
                    type="file"
                    className="hidden"
                    accept="image/*"
                    onChange={handleFileUpload}
                  />
                </div>

                <Textarea
                  placeholder="Describe your meme idea... (e.g., 'A cat explaining crypto to confused humans')"
                  value={prompt}
                  onChange={(e) => setPrompt(e.target.value)}
                  className="min-h-[120px] resize-none"
                />
                <div className="flex flex-wrap gap-2">
                  {["Funny", "Crypto", "Relatable", "Trending", "Sarcastic"].map(
                    (tag) => (
                      <Badge
                        key={tag}
                        variant="outline"
                        className="cursor-pointer hover:bg-primary/10 transition-colors"
                        onClick={() => handleTagClick(tag)}
                      >
                        #{tag}
                      </Badge>
                    )
                  )}
                </div>
                <Button
                  className="w-full"
                  size="lg"
                  onClick={handleGenerate}
                  disabled={!canGenerate || !prompt.trim()}
                >
                  {isGenerating ? (
                    <>
                      <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                      Generating...
                    </>
                  ) : (
                    <>
                      <Sparkles className="w-4 h-4 mr-2" />
                      Generate Meme with AI
                    </>
                  )}
                </Button>
              </CardContent>
            </Card>
          </div>

          {/* Preview Panel */}
          <div className="space-y-8">
            <Card>
              <CardHeader>
                <CardTitle>Live Preview</CardTitle>
              </CardHeader>
              <CardContent>
                {generatedMeme ? (
                  <div className="space-y-4">
                    <div className="aspect-square bg-gradient-glow rounded-lg p-8 flex items-center justify-center relative">
                      <div className="text-center w-full">
                        {imageSrc ? (
                          <div className="w-full h-full flex items-center justify-center">
                            <img
                              key={imgKey}
                              src={imageSrc}
                              alt={`Generated meme: ${prompt}`}
                              className="max-w-full max-h-full object-contain rounded-lg cursor-zoom-in"
                              loading="eager"
                              decoding="async"
                              onClick={() => setIsPreviewOpen(true)}
                              onLoad={() => {
                                console.log("Image loaded successfully");
                              }}
                              onError={(e) => {
                                console.error("Failed to load generated image:", imageSrc);
                                const img = e.currentTarget;
                                const now = Date.now();
                                const base = generatedMeme.image_url || imageSrc;

                                // Try with cache busting first
                                if (!img.src.includes("t=")) {
                                  img.src = base + (base.includes("?") ? "&" : "?") + "t=" + now;
                                  return;
                                }

                                // If that also fails, try alternative approaches
                                console.warn("Image failed to load even with cache busting, trying alternatives...");

                                // Try without protocol if it's HTTPS
                                if (base.startsWith('https://')) {
                                  img.src = base.replace('https://', 'http://');
                                  return;
                                }

                                // Try with different extension if possible
                                if (base.includes('.jpg')) {
                                  img.src = base.replace('.jpg', '.png');
                                  return;
                                }

                                // Final fallback - show error state
                                console.error("All image loading attempts failed");
                              }}
                            />
                          </div>
                        ) : generatedMeme.raw_response ? (
                          <div className="w-full h-full flex items-center justify-center p-4">
                            <div className="text-center">
                              <div className="text-sm text-muted-foreground mb-2">
                                Raw Response from Backend:
                              </div>
                              <div className="text-xs bg-muted p-3 rounded max-h-40 overflow-auto font-mono">
                                {generatedMeme.raw_response.length > 500
                                  ? `${generatedMeme.raw_response.substring(0, 500)}...`
                                  : generatedMeme.raw_response}
                              </div>
                              <div className="text-xs text-muted-foreground mt-2">
                                Image URL: {generatedMeme.image_url || "Not found"}
                              </div>
                            </div>
                          </div>
                        ) : (
                          <div className="w-full h-full flex items-center justify-center">
                            <div className="text-center text-muted-foreground">
                              <Sparkles className="w-8 h-8 mx-auto mb-2" />
                              <p className="text-sm">
                                Meme generated but no image URL provided
                              </p>
                            </div>
                          </div>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <Button
                        variant="hero"
                        size="lg"
                        className="w-full"
                        onClick={handlePostToMarketplace}
                      >
                        <Send className="w-4 h-4 mr-2" />
                        Post to Marketplace
                      </Button>
                      <Button
                        variant="outline"
                        size="lg"
                        className="w-full"
                        onClick={clearGeneratedMeme}
                      >
                        Generate Another
                      </Button>
                    </div>

                    {/* ⬇️ Removed inline details block; details now live in lightbox */}
                  </div>
                ) : (
                  <div className="aspect-square bg-muted/20 rounded-lg flex items-center justify-center">
                    <div className="text-center text-muted-foreground">
                      <Sparkles className="w-12 h-12 mx-auto mb-4" />
                      <p>Your generated meme will appear here</p>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>

            {/* Tips */}
            <Card>
              <CardHeader>
                <CardTitle className="text-lg flex items-center gap-2">
                  <Sparkles className="w-5 h-5 text-primary" />
                  Pro Tips
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3 text-sm">
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <p>Be specific with your prompts for better results</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <p>Use trending topics for viral potential</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <p>Keep text short and punchy</p>
                </div>
                <div className="flex items-start gap-2">
                  <div className="w-1.5 h-1.5 rounded-full bg-primary mt-2 flex-shrink-0"></div>
                  <p>Check spelling before posting</p>
                </div>
              </CardContent>
            </Card>
          </div>
        </div>

      </div>

      {/* Lightbox / Enlarged Preview with Details */}
      {isPreviewOpen && generatedMeme?.image_url && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setIsPreviewOpen(false)}
        >
          <div
            className="relative w-full max-w-5xl bg-card rounded-xl shadow-xl border border-border"
            onClick={(e) => e.stopPropagation()}
          >
            <button
              className="absolute top-3 right-3 p-2 rounded-full bg-black/60 text-white hover:bg-black/80"
              onClick={() => setIsPreviewOpen(false)}
              aria-label="Close preview"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="grid md:grid-cols-5 gap-0 rounded-xl overflow-hidden">
              <div className="md:col-span-3 bg-black flex items-center justify-center p-3">
                <img
                  src={imageSrc}
                  alt="Enlarged generated meme"
                  className="max-h-[80vh] w-auto object-contain rounded"
                />
              </div>
              <div className="md:col-span-2 bg-card p-4 space-y-3 max-h-[80vh] overflow-auto">
                <h3 className="text-lg font-semibold">Image Details</h3>
                {generatedMeme.metadata?.processing_time != null && (
                  <div className="text-sm">
                    <span className="font-medium">Processing Time: </span>
                    {Number.isFinite(generatedMeme.metadata.processing_time)
                      ? `${generatedMeme.metadata.processing_time.toFixed(2)}s`
                      : "N/A"}
                  </div>
                )}
                {prompt && (
                  <div className="text-sm">
                    <span className="font-medium">Prompt: </span>
                    <span className="text-muted-foreground">{prompt}</span>
                  </div>
                )}
                {uploadedImage && (
                  <div className="text-sm">
                    <span className="font-medium">Custom Image: </span>
                    <span className="text-muted-foreground">Provided</span>
                  </div>
                )}
                {generatedMeme.raw_response && (
                  <div>
                    <div className="text-sm font-medium mb-1">Raw Response</div>
                    <pre className="text-xs bg-muted p-2 rounded max-h-48 overflow-auto">
                      {generatedMeme.raw_response}
                    </pre>
                  </div>
                )}
              </div>
            </div>

            <div className="flex gap-2 p-3 border-t border-border justify-end">
              <Button variant="outline" onClick={() => setIsPreviewOpen(false)}>
                Close
              </Button>
              <Button variant="hero" onClick={handlePostToMarketplace}>
                <Send className="w-4 h-4 mr-2" />
                Post to Marketplace
              </Button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default MyPlace;
