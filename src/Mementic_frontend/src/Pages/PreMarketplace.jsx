import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  ArrowUpRight,
  ArrowUpWideNarrow,
  ArrowDownWideNarrow,
  Award,
  BarChart3,
  Coins,
  Filter,
  Flame,
  Layers,
  LineChart,
  ListFilter,
  RefreshCw,
  Search,
  Sparkles,
  Timer,
  TrendingUp,
  Users,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import backendService from "../services/backendService";

const TIMEFRAMES = [
  { label: "Daily", value: "daily" },
  { label: "Weekly", value: "weekly" },
  { label: "Monthly", value: "monthly" },
];

const SORT_OPTIONS = [
  { label: "Votes", value: "votes" },
  { label: "Newest", value: "newest" },
  { label: "Oldest", value: "oldest" },
  { label: "Participation", value: "participation" },
];

const CATEGORY_OPTIONS = [
  { label: "All Categories", value: "all" },
  { label: "AI", value: "ai" },
  { label: "Developers", value: "dev" },
  { label: "Culture", value: "culture" },
  { label: "DeFi", value: "defi" },
  { label: "Gaming", value: "gaming" },
];

const BLOCKCHAIN_OPTIONS = [
  { label: "Internet Computer (ICP)", value: "icp" },
  { label: "Ethereum", value: "eth" },
  { label: "Base", value: "base" },
];

const FALLBACK_MEMES = [
  {
    id: "101",
    title: "Cycles Maxxing",
    creator: "@dfinityOG",
    imageUrl: "https://images.unsplash.com/photo-1531297484001-80022131f5a1?auto=format&fit=crop&w=800&q=80",
    votes: 482,
    stakedIcp: 123.45,
    endsAt: Date.now() + 6 * 60 * 60 * 1000,
    participation: 86,
    tags: ["Trending", "New"],
    category: "ai",
  },
  {
    id: "102",
    title: "Zero Gas Flex",
    creator: "@memeonaut",
    imageUrl: "https://images.unsplash.com/photo-1500530855697-b586d89ba3ee?auto=format&fit=crop&w=800&q=80",
    votes: 361,
    stakedIcp: 78.1,
    endsAt: Date.now() + 20 * 60 * 60 * 1000,
    participation: 64,
    tags: ["Hot"],
    category: "defi",
  },
  {
    id: "103",
    title: "When Governance Ships",
    creator: "@governor",
    imageUrl: "https://images.unsplash.com/photo-1518770660439-4636190af475?auto=format&fit=crop&w=800&q=80",
    votes: 298,
    stakedIcp: 45.62,
    endsAt: Date.now() + 2 * 24 * 60 * 60 * 1000,
    participation: 71,
    tags: ["Community"],
    category: "dev",
  },
  {
    id: "104",
    title: "Computation Party",
    creator: "@icp_party",
    imageUrl: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=800&q=80",
    votes: 215,
    stakedIcp: 32.9,
    endsAt: Date.now() + 12 * 60 * 60 * 1000,
    participation: 58,
    tags: ["New"],
    category: "culture",
  },
];

const formatCountdown = (timestamp) => {
  const diff = Math.max(0, timestamp - Date.now());
  const days = Math.floor(diff / (24 * 3600 * 1000));
  const hours = Math.floor((diff % (24 * 3600 * 1000)) / (3600 * 1000));
  const minutes = Math.floor((diff % (3600 * 1000)) / (60 * 1000));
  if (days) return `${days}d ${hours}h`;
  if (hours) return `${hours}h ${minutes}m`;
  return `${minutes}m`;
};

