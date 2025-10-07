import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Activity,
  ArrowUpDown,
  BarChart3,
  Crown,
  Filter,
  Gavel,
  LayoutGrid,
  RefreshCw,
  Search,
  Sparkles,
  SquareStack,
  Table as TableIcon,
  Wallet,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardTitle } from "../components/ui/Card";
import { Badge } from "../components/ui/Badge";
import { Input } from "../components/ui/Input";
import { useToast } from "../hooks/use-toast";
import { useAuth } from "../contexts/AuthContext";
import backendService from "../services/backendService";

const TIMEFRAME_OPTIONS = [
  { label: "24h", value: "24h" },
  { label: "7d", value: "7d" },
  { label: "30d", value: "30d" },
];

const STATUS_OPTIONS = [
  { label: "All", value: "all" },
  { label: "On sale", value: "sale" },
  { label: "Auction", value: "auction" },
];

const DENOM_OPTIONS = [
  { label: "ICP", value: "icp" },
];

const SORTABLE_COLUMNS = [
  { key: "floor", label: "Floor" },
  { key: "supply", label: "Supply" },
  { key: "topOffer", label: "Top Offer" },
  { key: "sales24h", label: "Sales 24h" },
];

const FALLBACK_COLLECTIONS = [
  {
    id: "col-1",
    name: "Cycles Overload",
    imageUrl: "https://images.unsplash.com/photo-1526498460520-4c246339dccb?auto=format&fit=crop&w=800&q=80",
    collector: "@cyclesorcerer",
    creator: "@dfinity",
    floor: 12.4,
    supply: 32,
    topOffer: 11.8,
    sales24h: 6,
    change24h: 14,
    tokenId: "40101",
  },
  {
    id: "col-2",
    name: "Zero Gas Drip",
    imageUrl: "https://images.unsplash.com/photo-1498050108023-c5249f4df085?auto=format&fit=crop&w=800&q=80",
    collector: "@openchattrader",
    creator: "@memeonaut",
    floor: 6.9,
    supply: 18,
    topOffer: 6.1,
    sales24h: 4,
    change24h: -2,
    tokenId: "40102",
  },
  {
    id: "col-3",
    name: "Governance Wins",
    imageUrl: "https://images.unsplash.com/photo-1545239351-1141bd82e8a6?auto=format&fit=crop&w=800&q=80",
    collector: "@daoqueen",
    creator: "@governor",
    floor: 18.2,
    supply: 12,
    topOffer: 17.5,
    sales24h: 9,
    change24h: 21,
    tokenId: "40103",
  },
  {
    id: "col-4",
    name: "Motoko Mischief",
    imageUrl: "https://images.unsplash.com/photo-1511512578047-dfb367046420?auto=format&fit=crop&w=800&q=80",
    collector: "@motokodev",
    creator: "@icp_party",
    floor: 4.3,
    supply: 44,
    topOffer: 4,
    sales24h: 5,
    change24h: 6,
    tokenId: "40104",
  },
];

const formatPrincipal = (principal) => {
  if (!principal) return "Connect Wallet";
  if (principal.length <= 12) return principal;
  return `${principal.slice(0, 5)}…${principal.slice(-3)}`;
};

const numberFormatter = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 0,
  maximumFractionDigits: 2,
});

