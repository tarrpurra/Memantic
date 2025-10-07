import { useEffect, useMemo, useRef, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Textarea } from "../components/ui/Textarea";
import { Badge } from "../components/ui/Badge";
import { useNavigate } from "react-router-dom";
import {
  Upload,
  Image as ImageIcon,
  Sparkles,
  Lightbulb,
  Loader2,
  Wand2,
  X,
  Flame,
  History,
  Share2,
  Download,
  Rocket,
  Stars,
  ListChecks,
} from "lucide-react";
import { useToast } from "../hooks/use-toast";
import { useMemeGeneration } from "../hooks/useMemeGeneration";
import backendService from "../services/backendService";

const PRO_TIPS = [
  {
    title: "Stay Topical",
    description: "Tie your memes to trending crypto or dev news for instant relevance.",
  },
  {
    title: "Contrast Captions",
    description: "Use bold captions with high contrast to keep text readable across devices.",
  },
  {
    title: "Loop the Joke",
    description: "Add looping humor with sequenced panels to keep viewers engaged.",
  },
  {
    title: "Stake on Success",
    description: "Allocate extra ICP to high-performing memes to dominate auctions.",
  },
];

const INSPIRATION_PROMPTS = [
  "When your canister compiles on the first try",
  "Deploying to mainnet without touching documentation",
  "ICP dev after optimizing cycles usage",
  "When governance votes in your favor",
  "Gas fees? Never heard of her on ICP",
];

const MemeCard = ({ meme, onMint, onDownload, isMinting }) => (
  <motion.div
    layout
    whileHover={{ y: -6 }}
    transition={{ type: "spring", stiffness: 220, damping: 20 }}
    className="group overflow-hidden rounded-2xl border border-white/10 bg-slate-900/60 shadow-lg backdrop-blur"
  >
    <Card className="border-0 bg-transparent">
      <CardContent className="space-y-4 p-4">
        <div className="relative overflow-hidden rounded-xl bg-slate-800/70">
          {meme?.image_url ? (
            <img
              src={meme.image_url}
              alt={meme.prompt || "Generated meme"}
              className="h-48 w-full object-cover transition-transform duration-500 group-hover:scale-105"
            />
          ) : (
            <div className="flex h-48 w-full flex-col items-center justify-center gap-3 text-white/50">
              <ImageIcon className="h-10 w-10" />
              <span>AI render coming soon…</span>
            </div>
          )}
          {meme?.prompt ? (
            <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/40 to-transparent p-4 text-sm font-medium text-white">
              {meme.prompt}
            </div>
          ) : null}
        </div>
        <div className="flex flex-wrap gap-2 text-xs text-white/60">
          <Badge className="bg-cyan-500/10 text-cyan-200">AI Crafted</Badge>
          <Badge className="bg-violet-500/10 text-violet-200">Mint Ready</Badge>
        </div>
        <div className="flex gap-3">
          <Button
            className="flex-1 bg-gradient-to-r from-primary to-cyan-400 text-black"
            disabled={isMinting}
            onClick={() => onMint(meme)}
          >
            {isMinting ? (
              <span className="flex items-center justify-center gap-2">
                <Loader2 className="h-4 w-4 animate-spin" /> Minting…
              </span>
            ) : (
              <span className="flex items-center justify-center gap-2">
                <Rocket className="h-4 w-4" /> Mint as NFT
              </span>
            )}
          </Button>
          <Button
            variant="outline"
            className="flex-1 border-white/20 bg-white/10 text-white hover:border-cyan-400"
            onClick={() => onDownload(meme)}
          >
            <Download className="mr-2 h-4 w-4" /> Download
          </Button>
        </div>
      </CardContent>
    </Card>
  </motion.div>
);

