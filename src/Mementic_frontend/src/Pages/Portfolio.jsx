import { useEffect, useMemo, useRef, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion, AnimatePresence, useMotionValue, useSpring } from "framer-motion";
import {
  Menu,
  X,
  Sparkles,
  Wallet,
  Coins,
  Gauge,
  ShieldCheck,
  Crown,
  LineChart,
  ArrowUpRight,
  ArrowDownToLine,
  Download,
  TrendingUp,
  Trophy,
} from "lucide-react";
import { Button } from "../components/ui/Button";
import { Badge } from "../components/ui/Badge";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { useToast } from "../hooks/use-toast";
import useICPPortfolioData from "../hooks/useICPPortfolioData";

const NAV_ITEMS = [
  { label: "Home", href: "/" },
  { label: "Marketplace", href: "/marketplace" },
  { label: "NFTs", href: "/nft-marketplace" },
  { label: "Auction", href: "/auction" },
  { label: "Profile", href: "/portfolio" },
];

const formatNumber = (value) => {
  const numeric = Number(value || 0);
  if (!Number.isFinite(numeric)) return "0";
  return new Intl.NumberFormat("en-US", {
    notation: numeric >= 1000 ? "compact" : "standard",
    maximumFractionDigits: numeric >= 1000 ? 1 : 0,
  }).format(numeric);
};

const formatCurrency = (value) => {
  const numeric = Number(value || 0);
  return `${numeric >= 0 ? "" : "-"}${new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
    minimumFractionDigits: numeric >= 100 ? 0 : 2,
  }).format(Math.abs(numeric))} ICP`.replace("$", "");
};

const AnimatedNumber = ({ value, format = "number" }) => {
  const ref = useRef(null);
  const motionValue = useMotionValue(0);
  const spring = useSpring(motionValue, {
    stiffness: 120,
    damping: 20,
    mass: 0.5,
  });

  useEffect(() => {
    motionValue.set(Number(value) || 0);
  }, [value, motionValue]);

  useEffect(() => {
    const unsubscribe = spring.on("change", (latest) => {
      if (!ref.current) return;
      if (format === "currency") {
        ref.current.textContent = formatCurrency(latest);
      } else if (format === "percent") {
        ref.current.textContent = `${Math.round(latest)}%`;
      } else {
        ref.current.textContent = formatNumber(latest);
      }
    });

    return () => unsubscribe();
  }, [format, spring]);

  return <span ref={ref}>0</span>;
};

const SummaryMetric = ({ title, icon: Icon, value, sublabel, format = "number" }) => (
  <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur">
    <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-white/10 via-transparent to-primary/20" />
    <CardHeader className="relative flex flex-row items-center justify-between pb-2">
      <CardTitle className="text-sm font-medium text-white/70">{title}</CardTitle>
      <Icon className="h-5 w-5 text-cyan-300" />
    </CardHeader>
    <CardContent className="relative">
      <div className="text-3xl font-semibold tracking-tight text-white">
        <AnimatedNumber value={value} format={format} />
      </div>
      {sublabel ? (
        <p className="mt-1 text-sm text-white/60">{sublabel}</p>
      ) : null}
    </CardContent>
  </Card>
);