const LeaderboardStrip = ({ collections }) => {
  const sorted = [...collections];
  sorted.sort((a, b) => (b.floor ?? 0) - (a.floor ?? 0));
  const topFloor = sorted[0];

  sorted.sort((a, b) => (b.sales24h ?? 0) - (a.sales24h ?? 0));
  const mostSales = sorted[0];

  sorted.sort((a, b) => (b.change24h ?? 0) - (a.change24h ?? 0));
  const trending = sorted[0];

  const cards = [
    {
      label: "Top Floor",
      stat: topFloor ? `${numberFormatter.format(topFloor.floor)} ICP` : "—",
      sublabel: topFloor ? topFloor.name : "Awaiting listings",
      icon: Crown,
    },
    {
      label: "Most Sales 24h",
      stat: mostSales ? `${mostSales.sales24h ?? 0}` : "0",
      sublabel: mostSales ? mostSales.name : "Bring liquidity",
      icon: Activity,
    },
    {
      label: "New Collections",
      stat: `${collections.length}`,
      sublabel: "Eligible pre-meme winners",
      icon: Sparkles,
    },
  ];

  return (
    <div className="grid gap-4 md:grid-cols-3">
      {cards.map(({ icon: Icon, label, stat, sublabel }) => (
        <Card key={label} className="border-white/10 bg-white/5 backdrop-blur">
          <CardContent className="flex items-center gap-4 p-4 text-white">
            <div className="rounded-2xl bg-white/10 p-3">
              <Icon className="h-5 w-5" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">{label}</p>
              <p className="text-lg font-semibold">{stat}</p>
              <p className="text-xs text-white/60">{sublabel}</p>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

const TableHeaderCell = ({ label, sortable, active, direction, onClick }) => (
  <th
    scope="col"
    className="sticky top-0 z-10 bg-slate-950/80 px-4 py-3 text-left text-xs font-semibold uppercase tracking-wide text-white/60 backdrop-blur"
  >
    <button
      type="button"
      onClick={sortable ? onClick : undefined}
      className={`inline-flex items-center gap-1 text-white ${sortable ? "hover:text-cyan-200" : "cursor-default"}`}
    >
      {label}
      {sortable ? <ArrowUpDown className={`h-3.5 w-3.5 ${active ? "text-cyan-300" : "text-white/40"}`} /> : null}
      {sortable && active ? (
        <span className="text-[10px] uppercase text-cyan-200/70">{direction === "asc" ? "Asc" : "Desc"}</span>
      ) : null}
    </button>
  </th>
);

const ActionModal = ({ action, collection, open, onClose, onConfirm, value, setValue, secondaryValue, setSecondaryValue, loading }) => (
  <AnimatePresence>
    {open ? (
      <motion.div
        className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        exit={{ opacity: 0 }}
      >
        <motion.div
          initial={{ opacity: 0, scale: 0.9 }}
          animate={{ opacity: 1, scale: 1 }}
          exit={{ opacity: 0, scale: 0.9 }}
          transition={{ type: "spring", stiffness: 240, damping: 18 }}
          className="w-full max-w-md rounded-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-2xl"
        >
          <div className="flex items-start justify-between">
            <div>
              <p className="text-xs uppercase tracking-[0.3em] text-white/50">{action?.label}</p>
              <h3 className="mt-2 text-2xl font-semibold">{collection?.name}</h3>
            </div>
            <Button variant="ghost" className="h-9 w-9" onClick={onClose}>
              ✕
            </Button>
          </div>

          <div className="mt-5 flex items-center gap-4 rounded-2xl border border-white/10 bg-white/5 p-4">
            <img src={collection?.imageUrl} alt={collection?.name} className="h-16 w-16 rounded-xl object-cover" />
            <div>
              <p className="text-sm text-white/70">Collector</p>
              <p className="text-base font-semibold">{collection?.collector}</p>
              <p className="text-xs text-white/50">Token #{collection?.tokenId}</p>
            </div>
          </div>

          <label className="mt-6 block text-sm font-medium text-white/80">
            Amount (ICP)
            <Input
              type="number"
              min="0"
              step="0.01"
              value={value}
              onChange={(event) => setValue(event.target.value)}
              className="mt-2 bg-slate-900/80 text-white"
            />
          </label>

          {action?.requiresExpiry ? (
            <label className="mt-4 block text-sm font-medium text-white/80">
              Offer expiry (hours)
              <Input
                type="number"
                min="1"
                step="1"
                value={secondaryValue}
                onChange={(event) => setSecondaryValue(event.target.value)}
                className="mt-2 bg-slate-900/80 text-white"
              />
            </label>
          ) : null}

          <div className="mt-6 flex gap-3">
            <Button className="flex-1" onClick={onConfirm} disabled={loading}>
              {loading ? "Processing…" : action?.cta}
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

const DetailsDrawer = ({ collection, onClose, onBuy, onOffer, onList, onAuction, disabled }) => (
  <AnimatePresence>
    {collection ? (
      <motion.aside
        className="fixed inset-x-0 bottom-0 z-40 max-h-[90vh] overflow-y-auto rounded-t-3xl border border-white/10 bg-slate-950/95 p-6 text-white shadow-[0_-30px_60px_rgba(15,23,42,0.6)] md:right-6 md:bottom-6 md:top-6 md:my-auto md:h-[calc(100vh-3rem)] md:w-[420px] md:rounded-3xl"
        initial={{ y: 200, opacity: 0 }}
        animate={{ y: 0, opacity: 1 }}
        exit={{ y: 200, opacity: 0 }}
        transition={{ type: "spring", stiffness: 220, damping: 22 }}
      >
        <div className="flex items-start justify-between">
          <div>
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">NFT Details</p>
            <h3 className="mt-1 text-2xl font-semibold">{collection.name}</h3>
            <p className="text-sm text-white/60">Collector {collection.collector}</p>
          </div>
          <Button variant="ghost" className="h-9 w-9" onClick={onClose}>
            ✕
          </Button>
        </div>

        <div className="mt-5 overflow-hidden rounded-2xl border border-white/10">
          <img src={collection.imageUrl} alt={collection.name} className="w-full" loading="lazy" />
        </div>

        <div className="mt-6 grid grid-cols-2 gap-3 text-xs text-white/70">
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Floor</p>
            <p className="mt-2 text-2xl font-semibold">{numberFormatter.format(collection.floor)} ICP</p>
            <p className="text-xs text-white/50">Lowest listing price</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Top Offer</p>
            <p className="mt-2 text-2xl font-semibold">{numberFormatter.format(collection.topOffer)} ICP</p>
            <p className="text-xs text-white/50">Highest incoming bid</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Supply</p>
            <p className="mt-2 text-2xl font-semibold">{collection.supply}</p>
            <p className="text-xs text-white/50">Edition size</p>
          </div>
          <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Sales 24h</p>
            <p className="mt-2 text-2xl font-semibold">{collection.sales24h}</p>
            <p className="text-xs text-white/50">Past day volume</p>
          </div>
        </div>

        <div className="mt-6 space-y-4 text-sm text-white/70">
          <p>
            Recent trades show steady demand. Graduated memes from the pre-marketplace arrive here ready for collectors,
            auctions, and liquidity events.
          </p>
          <div className="rounded-2xl border border-cyan-500/20 bg-cyan-500/10 p-4 text-cyan-100">
            <p className="text-xs uppercase tracking-[0.3em] text-cyan-200/70">Recent Activity</p>
            <ul className="mt-2 space-y-2 text-sm">
              <li>• @icp_dao purchased at {numberFormatter.format(collection.floor)} ICP</li>
              <li>• @meme_fund placed an offer for {numberFormatter.format(collection.topOffer)} ICP</li>
              <li>• @auction_master listed supply batch of {collection.supply}</li>
            </ul>
          </div>
        </div>

        <div className="mt-6 space-y-3">
          <Button className="w-full" onClick={() => onBuy(collection)} disabled={disabled}>
            Buy Now
          </Button>
          <div className="grid grid-cols-2 gap-3">
            <Button variant="outline" className="w-full" onClick={() => onOffer(collection)} disabled={disabled}>
              Make Offer
            </Button>
            <Button variant="outline" className="w-full" onClick={() => onAuction(collection)}>
              Start Auction
            </Button>
          </div>
          <Button variant="ghost" className="w-full" onClick={() => onList(collection)} disabled={disabled}>
            List for Sale
          </Button>
        </div>
      </motion.aside>
    ) : null}
  </AnimatePresence>
);

const Marketplace = () => {
  const navigate = useNavigate();
  const { toast } = useToast();
  const { isAuthenticated, principal } = useAuth();

  const [collections, setCollections] = useState([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState("");
  const [timeframe, setTimeframe] = useState("24h");
  const [status, setStatus] = useState("all");
  const [denom, setDenom] = useState("icp");
  const [viewMode, setViewMode] = useState("table");
  const [sortKey, setSortKey] = useState("floor");
  const [sortDir, setSortDir] = useState("desc");
  const [selected, setSelected] = useState(null);
  const [actionConfig, setActionConfig] = useState(null);
  const [actionTarget, setActionTarget] = useState(null);
  const [actionValue, setActionValue] = useState("0");
  const [actionSecondary, setActionSecondary] = useState("24");
  const [actionLoading, setActionLoading] = useState(false);
  const [walletBalance, setWalletBalance] = useState(null);
  const [refreshKey, setRefreshKey] = useState(0);

  useEffect(() => {
    let isMounted = true;
    const controller = new AbortController();

    const loadCollections = async () => {
      setLoading(true);
      try {
        const params = new URLSearchParams({
          tf: timeframe,
          status,
          denom,
          sort: `${sortKey}_${sortDir}`,
        });
        if (search) params.set("q", search);

        const response = await fetch(`/api/nft-market?${params.toString()}`, {
          signal: controller.signal,
        });

        if (!response.ok) {
          throw new Error(`Failed to load marketplace data (${response.status})`);
        }

        const data = await response.json();
        if (!isMounted) return;

        const normalized = Array.isArray(data)
          ? data.map((item, index) => ({
              id: String(item.id ?? index),
              name: item.name ?? item.collection ?? "Untitled Collection",
              imageUrl: item.imageUrl ?? item.image_url ?? FALLBACK_COLLECTIONS[index % FALLBACK_COLLECTIONS.length].imageUrl,
              collector: item.collector ?? item.owner ?? "@anon",
              creator: item.creator ?? item.artist ?? "@creator",
              floor: Number(item.floor ?? 0),
              supply: Number(item.supply ?? 0),
              topOffer: Number(item.topOffer ?? item.top_offer ?? 0),
              sales24h: Number(item.sales24h ?? item.sales_24h ?? 0),
              change24h: Number(item.change24h ?? item.change_24h ?? 0),
              tokenId: item.tokenId ?? item.token_id ?? String(index),
            }))
          : [];

        setCollections(normalized);
      } catch (error) {
        if (error.name === "AbortError") return;
        console.warn("Falling back to mock NFT marketplace data", error);
        if (isMounted) {
          setCollections(FALLBACK_COLLECTIONS);
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    };

    const loadWalletBalance = async () => {
      try {
        const res = await fetch("/api/user", { signal: controller.signal });
        if (!res.ok) return;
        const data = await res.json();
        if (!isMounted) return;
        if (data?.balance_icp != null) {
          setWalletBalance(Number(data.balance_icp));
        }
      } catch (error) {
        if (error.name === "AbortError") return;
        // Silent failure: display fallback chip
      }
    };

    loadCollections();
    loadWalletBalance();

    return () => {
      isMounted = false;
      controller.abort();
    };
  }, [timeframe, status, denom, sortKey, sortDir, search, refreshKey]);

  const filteredCollections = useMemo(() => {
    const lowerSearch = search.trim().toLowerCase();
    const filtered = collections.filter((item) => {
      if (!lowerSearch) return true;
      return (
        item.name.toLowerCase().includes(lowerSearch) ||
        item.collector.toLowerCase().includes(lowerSearch) ||
        item.creator.toLowerCase().includes(lowerSearch)
      );
    });

    const sorted = [...filtered].sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      const aValue = a[sortKey] ?? 0;
      const bValue = b[sortKey] ?? 0;
      return dir * (aValue - bValue);
    });

    return sorted;
  }, [collections, search, sortKey, sortDir]);

  const handleSort = (key) => {
    if (sortKey === key) {
      setSortDir((dir) => (dir === "asc" ? "desc" : "asc"));
    } else {
      setSortKey(key);
      setSortDir("desc");
    }
  };

  const openAction = (action, collection) => {
    if (!isAuthenticated && action.requiresAuth !== false) {
      toast({
        title: "Connect your wallet",
        description: "Login with Internet Identity to trade NFTs.",
      });
      return;
    }

    setActionConfig(action);
    setActionTarget(collection);
    setActionValue(String(collection?.floor ?? 0));
    setActionSecondary("24");
  };

  const closeAction = () => {
    setActionConfig(null);
    setActionValue("0");
    setActionSecondary("24");
    setActionTarget(null);
  };

  const handleActionConfirm = async () => {
    if (!actionConfig || !actionTarget) return;

    const amount = Number(actionValue);
    if (!Number.isFinite(amount) || amount <= 0) {
      toast({ title: "Invalid amount", description: "Enter a positive ICP amount." });
      return;
    }

    try {
      setActionLoading(true);
      if (actionConfig.key === "buy") {
        await backendService.purchaseNFT(actionTarget.tokenId, amount);
        toast({ title: "Purchase submitted", description: `${actionTarget.name} for ${amount.toFixed(2)} ICP` });
      } else if (actionConfig.key === "offer") {
        const expiryHours = Number(actionSecondary);
        await backendService.makeOffer(actionTarget.tokenId, amount, expiryHours * 3600);
        toast({
          title: "Offer placed",
          description: `Offer of ${amount.toFixed(2)} ICP sent to ${actionTarget.collector}`,
        });
      } else if (actionConfig.key === "list") {
        await backendService.listNFT(actionTarget.tokenId, amount);
        toast({ title: "Listing created", description: `Listed at ${amount.toFixed(2)} ICP` });
      } else if (actionConfig.key === "auction") {
        const durationHours = Number(actionSecondary) || 72;
        await backendService.startAuction(actionTarget.tokenId, amount, durationHours * 3600);
        toast({
          title: "Auction launched",
          description: `${durationHours}h auction scheduled at ${amount.toFixed(2)} ICP`,
        });
      }
      closeAction();
      setRefreshKey((value) => value + 1);
    } catch (error) {
      toast({ title: "Action failed", description: error.message, variant: "destructive" });
    } finally {
      setActionLoading(false);
    }
  };

  const actionDefinitions = useMemo(
    () => ({
      buy: { key: "buy", label: "Buy Now", cta: "Confirm Purchase" },
      offer: { key: "offer", label: "Make Offer", cta: "Submit Offer", requiresExpiry: true },
      list: { key: "list", label: "List for Sale", cta: "Create Listing" },
      auction: { key: "auction", label: "Start Auction", cta: "Launch Auction", requiresExpiry: true },
    }),
    []
  );

  const openBuy = (collection) => openAction(actionDefinitions.buy, collection);
  const openOffer = (collection) => openAction(actionDefinitions.offer, collection);
  const openList = (collection) => openAction(actionDefinitions.list, collection);
  const openAuction = (collection) => openAction(actionDefinitions.auction, collection);

  const walletChip = walletBalance != null ? `${walletBalance.toFixed(2)} ICP` : "Wallet";

  return (
    <div className="min-h-screen bg-gradient-to-b from-slate-950 via-slate-900 to-slate-950 text-white">
      <div className="mx-auto w-full max-w-7xl px-6 pb-24 pt-28">
        <header className="flex flex-col gap-6 lg:flex-row lg:items-center lg:justify-between">
          <div className="space-y-3">
            <p className="text-xs uppercase tracking-[0.3em] text-white/50">Trading Board</p>
            <h1 className="text-3xl font-semibold md:text-4xl">Meme NFT Marketplace</h1>
            <p className="max-w-2xl text-sm text-white/60">
              Track floor prices, supply, top offers, and velocity as graduated memes move through ICP's collectible economy.
            </p>
          </div>
          <div className="flex flex-wrap items-center gap-3">
            <div className="flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-sm text-white/70">
              <Wallet className="h-4 w-4 text-cyan-300" />
              <span>{formatPrincipal(principal)}</span>
              <Badge className="bg-cyan-500/10 text-xs text-cyan-200">{walletChip}</Badge>
            </div>
            <Button
              variant="outline"
              className="h-11 rounded-full border-cyan-400/50 px-6 text-cyan-200 hover:bg-cyan-500/10"
              onClick={() => navigate("/portfolio#nfts")}
            >
              <SquareStack className="mr-2 h-4 w-4" /> My NFTs
            </Button>
          </div>
        </header>

        <div className="mt-10 grid gap-6 rounded-3xl border border-white/10 bg-slate-900/70 p-6 backdrop-blur">
          <div className="grid gap-4 lg:grid-cols-[minmax(0,1.5fr)_minmax(0,1fr)] lg:items-center">
            <div className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4">
              <Search className="h-4 w-4 text-white/50" />
              <Input
                value={search}
                onChange={(event) => setSearch(event.target.value)}
                placeholder="Search collection or meme"
                className="h-11 border-0 bg-transparent text-white placeholder:text-white/40 focus-visible:ring-0"
              />
            </div>

            <div className="flex flex-wrap items-center gap-3 justify-end">
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                <Filter className="h-4 w-4 text-white/50" />
                <select
                  value={timeframe}
                  onChange={(event) => setTimeframe(event.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none"
                >
                  {TIMEFRAME_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                <Gavel className="h-4 w-4 text-white/50" />
                <select
                  value={status}
                  onChange={(event) => setStatus(event.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none"
                >
                  {STATUS_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <div className="flex items-center gap-2 rounded-2xl border border-white/10 bg-white/5 px-4 text-sm text-white/70">
                <BarChart3 className="h-4 w-4 text-white/50" />
                <select
                  value={denom}
                  onChange={(event) => setDenom(event.target.value)}
                  className="bg-transparent text-sm text-white focus:outline-none"
                >
                  {DENOM_OPTIONS.map((option) => (
                    <option key={option.value} value={option.value} className="bg-slate-900 text-white">
                      {option.label}
                    </option>
                  ))}
                </select>
              </div>
              <Button
                variant="outline"
                className="h-11 rounded-full border-white/20 bg-white/5 text-white"
                onClick={() => setRefreshKey((value) => value + 1)}
              >
                <RefreshCw className="mr-2 h-4 w-4" /> Refresh
              </Button>
            </div>
          </div>

          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex items-center gap-2 text-xs uppercase tracking-[0.3em] text-white/50">
              <TableIcon className="h-4 w-4" />
              <span>{filteredCollections.length} Collections</span>
            </div>
            <div className="flex items-center gap-2">
              <Button
                variant={viewMode === "table" ? "default" : "outline"}
                className={`h-10 rounded-full px-4 ${viewMode === "table" ? "bg-white text-black" : "border-white/20 text-white"}`}
                onClick={() => setViewMode("table")}
              >
                <TableIcon className="mr-2 h-4 w-4" /> Table
              </Button>
              <Button
                variant={viewMode === "cards" ? "default" : "outline"}
                className={`h-10 rounded-full px-4 ${viewMode === "cards" ? "bg-white text-black" : "border-white/20 text-white"}`}
                onClick={() => setViewMode("cards")}
              >
                <LayoutGrid className="mr-2 h-4 w-4" /> Cards
              </Button>
            </div>
          </div>
        </div>

        <div className="mt-8 space-y-8">
          <LeaderboardStrip collections={filteredCollections} />

          {loading ? (
            <div className="grid gap-4">
              {Array.from({ length: 4 }).map((_, index) => (
                <motion.div
                  key={index}
                  className="h-24 animate-pulse rounded-2xl border border-white/10 bg-white/5"
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                />
              ))}
            </div>
          ) : filteredCollections.length ? (
            <>
              {viewMode === "table" ? (
                <div className="overflow-hidden rounded-3xl border border-white/10">
                  <div className="max-h-[640px] overflow-auto">
                    <table className="min-w-full divide-y divide-white/10 text-sm">
                      <thead>
                        <tr>
                          <TableHeaderCell label="#" />
                          <TableHeaderCell label="Meme / Collection" />
                          <TableHeaderCell label="Collector / Creator" />
                          {SORTABLE_COLUMNS.map(({ key, label }) => (
                            <TableHeaderCell
                              key={key}
                              label={label}
                              sortable
                              active={sortKey === key}
                              direction={sortDir}
                              onClick={() => handleSort(key)}
                            />
                          ))}
                          <TableHeaderCell label="Actions" />
                        </tr>
                      </thead>
                      <tbody className="divide-y divide-white/5 bg-slate-950/40">
                        {filteredCollections.map((collection, index) => (
                          <motion.tr
                            key={collection.id}
                            layout
                            whileHover={{ backgroundColor: "rgba(148,163,184,0.1)" }}
                            className="cursor-pointer"
                            onClick={() => setSelected(collection)}
                          >
                            <td className="px-4 py-4 text-xs text-white/50">{index + 1}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-3">
                                <img
                                  src={collection.imageUrl}
                                  alt={collection.name}
                                  className="h-12 w-12 rounded-xl object-cover"
                                />
                                <div>
                                  <p className="font-semibold text-white">{collection.name}</p>
                                  <p className="text-xs text-white/60">Token #{collection.tokenId}</p>
                                </div>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-xs text-white/70">
                              <div className="space-y-1">
                                <p>Collector {collection.collector}</p>
                                <p className="text-white/50">Creator {collection.creator}</p>
                              </div>
                            </td>
                            <td className="px-4 py-4 font-semibold text-white">
                              {numberFormatter.format(collection.floor)} ICP
                            </td>
                            <td className="px-4 py-4 text-white/70">{collection.supply}</td>
                            <td className="px-4 py-4 text-white">
                              {numberFormatter.format(collection.topOffer)} ICP
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2">
                                <span>{collection.sales24h}</span>
                                <Badge
                                  className={
                                    collection.change24h >= 0
                                      ? "bg-emerald-500/15 text-emerald-200"
                                      : "bg-rose-500/15 text-rose-200"
                                  }
                                >
                                  {collection.change24h >= 0 ? "+" : ""}
                                  {collection.change24h}%
                                </Badge>
                              </div>
                            </td>
                            <td className="px-4 py-4">
                              <div className="flex flex-wrap items-center gap-2">
                                <Button
                                  size="sm"
                                  className="bg-cyan-400 text-black"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openBuy(collection);
                                  }}
                                >
                                  Buy
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-white/20 text-white"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openOffer(collection);
                                  }}
                                >
                                  Offer
                                </Button>
                                <Button
                                  size="sm"
                                  variant="outline"
                                  className="border-white/20 text-white"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openList(collection);
                                  }}
                                >
                                  List
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  className="text-cyan-200"
                                  onClick={(event) => {
                                    event.stopPropagation();
                                    openAuction(collection);
                                  }}
                                >
                                  Auction
                                </Button>
                              </div>
                            </td>
                          </motion.tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                </div>
              ) : (
                <div className="grid gap-6 sm:grid-cols-2 xl:grid-cols-3">
                  {filteredCollections.map((collection, index) => (
                    <motion.div
                      key={collection.id}
                      layout
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      transition={{ duration: 0.25, delay: index * 0.04 }}
                      className="flex h-full flex-col overflow-hidden rounded-3xl border border-white/10 bg-slate-900/60 shadow-lg backdrop-blur"
                    >
                      <img src={collection.imageUrl} alt={collection.name} className="h-48 w-full object-cover" />
                      <div className="flex flex-1 flex-col gap-4 p-5">
                        <div>
                          <h3 className="text-lg font-semibold text-white">{collection.name}</h3>
                          <p className="text-xs text-white/60">Collector {collection.collector}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-3 text-xs text-white/70">
                          <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Floor</p>
                            <p className="mt-1 text-base font-semibold text-white">
                              {numberFormatter.format(collection.floor)} ICP
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Top Offer</p>
                            <p className="mt-1 text-base font-semibold text-white">
                              {numberFormatter.format(collection.topOffer)} ICP
                            </p>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Supply</p>
                            <p className="mt-1 text-base font-semibold text-white">{collection.supply}</p>
                          </div>
                          <div className="rounded-xl border border-white/5 bg-white/5 px-3 py-2">
                            <p className="text-[11px] uppercase tracking-[0.3em] text-white/50">Sales 24h</p>
                            <p className="mt-1 text-base font-semibold text-white">{collection.sales24h}</p>
                          </div>
                        </div>
                        <div className="mt-auto flex flex-wrap items-center gap-2">
                          <Button className="flex-1 bg-cyan-400 text-black" onClick={() => openBuy(collection)}>
                            Buy Now
                          </Button>
                          <Button
                            variant="outline"
                            className="flex-1 border-white/20 text-white"
                            onClick={() => openOffer(collection)}
                          >
                            Offer
                          </Button>
                        </div>
                        <Button variant="ghost" className="mt-2 text-cyan-200" onClick={() => setSelected(collection)}>
                          View Details
                        </Button>
                      </div>
                    </motion.div>
                  ))}
                </div>
              )}

              <div className="flex items-center justify-between rounded-3xl border border-white/10 bg-slate-900/70 p-6">
                <div>
                  <p className="text-sm font-semibold">Stay updated</p>
                  <p className="text-xs text-white/50">Pagination hooks into infinite scroll when connected to live canisters.</p>
                </div>
                <Button variant="outline" className="border-white/20 text-white" onClick={() => setRefreshKey((value) => value + 1)}>
                  Load More
                </Button>
              </div>
            </>
          ) : (
            <Card className="border-dashed border-white/20 bg-white/5 py-16 text-center text-white/70">
              <CardContent className="space-y-4">
                <Sparkles className="mx-auto h-10 w-10 text-cyan-200" />
                <CardTitle className="text-xl">No listings yet</CardTitle>
                <p className="text-sm text-white/60">
                  Graduated memes will appear here once they are minted. Check the pre-marketplace to support upcoming drops.
                </p>
                <Button className="bg-gradient-to-r from-purple-500 via-primary to-cyan-400 text-black" onClick={() => navigate("/pre-marketplace")}>
                  Browse Pre Meme Marketplace
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

      <DetailsDrawer
        collection={selected}
        onClose={() => setSelected(null)}
        onBuy={openBuy}
        onOffer={openOffer}
        onList={openList}
        onAuction={openAuction}
        disabled={!isAuthenticated}
      />

      <ActionModal
        action={actionConfig}
        collection={actionTarget}
        open={Boolean(actionConfig)}
        onClose={closeAction}
        onConfirm={handleActionConfirm}
        value={actionValue}
        setValue={setActionValue}
        secondaryValue={actionSecondary}
        setSecondaryValue={setActionSecondary}
        loading={actionLoading}
      />
    </div>
  );
};

export default Marketplace;