const MyCreativeSpace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const fileInputRef = useRef(null);
  const [prompt, setPrompt] = useState("");
  const [uploadedImage, setUploadedImage] = useState(null);
  const [dragActive, setDragActive] = useState(false);
  const [isTipsOpen, setIsTipsOpen] = useState(false);
  const [isMinting, setIsMinting] = useState(false);
  const [localMemes, setLocalMemes] = useState([]);

  const {
    isGenerating,
    generatedMeme,
    generationHistory,
    canGenerate,
    generateMeme,
    clearGeneratedMeme,
    remainingCalls,
  } = useMemeGeneration();

  useEffect(() => {
    if (generatedMeme) {
      setLocalMemes((prev) => {
        const next = [generatedMeme, ...prev];
        return next.slice(0, 6);
      });
    }
  }, [generatedMeme]);

  useEffect(() => {
    if (generationHistory?.length) {
      setLocalMemes((prev) => {
        const deduped = [...generationHistory, ...prev];
        const seen = new Set();
        return deduped.filter((item) => {
          const key = item.image_url || item.prompt;
          if (seen.has(key)) return false;
          seen.add(key);
          return true;
        }).slice(0, 6);
      });
    }
  }, [generationHistory]);

  const handleFileUpload = (file) => {
    if (!file) return;
    if (!file.type.startsWith("image/")) {
      toast({
        title: "Unsupported file",
        description: "Please upload an image format such as PNG, JPG, or GIF.",
        variant: "destructive",
      });
      return;
    }

    const reader = new FileReader();
    reader.onload = (event) => {
      setUploadedImage({
        name: file.name,
        dataUrl: event.target?.result,
        type: file.type,
      });
      toast({
        title: "Image ready",
        description: "Your custom image is staged for meme generation.",
      });
    };
    reader.readAsDataURL(file);
  };

  const onDrop = (event) => {
    event.preventDefault();
    setDragActive(false);
    const file = event.dataTransfer?.files?.[0];
    handleFileUpload(file);
  };

  const onGenerate = async () => {
    if (!prompt.trim()) {
      toast({
        title: "Prompt required",
        description: "Enter a witty idea or pick one from inspiration.",
        variant: "destructive",
      });
      return;
    }

    try {
      const meme = await generateMeme(prompt);
      if (meme) {
        toast({
          title: "Meme Generated",
          description: "Preview your render and mint if it slaps.",
        });
      }
    } catch (error) {
      console.error("Generate meme failed", error);
      toast({
        title: "Generation failed",
        description: error?.message || "Could not reach the meme worker.",
        variant: "destructive",
      });
    }
  };

  const clearAll = () => {
    setPrompt("");
    setUploadedImage(null);
    clearGeneratedMeme();
    toast({
      title: "Workspace cleared",
      description: "Fresh canvas ready for your next viral hit.",
    });
  };

  const handleMint = async (meme) => {
    if (!meme?.image_url) {
      toast({
        title: "Missing render",
        description: "Generate a meme before minting.",
        variant: "destructive",
      });
      return;
    }

    const deriveFilename = (url) => {
      try {
        const parsed = new URL(url);
        const last = parsed.pathname.split("/").filter(Boolean).pop();
        return last || "meme.jpg";
      } catch (error) {
        console.warn("Filename derivation failed", error);
        return "meme.jpg";
      }
    };

    const filename = meme.image_filename || deriveFilename(meme.image_url);
    const extension = (filename.split(".").pop() || "jpg").toLowerCase();

    const metadata = meme.metadata || {};
    const memeData = {
      prompt: meme.prompt || prompt,
      image_url: meme.image_url,
      image_filename: filename,
      image_format: extension,
      metadata: {
        processing_time: Number(metadata.processing_time ?? 0),
        timestamp:
          typeof metadata.timestamp === "bigint"
            ? metadata.timestamp
            : BigInt(metadata.timestamp ?? Date.now() * 1_000_000),
        file_size_bytes:
          typeof metadata.file_size_bytes === "bigint"
            ? metadata.file_size_bytes
            : BigInt(metadata.file_size_bytes ?? 0),
        service: String(metadata.service ?? "mementic-worker"),
      },
    };

    try {
      setIsMinting(true);
      const published = await backendService.publishMeme(memeData);
      const memeId = published?.id ?? published;
      if (!memeId) {
        throw new Error("Minting requires a valid meme identifier");
      }
      await backendService.mintMemeNft(memeId);
      toast({
        title: "NFT minted",
        description: `Meme #${memeId} is now an ICP collectible.`,
      });
      navigate("/marketplace");
    } catch (error) {
      console.error("Mint NFT failed", error);
      toast({
        title: "Mint failed",
        description: error?.message || "Unable to mint this meme right now.",
        variant: "destructive",
      });
    } finally {
      setIsMinting(false);
    }
  };

  const handleDownload = (meme) => {
    if (!meme?.image_url) {
      toast({
        title: "No image available",
        description: "Generate a meme before downloading.",
      });
      return;
    }

    const link = document.createElement("a");
    link.href = meme.image_url;
    const safeName = (meme.prompt || "mementic-meme").slice(0, 40).replace(/[^a-z0-9]+/gi, "-");
    link.download = `${safeName || "mementic-meme"}.png`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
  };

  const inspirationButtons = useMemo(
    () =>
      INSPIRATION_PROMPTS.map((idea) => (
        <Button
          key={idea}
          variant="ghost"
          className="justify-start border border-white/10 bg-white/5 text-left text-white/70 hover:border-cyan-400 hover:text-cyan-100"
          onClick={() => setPrompt(idea)}
        >
          <Stars className="mr-2 h-4 w-4" />
          {idea}
        </Button>
      )),
    []
  );

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.35),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(34,211,238,0.25),_transparent_65%)]" />

      <header className="relative z-10 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl flex-col gap-4 px-6 py-6 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-4xl font-semibold tracking-tight text-white">My Creative Space</h1>
            <p className="mt-2 text-sm text-white/70">Generate your next viral meme with AI.</p>
          </div>
          <div className="flex items-center gap-3">
            <Badge className="bg-cyan-500/10 text-cyan-200">
              Remaining Calls: {remainingCalls ?? 0}
            </Badge>
            <button
              type="button"
              onClick={() => setIsTipsOpen(true)}
              className="text-sm text-cyan-200 underline-offset-4 transition hover:text-white hover:underline"
            >
              Pro Tips 💡
            </button>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto grid w-full max-w-6xl gap-8 px-6 py-10 lg:grid-cols-[1.1fr_1fr]">
        <section className="space-y-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-white">Prompt Input</CardTitle>
                <p className="text-sm text-white/60">Enter a funny idea, situation, or caption.</p>
              </div>
              <Badge className="bg-purple-500/10 text-purple-200">
                <Sparkles className="mr-1 h-4 w-4" /> AI Assisted
              </Badge>
            </CardHeader>
            <CardContent className="space-y-4">
              <Textarea
                value={prompt}
                onChange={(event) => setPrompt(event.target.value)}
                placeholder="Enter a funny idea, situation, or caption..."
                className="min-h-[140px] resize-none border-white/10 bg-black/30 text-white placeholder:text-white/40"
              />
              <p className="text-xs text-white/50">
                e.g., “When your code works on first try 😂”
              </p>
              <div
                onDragOver={(event) => {
                  event.preventDefault();
                  setDragActive(true);
                }}
                onDragLeave={() => setDragActive(false)}
                onDrop={onDrop}
                className={`rounded-2xl border-2 border-dashed px-6 py-8 text-center transition ${
                  dragActive
                    ? "border-cyan-400 bg-cyan-400/10"
                    : "border-white/20 bg-black/20"
                }`}
              >
                <input
                  type="file"
                  accept="image/*"
                  ref={fileInputRef}
                  className="hidden"
                  onChange={(event) => handleFileUpload(event.target.files?.[0])}
                />
                <ImageIcon className="mx-auto mb-3 h-10 w-10 text-cyan-200" />
                <p className="text-sm font-medium text-white">Upload Your Own Image</p>
                <p className="mt-1 text-xs text-white/60">Drag & drop or click to browse.</p>
                <Button
                  variant="outline"
                  className="mt-4 border-white/20 bg-white/10 text-white hover:border-cyan-400"
                  onClick={() => fileInputRef.current?.click()}
                >
                  <Upload className="mr-2 h-4 w-4" /> Browse Files
                </Button>
                {uploadedImage ? (
                  <p className="mt-3 text-xs text-cyan-200">
                    {uploadedImage.name} attached
                  </p>
                ) : null}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  className="flex-1 bg-gradient-to-r from-primary to-cyan-400 text-black shadow-lg"
                  onClick={onGenerate}
                  disabled={!canGenerate || isGenerating}
                >
                  {isGenerating ? (
                    <span className="flex items-center justify-center gap-2">
                      <Loader2 className="h-4 w-4 animate-spin" /> Generating…
                    </span>
                  ) : (
                    <span className="flex items-center justify-center gap-2">
                      <Wand2 className="h-4 w-4" /> Generate Meme
                    </span>
                  )}
                </Button>
                <Button
                  variant="ghost"
                  className="border border-white/20 bg-transparent text-white hover:border-cyan-400"
                  onClick={clearAll}
                >
                  <X className="mr-2 h-4 w-4" /> Clear
                </Button>
              </div>
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <Lightbulb className="h-5 w-5 text-cyan-300" /> Inspiration
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-white/70">
                Use a trending idea to jumpstart your meme or tap into a random prompt.
              </p>
              <div className="grid gap-3 sm:grid-cols-2">
                {inspirationButtons}
              </div>
              <Button
                variant="ghost"
                className="w-full border border-white/10 bg-white/10 text-white hover:border-cyan-400"
                onClick={() => {
                  const idea = INSPIRATION_PROMPTS[Math.floor(Math.random() * INSPIRATION_PROMPTS.length)];
                  setPrompt(idea);
                }}
              >
                <Flame className="mr-2 h-4 w-4 text-orange-300" /> Random Trending Prompt
              </Button>
            </CardContent>
          </Card>
        </section>

        <section className="space-y-6">
          <Card className="border-white/10 bg-white/5 backdrop-blur">
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle className="text-lg font-semibold text-white">Generated Memes</CardTitle>
                <p className="text-sm text-white/60">Mint, download, or share your best outputs.</p>
              </div>
              <Badge className="bg-emerald-500/10 text-emerald-200">
                <ListChecks className="mr-1 h-4 w-4" /> {localMemes.length} drafts
              </Badge>
            </CardHeader>
            <CardContent>
              {isGenerating && localMemes.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-3 text-white/60">
                  <Loader2 className="h-8 w-8 animate-spin text-cyan-300" />
                  Generating your meme magic…
                </div>
              ) : localMemes.length === 0 ? (
                <div className="flex h-64 flex-col items-center justify-center gap-4 text-center text-white/60">
                  <Sparkles className="h-10 w-10 text-cyan-200" />
                  <p>No generated memes yet. Create something legendary!</p>
                </div>
              ) : (
                <div className="grid gap-4 sm:grid-cols-2">
                  {localMemes.map((meme, index) => (
                    <MemeCard
                      key={(meme.image_url || "meme") + index}
                      meme={meme}
                      onMint={handleMint}
                      onDownload={handleDownload}
                      isMinting={isMinting}
                    />
                  ))}
                </div>
              )}
            </CardContent>
          </Card>

          <Card className="border-white/10 bg-white/5 backdrop-blur">
            <CardHeader>
              <CardTitle className="flex items-center gap-2 text-white">
                <History className="h-5 w-5 text-cyan-300" /> Generation History
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-3">
              <p className="text-sm text-white/70">
                Recently generated memes are stored locally for quick iteration.
              </p>
              <div className="flex flex-wrap gap-2">
                {generationHistory.slice(0, 6).map((item, index) => (
                  <Badge key={`history-${index}`} className="bg-white/10 text-white/70">
                    {item.prompt?.slice(0, 32) || "Untitled"}
                  </Badge>
                ))}
              </div>
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="outline"
                  className="border-white/20 bg-white/10 text-white hover:border-cyan-400"
                  onClick={() => navigate("/pre-meme-marketplace")}
                >
                  See Trending Templates
                </Button>
                <Button
                  variant="ghost"
                  className="border border-white/10 bg-transparent text-white hover:border-cyan-400"
                  onClick={() => {
                    toast({
                      title: "Shared",
                      description: "Your meme was sent to the community feed.",
                    });
                  }}
                >
                  <Share2 className="mr-2 h-4 w-4" /> Share to Feed
                </Button>
              </div>
            </CardContent>
          </Card>
        </section>
      </main>

      <section className="relative z-10 bg-black/50 px-6 py-10">
        <div className="mx-auto grid max-w-6xl gap-6 md:grid-cols-4">
          <div className="md:col-span-1">
            <h2 className="text-lg font-semibold text-white">Pro Tips for Going Viral</h2>
            <p className="mt-2 text-sm text-white/60">
              Practice disciplined meme economics and storytelling to win each bracket.
            </p>
          </div>
          <div className="md:col-span-3 grid gap-4 sm:grid-cols-2">
            {PRO_TIPS.map((tip) => (
              <Card key={tip.title} className="border-white/10 bg-white/5 backdrop-blur">
                <CardHeader className="space-y-2">
                  <CardTitle className="flex items-center gap-2 text-base text-white">
                    <Stars className="h-4 w-4 text-cyan-300" />
                    {tip.title}
                  </CardTitle>
                  <p className="text-sm text-white/70">{tip.description}</p>
                </CardHeader>
              </Card>
            ))}
          </div>
        </div>
      </section>

      <AnimatePresence>
        {isTipsOpen ? (
          <motion.div
            className="fixed inset-0 z-40 flex items-center justify-center bg-black/70 backdrop-blur"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900/95 p-6 shadow-xl"
            >
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="text-xl font-semibold text-white">Pro Tips 💡</h3>
                  <p className="mt-1 text-sm text-white/60">
                    Master meme strategy before minting to maximize votes and earnings.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsTipsOpen(false)}
                  className="text-white/60 transition hover:text-white"
                >
                  <X className="h-5 w-5" />
                </button>
              </div>
              <div className="mt-6 space-y-4">
                {PRO_TIPS.map((tip) => (
                  <div key={`modal-${tip.title}`} className="rounded-2xl border border-white/10 bg-white/5 p-4">
                    <h4 className="text-sm font-semibold text-white">{tip.title}</h4>
                    <p className="mt-1 text-xs text-white/60">{tip.description}</p>
                  </div>
                ))}
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </div>
  );
};

export default MyCreativeSpace;