const Portfolio = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const { loading, error, summary, tableRows, refresh } = useICPPortfolioData();
  const [menuOpen, setMenuOpen] = useState(false);

  const topRows = useMemo(() => {
    if (!tableRows.length) return new Set();
    const sorted = [...tableRows]
      .sort((a, b) => (b.votes || 0) - (a.votes || 0))
      .slice(0, 3)
      .map((row) => row.id);
    return new Set(sorted);
  }, [tableRows]);

  const handleNav = (href) => {
    setMenuOpen(false);
    navigate(href);
  };

  const handleExport = () => {
    if (!tableRows.length) {
      toast({
        title: "No data to export",
        description: "Generate or mint memes to populate your portfolio first.",
      });
      return;
    }

    const header = [
      "Index",
      "Meme Name",
      "Votes Used",
      "Participation",
      "ICP Staked",
      "Result",
    ];

    const rows = tableRows.map((row) => [
      row.index,
      `"${row.title.replace(/"/g, '""')}"`,
      row.votes ?? 0,
      `${row.participation ?? 0}%`,
      (row.listingPrice ?? 0).toFixed(2),
      row.votes >= 0 ? "Win" : "Loss",
    ]);

    const csv = [header.join(","), ...rows.map((r) => r.join(","))].join("\n");
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = window.URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.setAttribute(
      "download",
      `mementic-portfolio-${Date.now().toString().slice(0, 10)}.csv`
    );
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    window.URL.revokeObjectURL(url);
    toast({
      title: "Stats exported",
      description: "Your portfolio metrics are ready to share.",
    });
  };

  return (
    <div className="relative min-h-screen overflow-hidden bg-gradient-to-br from-slate-950 via-slate-900 to-slate-800 text-white">
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_top,_rgba(139,92,246,0.35),_transparent_55%)]" />
      <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_bottom,_rgba(34,211,238,0.25),_transparent_60%)]" />

      <header className="sticky top-0 z-30 border-b border-white/10 bg-black/40 backdrop-blur">
        <div className="mx-auto flex max-w-6xl items-center justify-between px-6 py-4">
          <div className="flex items-center gap-6">
            <span className="text-lg font-semibold tracking-[0.2em] text-white/80">
              Mementic
            </span>
            <nav className="hidden items-center gap-6 md:flex">
              {NAV_ITEMS.map((item) => {
                const isActive = location.pathname === item.href;
                return (
                  <button
                    key={item.href}
                    type="button"
                    onClick={() => handleNav(item.href)}
                    className={`relative text-sm font-medium transition-colors hover:text-cyan-200 ${
                      isActive ? "text-cyan-300" : "text-white/70"
                    }`}
                  >
                    <span>{item.label}</span>
                    <span
                      className={`absolute -bottom-1 left-0 h-0.5 w-full rounded-full bg-gradient-to-r from-primary to-cyan-400 transition-transform ${
                        isActive ? "scale-100" : "scale-0"
                      }`}
                    />
                  </button>
                );
              })}
            </nav>
          </div>
          <div className="flex items-center gap-3">
            <div className="hidden items-center gap-2 rounded-full border border-white/20 bg-white/10 px-3 py-1 text-sm text-cyan-200 md:flex">
              <Sparkles className="h-4 w-4" />
              <span>@{summary.username}</span>
            </div>
            <Button
              variant="ghost"
              size="icon"
              className="text-white md:hidden"
              onClick={() => setMenuOpen((prev) => !prev)}
              aria-label="Toggle navigation"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </Button>
            <Button
              variant="default"
              className="hidden bg-gradient-to-r from-primary to-cyan-400 text-black shadow-lg md:inline-flex"
              onClick={() => navigate("/create")}
            >
              Launch Creative Space
              <ArrowUpRight className="ml-2 h-4 w-4" />
            </Button>
          </div>
        </div>
        <AnimatePresence>
          {menuOpen ? (
            <motion.nav
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="border-t border-white/10 bg-black/70 px-6 py-4 md:hidden"
            >
              <div className="flex flex-col gap-3">
                {NAV_ITEMS.map((item) => {
                  const isActive = location.pathname === item.href;
                  return (
                    <Button
                      key={item.href}
                      variant={isActive ? "default" : "ghost"}
                      className={`justify-between border border-white/10 ${
                        isActive
                          ? "bg-gradient-to-r from-primary to-cyan-500 text-black"
                          : "text-white"
                      }`}
                      onClick={() => handleNav(item.href)}
                    >
                      {item.label}
                      <ArrowUpRight className="h-4 w-4" />
                    </Button>
                  );
                })}
              </div>
            </motion.nav>
          ) : null}
        </AnimatePresence>
      </header>

      <main className="relative z-10 mx-auto flex max-w-6xl flex-col gap-12 px-6 py-12">
        <section className="space-y-6">
          <div className="flex flex-col gap-6 md:flex-row md:items-center md:justify-between">
            <div>
              <motion.h1
                initial={{ opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.6 }}
                className="text-4xl font-bold tracking-tight text-white"
              >
                My Portfolio
              </motion.h1>
              <p className="mt-2 max-w-xl text-base text-white/70">
                Track your meme creations, earnings & voting performance. Stay ahead
                with live ICP metrics synced from your canisters.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 rounded-full border border-cyan-400/30 bg-cyan-400/10 px-4 py-2 text-sm text-cyan-200">
                <Wallet className="h-4 w-4" />
                <span>{summary.totalMemes} creations</span>
              </div>
              <Button
                variant="outline"
                className="border-white/30 bg-white/10 text-white hover:border-cyan-400 hover:text-cyan-100"
                onClick={refresh}
              >
                Refresh Data
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="flex flex-wrap gap-2 text-xs text-white/50">
            <span className="flex items-center gap-1"><Sparkles className="h-3 w-3" /> Live metrics</span>
            <span className="flex items-center gap-1"><ShieldCheck className="h-3 w-3" /> Immutable history</span>
            <span className="flex items-center gap-1"><TrendingUp className="h-3 w-3" /> Voting analytics</span>
          </div>
          {error ? (
            <div className="rounded-lg border border-red-400/40 bg-red-500/10 px-4 py-3 text-sm text-red-100">
              {error}
            </div>
          ) : null}
        </section>

        <section className="grid grid-cols-1 gap-6 md:grid-cols-2 xl:grid-cols-3">
          <Card className="relative overflow-hidden border-white/10 bg-white/5 backdrop-blur">
            <div className="pointer-events-none absolute inset-0 bg-gradient-to-br from-primary/20 via-transparent to-cyan-400/20" />
            <CardHeader className="relative pb-4">
              <CardTitle className="flex items-center justify-between text-sm font-medium text-white/70">
                <span>Generated Memes</span>
                <Crown className="h-5 w-5 text-cyan-300" />
              </CardTitle>
            </CardHeader>
            <CardContent className="relative space-y-4">
              <div className="text-4xl font-semibold text-white">
                <AnimatedNumber value={summary.totalMemes} />
              </div>
              <div className="flex flex-wrap gap-2">
                <Badge className="bg-green-500/10 text-green-300">
                  Wins: {summary.wins}
                </Badge>
                <Badge className="bg-red-500/10 text-red-300">
                  Losses: {summary.losses}
                </Badge>
              </div>
              <div className="space-y-2">
                <div className="flex items-center justify-between text-sm text-white/70">
                  <span>Success Rate</span>
                  <span>{summary.successRate}%</span>
                </div>
                <div className="h-2 w-full overflow-hidden rounded-full bg-white/10">
                  <motion.div
                    key={summary.successRate}
                    initial={{ width: 0 }}
                    animate={{ width: `${summary.successRate}%` }}
                    transition={{ duration: 0.6, ease: "easeOut" }}
                    className="h-full rounded-full bg-gradient-to-r from-primary to-cyan-400"
                  />
                </div>
              </div>
            </CardContent>
          </Card>

          <div className="flex flex-col gap-6">
            <SummaryMetric
              title="Memes Converted to NFT"
              icon={ShieldCheck}
              value={summary.nftsHeld}
              sublabel={`Total ICP Staked: ${summary.icpStaked.toFixed(2)} ICP`}
            />
            <SummaryMetric
              title="Voting Participation"
              icon={Gauge}
              value={summary.votingParticipation}
              format="percent"
              sublabel={`Total Votes Used: ${formatNumber(summary.totalVotes)}`}
            />
          </div>

          <SummaryMetric
            title={`@${summary.username}`}
            icon={Wallet}
            value={summary.netProfit}
            format="currency"
            sublabel={`NFTs Holding: ${summary.nftsHeld}`}
          />
        </section>

        <section className="space-y-4">
          <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="text-2xl font-semibold text-white">
                Meme Performance Overview
              </h2>
              <p className="text-sm text-white/60">
                Explore how your creations performed across staking, voting, and auction rounds.
              </p>
            </div>
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                className="border-white/20 bg-white/10 text-white hover:border-cyan-400 hover:text-cyan-100"
                onClick={handleExport}
              >
                Export Stats
                <Download className="ml-2 h-4 w-4" />
              </Button>
              <Button
                variant="default"
                className="bg-gradient-to-r from-primary to-cyan-400 text-black shadow-lg"
                onClick={() => navigate("/nft-marketplace")}
              >
                View NFTs
                <ArrowUpRight className="ml-2 h-4 w-4" />
              </Button>
            </div>
          </div>
          <div className="overflow-hidden rounded-xl border border-white/10 bg-black/40 shadow-lg">
            <div className="overflow-x-auto">
              <table className="min-w-full divide-y divide-white/10 text-left text-sm">
                <thead className="bg-white/5 text-xs uppercase tracking-wide text-white/60">
                  <tr>
                    <th className="px-4 py-3">#</th>
                    <th className="px-4 py-3">Meme Name</th>
                    <th className="px-4 py-3">Votes Used</th>
                    <th className="px-4 py-3">Participation</th>
                    <th className="px-4 py-3">ICP Staked</th>
                    <th className="px-4 py-3">Result</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-white/5">
                  <AnimatePresence initial={false}>
                    {loading ? (
                      Array.from({ length: 4 }).map((_, index) => (
                        <tr key={`skeleton-${index}`} className="animate-pulse">
                          <td className="px-4 py-4">
                            <div className="h-4 w-8 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-48 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-16 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-20 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-4 w-16 rounded bg-white/10" />
                          </td>
                          <td className="px-4 py-4">
                            <div className="h-6 w-20 rounded-full bg-white/10" />
                          </td>
                        </tr>
                      ))
                    ) : tableRows.length === 0 ? (
                      <tr>
                        <td colSpan={6} className="px-4 py-12 text-center text-white/60">
                          No memes yet. Generate one in the Creative Space to see live performance data.
                        </td>
                      </tr>
                    ) : (
                      tableRows.map((row) => {
                        const isTop = topRows.has(row.id);
                        return (
                          <motion.tr
                            key={row.id}
                            initial={{ opacity: 0, y: 8 }}
                            animate={{ opacity: 1, y: 0 }}
                            exit={{ opacity: 0, y: -8 }}
                            whileHover={{ scale: 1.01 }}
                            className={`cursor-pointer transition-colors ${
                              isTop
                                ? "bg-gradient-to-r from-primary/20 to-cyan-400/20"
                                : "hover:bg-white/5"
                            }`}
                            onClick={() => row.id && navigate(`/meme/${row.id}`)}
                          >
                            <td className="px-4 py-4 text-white/60">{row.index}</td>
                            <td className="px-4 py-4 font-medium text-white">{row.title}</td>
                            <td className="px-4 py-4 text-white/70">{row.votes ?? 0}</td>
                            <td className="px-4 py-4">
                              <div className="flex items-center gap-2 text-white/70">
                                <div className="h-1.5 w-24 rounded-full bg-white/10">
                                  <motion.div
                                    initial={{ width: 0 }}
                                    animate={{ width: `${row.participation ?? 0}%` }}
                                    transition={{ duration: 0.6, ease: "easeOut" }}
                                    className="h-full rounded-full bg-gradient-to-r from-cyan-400 to-primary"
                                  />
                                </div>
                                <span>{row.participation ?? 0}%</span>
                              </div>
                            </td>
                            <td className="px-4 py-4 text-white/70">
                              {(row.listingPrice ?? 0).toFixed(2)} ICP
                            </td>
                            <td className="px-4 py-4">
                              <Badge
                                className={`border ${
                                  row.votes >= 0
                                    ? "border-green-400/40 bg-green-400/10 text-green-200"
                                    : "border-red-400/40 bg-red-400/10 text-red-200"
                                }`}
                              >
                                {row.votes >= 0 ? "Win" : "Loss"}
                              </Badge>
                            </td>
                          </motion.tr>
                        );
                      })
                    )}
                  </AnimatePresence>
                </tbody>
              </table>
            </div>
          </div>
        </section>

        <section>
          <Card className="border-white/10 bg-white/5 backdrop-blur">
            <CardContent className="flex flex-col gap-6 p-6 md:flex-row md:items-center md:justify-between">
              <div className="space-y-2">
                <div className="flex flex-wrap gap-6 text-sm text-white/70">
                  <span className="flex items-center gap-2">
                    <Coins className="h-4 w-4 text-cyan-300" />
                    Total ICP Earned: {summary.icpEarned.toFixed(2)} ICP
                  </span>
                  <span className="flex items-center gap-2">
                    <Trophy className="h-4 w-4 text-cyan-300" />
                    Total NFTs Minted: {summary.nftsHeld}
                  </span>
                  <span className="flex items-center gap-2">
                    <LineChart className="h-4 w-4 text-cyan-300" />
                    Average Votes per Meme: {summary.avgVotes.toFixed(1)}
                  </span>
                </div>
                <p className="text-xs uppercase tracking-[0.3em] text-white/40">
                  Built on Internet Computer — Immutable Meme History.
                </p>
              </div>
              <Button
                variant="default"
                className="w-full bg-gradient-to-r from-primary to-cyan-400 text-black shadow-lg sm:w-auto"
                onClick={handleExport}
              >
                Export Stats
                <ArrowDownToLine className="ml-2 h-4 w-4" />
              </Button>
            </CardContent>
          </Card>
        </section>
      </main>
    </div>
  );
};

export default Portfolio;