const TrendingSidebar = ({ onSelectTag }) => (
  <aside className="hidden lg:block">
    <div className="sticky top-24 space-y-6">
      <Card className="border-white/10 bg-slate-900/70 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-white/80">Trending Tags</CardTitle>
          <Flame className="h-4 w-4 text-orange-400" />
        </CardHeader>
        <CardContent className="flex flex-wrap gap-2">
          {[
            "ZeroGas",
            "Cycles",
            "OpenChat",
            "AI-Coop",
            "Governance",
            "Motoko",
          ].map((tag) => (
            <Badge
              key={tag}
              onClick={() => onSelectTag(tag)}
              className="cursor-pointer bg-white/10 text-xs text-cyan-200 transition hover:bg-cyan-500/20"
            >
              #{tag}
            </Badge>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-slate-900/70 backdrop-blur">
        <CardHeader className="flex flex-row items-center justify-between pb-3">
          <CardTitle className="text-sm font-semibold text-white/80">Top Creators</CardTitle>
          <Users className="h-4 w-4 text-cyan-300" />
        </CardHeader>
        <CardContent className="space-y-4">
          {[
            { handle: "@cyclesorcerer", streak: "12 wins" },
            { handle: "@dfx_dreamer", streak: "8 wins" },
            { handle: "@devdank", streak: "6 wins" },
          ].map((creator) => (
            <div
              key={creator.handle}
              className="flex items-center justify-between rounded-lg border border-white/5 bg-white/5 px-3 py-2"
            >
              <div>
                <p className="text-sm font-semibold text-white">{creator.handle}</p>
                <p className="text-xs text-white/60">{creator.streak}</p>
              </div>
              <Badge className="bg-cyan-500/10 text-xs text-cyan-200">Follow</Badge>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="border-white/10 bg-gradient-to-br from-purple-500/20 via-transparent to-cyan-400/20">
        <CardContent className="space-y-4 p-5 text-white">
          <div className="flex items-center gap-3">
            <Sparkles className="h-6 w-6 text-cyan-200" />
            <div>
              <p className="text-sm font-semibold uppercase tracking-wide text-white/80">Boost Your Ranking</p>
              <p className="text-xs text-white/60">Submit a meme and rally the community.</p>
            </div>
          </div>
          <Button
            className="w-full bg-gradient-to-r from-purple-500 via-primary to-cyan-400 text-black shadow-lg"
            onClick={() => onSelectTag("create")}
          >
            Create a Meme
          </Button>
        </CardContent>
      </Card>
    </div>
  </aside>
);

const MemeCard = ({ meme, index, onVote, onStake, onDetails, disabled }) => (
  <motion.div
    layout
    initial={{ opacity: 0, y: 16 }}
    animate={{ opacity: 1, y: 0 }}
    transition={{ duration: 0.25, delay: index * 0.03 }}
    className="group flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/70 shadow-xl backdrop-blur"
  >
    <div className="relative">
      <img
        src={meme.imageUrl}
        alt={meme.title}
        className="h-48 w-full object-cover transition duration-500 group-hover:scale-105"
        loading="lazy"
      />
      <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/10 to-transparent opacity-0 transition group-hover:opacity-100" />
      <div className="absolute left-4 top-4 flex gap-2">
        {meme.tags?.map((tag) => (
          <Badge key={tag} className="bg-white/15 text-xs text-white">
            {tag}
          </Badge>
        ))}
      </div>
      <Button
        variant="ghost"
        className="absolute right-3 top-3 h-9 rounded-full bg-black/40 px-4 text-white backdrop-blur hover:bg-black/60"
        onClick={() => onDetails(meme)}
      >
        <ArrowUpRight className="mr-1.5 h-4 w-4" /> Details
      </Button>
    </div>

    <div className="flex flex-1 flex-col gap-4 p-5">
      <div className="space-y-1">
        <h3 className="text-lg font-semibold text-white">{meme.title}</h3>
        <p className="text-sm text-white/60">{meme.creator}</p>
      </div>
      <div className="grid grid-cols-3 gap-3 text-xs text-white/70">
        <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/50">
            <Award className="h-3.5 w-3.5" /> Votes
          </p>
          <p className="mt-1 text-base font-semibold text-white">{meme.votes.toLocaleString()}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/50">
            <Coins className="h-3.5 w-3.5" /> ICP Staked
          </p>
          <p className="mt-1 text-base font-semibold text-white">{meme.stakedIcp.toFixed(2)}</p>
        </div>
        <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
          <p className="flex items-center gap-1 text-[11px] uppercase tracking-wide text-white/50">
            <Timer className="h-3.5 w-3.5" /> Ends in
          </p>
          <p className="mt-1 text-base font-semibold text-white">{formatCountdown(meme.endsAt)}</p>
        </div>
      </div>

      <div className="mt-auto flex flex-col gap-3 sm:flex-row">
        <Button
          className="flex-1 bg-gradient-to-r from-violet-500 via-purple-500 to-cyan-400 text-black shadow-lg"
          onClick={() => onVote(meme)}
          disabled={disabled}
        >
          <Sparkles className="mr-2 h-4 w-4" /> Upvote
        </Button>
        <Button
          variant="outline"
          className="flex-1 border-white/20 bg-white/10 text-white hover:border-cyan-400"
          onClick={() => onStake(meme)}
          disabled={disabled}
        >
          <Coins className="mr-2 h-4 w-4" /> Stake ICP
        </Button>
      </div>
    </div>
  </motion.div>
);

const StakeDialog = ({ meme, amount, setAmount, onClose, onConfirm, loading }) => (
  <AnimatePresence>
    {meme ? (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ scale: 0.9, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          exit={{ scale: 0.9, opacity: 0 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="w-full max-w-md overflow-hidden rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <h3 className="text-xl font-semibold">Stake ICP</h3>
              <p className="text-sm text-white/60">Support {meme.creator} and boost meme visibility.</p>
            </div>
            <Button variant="ghost" className="h-9 w-9" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="mt-4 space-y-3 rounded-2xl border border-white/10 bg-white/5 p-4">
            <div className="flex items-center gap-3">
              <img src={meme.imageUrl} alt={meme.title} className="h-14 w-14 rounded-xl object-cover" />
              <div>
                <p className="text-sm font-semibold">{meme.title}</p>
                <p className="text-xs text-white/60">{meme.creator}</p>
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
              <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-white/50">Current Stake</p>
                <p className="mt-1 text-base font-semibold">{meme.stakedIcp.toFixed(2)} ICP</p>
              </div>
              <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                <p className="text-[11px] uppercase tracking-wide text-white/50">Participation</p>
                <p className="mt-1 text-base font-semibold">{meme.participation}%</p>
              </div>
            </div>
          </div>

          <label className="mt-5 block text-sm font-medium text-white/80">
            Amount to stake (ICP)
            <Input
              type="number"
              min="0"
              step="0.01"
              value={amount}
              onChange={(event) => setAmount(event.target.value)}
              className="mt-2 bg-slate-900/80 text-base text-white"
            />
          </label>

          <div className="mt-6 flex gap-3">
            <Button className="flex-1" onClick={onConfirm} disabled={loading}>
              {loading ? "Staking…" : "Confirm"}
            </Button>
            <Button variant="outline" className="flex-1" onClick={onClose}>
              Cancel
            </Button>
          </div>
        </motion.div>
      </motion.div>
    ) : null}
  </AnimatePresence>
);

const DetailsDrawer = ({ meme, onClose, onStake, onVote }) => (
  <AnimatePresence>
    {meme ? (
      <motion.aside
        className="fixed inset-x-0 bottom-0 z-40 max-h-[85vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-[0_-30px_60px_rgba(15,23,42,0.6)] md:right-6 md:bottom-6 md:top-6 md:my-auto md:h-[calc(100vh-3rem)] md:w-[420px] md:rounded-3xl"
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: "spring", stiffness: 200, damping: 24 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.2em] text-white/50">Meme Details</p>
            <h3 className="mt-1 text-2xl font-semibold">{meme.title}</h3>
            <p className="text-sm text-white/60">by {meme.creator}</p>
          </div>
          <Button variant="ghost" className="h-9 w-9" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <img src={meme.imageUrl} alt={meme.title} className="w-full" loading="lazy" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-white/70">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/50">
              <Award className="h-4 w-4" /> Votes
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{meme.votes.toLocaleString()}</p>
            <p className="text-xs text-white/50">Community momentum</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/50">
              <Coins className="h-4 w-4" /> ICP Staked
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{meme.stakedIcp.toFixed(2)}</p>
            <p className="text-xs text-white/50">Backing this meme</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/50">
              <Timer className="h-4 w-4" /> Countdown
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{formatCountdown(meme.endsAt)}</p>
            <p className="text-xs text-white/50">Voting window</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="flex items-center gap-2 text-[11px] uppercase tracking-[0.3em] text-white/50">
              <LineChart className="h-4 w-4" /> Participation
            </p>
            <p className="mt-2 text-2xl font-semibold text-white">{meme.participation}%</p>
            <p className="text-xs text-white/50">Voters engaged</p>
          </div>
        </div>

        <div className="mt-6 space-y-3 text-sm text-white/70">
          <p>
            Rally the community with stacked votes or stake ICP to secure your meme's graduation into the NFT marketplace.
          </p>
          <div className="rounded-2xl border border-cyan-500/30 bg-cyan-500/10 p-4 text-cyan-100">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Recent Activity</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li>• @cycles_max staked 12 ICP</li>
              <li>• @dfinity_dao added 36 votes</li>
              <li>• @openchat minted last week's winner</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 flex flex-col gap-3 sm:flex-row">
          <Button className="flex-1" onClick={() => onVote(meme)}>
            Boost with Vote
          </Button>
          <Button variant="outline" className="flex-1" onClick={() => onStake(meme)}>
            Stake ICP
          </Button>
        </div>
      </motion.aside>
    ) : null}
  </AnimatePresence>
);

const PreMarketplace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated } = useAuth();

  const [timeframe, setTimeframe] = useState("daily");
  const [sort, setSort] = useState("votes");
  const [direction, setDirection] = useState("desc");
  const [category, setCategory] = useState("all");
  const [blockchain, setBlockchain] = useState("icp");
  const [search, setSearch] = useState("");
  const [memes, setMemes] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [selectedMeme, setSelectedMeme] = useState(null);
  const [stakeTarget, setStakeTarget] = useState(null);
  const [stakeAmount, setStakeAmount] = useState("5");
  const [stakeLoading, setStakeLoading] = useState(false);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadMemes = async () => {
      setLoading(true);
      setError(null);
      try {
        const params = new URLSearchParams({
          window: timeframe,
          sort,
          dir: direction,
          blockchain,
          category,
        });
        if (search) params.set("q", search);

        const response = await fetch(`/api/pre-market?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load memes (${response.status})`);
        }

        const data = await response.json();
        if (!isMounted) return;

        const normalized = Array.isArray(data)
          ? data.map((item, index) => ({
              id: String(item.id ?? index),
              title: item.title ?? "Untitled Meme",
              creator: item.creator ?? "@anon",
              imageUrl: item.imageUrl ?? item.image_url ?? FALLBACK_MEMES[index % FALLBACK_MEMES.length].imageUrl,
              votes: Number(item.votes ?? 0),
              stakedIcp: Number(item.stakedIcp ?? item.staked_icp ?? 0),
              endsAt: Number(item.endsAt ?? item.ends_at ?? Date.now() + 3 * 3600 * 1000),
              participation: Number(item.participation ?? 0),
              tags: item.tags ?? [],
              category: item.category ?? "all",
            }))
          : [];

        setMemes(normalized);
      } catch (fetchError) {
        if (fetchError.name === "AbortError") return;
        console.warn("Falling back to mock pre-marketplace data", fetchError);
        if (isMounted) {
          setError(fetchError.message);
          setMemes(FALLBACK_MEMES);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    loadMemes();
    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [timeframe, sort, direction, category, blockchain, search, refreshKey]);

  const filteredMemes = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    const matchesSearch = (meme) =>
      !lowerSearch ||
      meme.title.toLowerCase().includes(lowerSearch) ||
      meme.creator.toLowerCase().includes(lowerSearch);

    const matchesCategory = (meme) => category === "all" || meme.category === category;
    const matchesChain = () => blockchain === "icp" || blockchain === "all";

    const sorted = [...memes]
      .filter((meme) => matchesSearch(meme) && matchesCategory(meme) && matchesChain(meme))
      .sort((a, b) => {
        const dir = direction === "asc" ? 1 : -1;
        switch (sort) {
          case "votes":
            return dir * ((a.votes ?? 0) - (b.votes ?? 0));
          case "newest":
            return dir * ((a.endsAt ?? 0) - (b.endsAt ?? 0));
          case "oldest":
            return dir * ((b.endsAt ?? 0) - (a.endsAt ?? 0));
          case "participation":
            return dir * ((a.participation ?? 0) - (b.participation ?? 0));
          default:
            return 0;
        }
      });

    return sorted;
  }, [memes, search, category, blockchain, sort, direction]);

  const leaderboard = useMemo(() => {
    if (!filteredMemes.length) {
      return {
        topVotes: 0,
        totalStake: 0,
        avgParticipation: 0,
      };
    }

    const topVotes = filteredMemes[0]?.votes ?? 0;
    const totalStake = filteredMemes.reduce((acc, meme) => acc + (meme.stakedIcp ?? 0), 0);
    const avgParticipation =
      filteredMemes.reduce((acc, meme) => acc + (meme.participation ?? 0), 0) / filteredMemes.length;

    return {
      topVotes,
      totalStake,
      avgParticipation,
    };
  }, [filteredMemes]);

  const handleVote = async (meme) => {
    if (!isAuthenticated) {
      toast({
        title: "Connect your wallet",
        description: "Log in with Internet Identity to cast a vote.",
      });
      return;
    }

    try {
      await backendService.voteMeme(meme.id, "Upvote");
      toast({ title: "Vote recorded", description: `You upvoted ${meme.title}.` });
      setMemes((prev) =>
        prev.map((item) =>
          item.id === meme.id
            ? {
                ...item,
                votes: (item.votes ?? 0) + 1,
              }
            : item
        )
      );
    } catch (voteError) {
      toast({
        title: "Vote failed",
        description: voteError.message,
        variant: "destructive",
      });
    }
  };

  const handleStakeOpen = (meme) => {
    if (!isAuthenticated) {
      toast({
        title: "Wallet required",
        description: "Connect your ICP wallet before staking.",
      });
      return;
    }
    setStakeTarget(meme);
    setStakeAmount("5");
  };

  const handleStakeConfirm = async () => {
    if (!stakeTarget) return;

    const numeric = Number(stakeAmount);
    if (!Number.isFinite(numeric) || numeric <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive ICP amount." });
      return;
    }

    try {
      setStakeLoading(true);
      await backendService.stakeOnMeme(stakeTarget.id, numeric);
      toast({ title: "Stake submitted", description: `Added ${numeric.toFixed(2)} ICP to ${stakeTarget.title}.` });
      setMemes((prev) =>
        prev.map((item) =>
          item.id === stakeTarget.id
            ? {
                ...item,
                stakedIcp: (item.stakedIcp ?? 0) + numeric,
              }
            : item
        )
      );
      setStakeTarget(null);
    } catch (stakeError) {
      toast({
        title: "Stake failed",
        description: stakeError.message,
        variant: "destructive",
      });
    } finally {
      setStakeLoading(false);
    }
  };

  const handleRefresh = () => setRefreshKey((value) => value + 1);

  const handleSidebarSelect = (tag) => {
    if (tag === "create") {
      navigate("/create");
      return;
    }
    setSearch(tag);
  };

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-28">
        <div className="flex flex-col gap-8 lg:grid lg:grid-cols-[280px_1fr] lg:gap-10">
          <TrendingSidebar onSelectTag={handleSidebarSelect} />

          <div className="space-y-10">
            <header className="space-y-6">
              <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
                <div>
                  <p className="text-xs uppercase tracking-[0.3em] text-white/50">Voting Hub</p>
                  <h1 className="mt-2 text-3xl font-semibold md:text-4xl">Pre Meme Marketplace</h1>
                  <p className="mt-2 max-w-2xl text-sm text-white/60">
                    Browse pre-NFT memes, amplify your favorites with votes, and stake ICP to graduate them into collectible
                    tokens.
                  </p>
                </div>
                <Button
                  variant="outline"
                  className="h-11 rounded-full border-cyan-400/50 px-6 text-cyan-200 hover:bg-cyan-500/10"
                  onClick={() => navigate("/portfolio")}
                >
                  <BarChart3 className="mr-2 h-4 w-4" /> My Portfolio
                </Button>
              </div>

              <div className="flex flex-wrap gap-3">
                {TIMEFRAMES.map((item) => {
                  const active = item.value === timeframe;
                  return (
                    <Button
                      key={item.value}
                      variant={active ? "default" : "outline"}
                      className={`rounded-full px-5 ${
                        active
                          ? "bg-gradient-to-r from-purple-500 via-primary to-cyan-400 text-black"
                          : "border-white/20 bg-white/5 text-white"
                      }`}
                      onClick={() => setTimeframe(item.value)}
                    >
                      {item.label}
                    </Button>
                  );
                })}
              </div>
            </header>

            <Card className="border-white/10 bg-slate-900/70 backdrop-blur">
              <CardContent className="grid gap-6 p-6">
                <div className="grid grid-cols-1 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_auto]">
                  <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4">
                    <Search className="h-4 w-4 text-white/60" />
                    <Input
                      value={search}
                      onChange={(event) => setSearch(event.target.value)}
                      placeholder="Search memes or creators"
                      className="h-11 border-0 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-0"
                    />
                  </div>

                  <div className="grid grid-cols-1 gap-3 sm:grid-cols-3">
                    <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                      <Filter className="h-4 w-4 text-white/50" />
                      <select
                        value={blockchain}
                        onChange={(event) => setBlockchain(event.target.value)}
                        className="w-full bg-transparent text-sm text-white focus:outline-none"
                      >
                        {BLOCKCHAIN_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                      <Layers className="h-4 w-4 text-white/50" />
                      <select
                        value={category}
                        onChange={(event) => setCategory(event.target.value)}
                        className="w-full bg-transparent text-sm text-white focus:outline-none"
                      >
                        {CATEGORY_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>

                    <label className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                      <ListFilter className="h-4 w-4 text-white/50" />
                      <select
                        value={sort}
                        onChange={(event) => setSort(event.target.value)}
                        className="w-full bg-transparent text-sm text-white focus:outline-none"
                      >
                        {SORT_OPTIONS.map((option) => (
                          <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                            {option.label}
                          </option>
                        ))}
                      </select>
                    </label>
                  </div>

                  <div className="flex items-center gap-3">
                    <Button
                      variant="outline"
                      className="flex-1 border-white/20 bg-white/5 text-white"
                      onClick={() => setDirection((dir) => (dir === "asc" ? "desc" : "asc"))}
                    >
                      {direction === "asc" ? (
                        <ArrowUpWideNarrow className="mr-2 h-4 w-4" />
                      ) : (
                        <ArrowDownWideNarrow className="mr-2 h-4 w-4" />
                      )}
                      {direction === "asc" ? "Ascending" : "Descending"}
                    </Button>
                    <Button
                      className="h-11 rounded-full bg-gradient-to-r from-cyan-500 via-primary to-purple-500 text-black"
                      onClick={handleRefresh}
                    >
                      <RefreshCw className="mr-2 h-4 w-4" /> Refresh Votes
                    </Button>
                  </div>
                </div>

                <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                      <Award className="h-4 w-4" /> Top Votes
                    </p>
                    <motion.p
                      key={leaderboard.topVotes}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-2xl font-semibold"
                    >
                      {leaderboard.topVotes.toLocaleString()}
                    </motion.p>
                    <p className="text-xs text-white/50">Leading meme today</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                      <Coins className="h-4 w-4" /> Total Stake
                    </p>
                    <motion.p
                      key={leaderboard.totalStake.toFixed(2)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-2xl font-semibold"
                    >
                      {leaderboard.totalStake.toFixed(2)} ICP
                    </motion.p>
                    <p className="text-xs text-white/50">Across this board</p>
                  </div>
                  <div className="rounded-3xl border border-white/10 bg-white/5 p-4">
                    <p className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
                      <TrendingUp className="h-4 w-4" /> Avg Participation
                    </p>
                    <motion.p
                      key={leaderboard.avgParticipation.toFixed(1)}
                      initial={{ opacity: 0, y: 6 }}
                      animate={{ opacity: 1, y: 0 }}
                      className="mt-2 text-2xl font-semibold"
                    >
                      {leaderboard.avgParticipation.toFixed(1)}%
                    </motion.p>
                    <p className="text-xs text-white/50">Community activation</p>
                  </div>
                </div>
              </CardContent>
            </Card>

            {loading ? (
              <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                {Array.from({ length: 6 }).map((_, index) => (
                  <motion.div
                    key={index}
                    className="h-[28rem] animate-pulse rounded-3xl border border-white/5 bg-white/5"
                    initial={{ opacity: 0 }}
                    animate={{ opacity: 1 }}
                  />
                ))}
              </div>
            ) : filteredMemes.length ? (
              <div className="space-y-10">
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredMemes.map((meme, index) => (
                    <MemeCard
                      key={meme.id}
                      meme={meme}
                      index={index}
                      onVote={handleVote}
                      onStake={handleStakeOpen}
                      onDetails={setSelectedMeme}
                      disabled={!isAuthenticated}
                    />
                  ))}
                </div>

                <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-6">
                  <div>
                    <p className="text-sm font-semibold">More memes loading soon</p>
                    <p className="text-xs text-white/50">Pagination hooks into infinite scroll for the live dapp.</p>
                  </div>
                  <Button variant="outline" className="border-white/20 bg-white/5 text-white" onClick={handleRefresh}>
                    Load Next Page
                  </Button>
                </div>
              </div>
            ) : (
              <Card className="border-dashed border-white/20 bg-white/5 py-16 text-center text-white/70">
                <CardContent className="space-y-4">
                  <Sparkles className="mx-auto h-10 w-10 text-cyan-200" />
                  <CardTitle className="text-xl">No memes yet — be first to create!</CardTitle>
                  <p className="text-sm text-white/60">
                    Fire up the creative studio and submit your meme to kickstart this leaderboard.
                  </p>
                  <Button
                    className="bg-gradient-to-r from-purple-500 via-primary to-cyan-400 text-black"
                    onClick={() => navigate("/create")}
                  >
                    Launch Creative Space
                  </Button>
                </CardContent>
              </Card>
            )}
          </div>
        </div>
      </div>

      <StakeDialog
        meme={stakeTarget}
        amount={stakeAmount}
        setAmount={setStakeAmount}
        onClose={() => setStakeTarget(null)}
        onConfirm={handleStakeConfirm}
        loading={stakeLoading}
      />

      <DetailsDrawer
        meme={selectedMeme}
        onClose={() => setSelectedMeme(null)}
        onStake={handleStakeOpen}
        onVote={handleVote}
      />
    </div>
  );
};

export default PreMarketplace;
