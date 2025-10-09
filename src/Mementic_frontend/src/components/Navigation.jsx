import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Menu,
  X,
  Sparkles,
  Store,
  ShoppingBag,
  Gavel,
  BookOpen,
  UserCircle,
  Book,
  ShieldCheck,
  PenTool,
  Gem,
  Wallet,
  ArrowLeft,
  ArrowRight,
} from "lucide-react";
import { Button } from "./ui/Button";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../contexts/AuthContext";

const NAV_LINKS = [
  {
    label: "Pre Meme Marketplace",
    href: "/pre-marketplace",
    icon: Store,
    type: "route",
  },
  {
    label: "Meme NFT Marketplace",
    href: "/meme-nft",
    icon: ShoppingBag,
    type: "route",
  },
  { label: "Auction", href: "/auction", icon: Gavel, type: "route" },
  { label: "CTO", href: "#cto-guide", icon: BookOpen, type: "anchor" },
  { label: "Guide", href: "#guide", icon: Book, type: "anchor" },
];

const PAGE_DETAILS = {
  default: {
    eyebrow: "Mementic",
    title: "Decentralized Meme HQ",
    description: "Create, compete, and collect culture across the Internet Computer.",
    icon: Sparkles,
  },
  "/": {
    eyebrow: "Landing",
    title: "Discover the decentralized meme economy",
    description: "Explore workflows, momentum stats, and live competitions.",
    icon: Sparkles,
    actions: [
      {
        label: "Creator studio",
        href: "/myplace",
        variant: "outline",
        icon: ArrowRight,
        type: "route",
      },
    ],
    showGuestNotice: false,
  },
  "/landing": {
    eyebrow: "Landing",
    title: "Discover the decentralized meme economy",
    description: "Explore workflows, momentum stats, and live competitions.",
    icon: Sparkles,
    actions: [
      {
        label: "Creator studio",
        href: "/myplace",
        variant: "outline",
        icon: ArrowRight,
        type: "route",
      },
    ],
    showGuestNotice: false,
  },
  "/login": {
    eyebrow: "Account access",
    title: "Secure sign in",
    description: "Connect with NFID or Internet Identity to personalize your profile.",
    icon: ShieldCheck,
    actions: [
      {
        label: "Back to landing",
        href: "/",
        variant: "ghost",
        icon: ArrowLeft,
        type: "route",
      },
    ],
    showGuestNotice: false,
  },
  "/myplace": {
    eyebrow: "Creator studio",
    title: "Craft and refine your memes",
    description: "Generate with AI, remix uploads, and prepare drops for launch.",
    icon: PenTool,
    actions: [
      {
        label: "View marketplace",
        href: "/marketplace",
        variant: "ghost",
        icon: ArrowRight,
        type: "route",
      },
    ],
  },
  "/pre-marketplace": {
    eyebrow: "Launch flow",
    title: "Preview and polish your release",
    description: "Track readiness, momentum, and unlock strategies before listing.",
    icon: Store,
    actions: [
      {
        label: "Go to marketplace",
        href: "/marketplace",
        variant: "outline",
        icon: ArrowRight,
        type: "route",
      },
    ],
  },
  "/marketplace": {
    eyebrow: "Marketplace",
    title: "Discover live drops",
    description: "Bid, collect, and support the community's favorite memes.",
    icon: ShoppingBag,
    actions: [
      {
        label: "Submit a meme",
        href: "/myplace",
        variant: "outline",
        icon: ArrowRight,
        type: "route",
      },
    ],
  },
  "/auction": {
    eyebrow: "Live auctions",
    title: "Compete in real-time bidding",
    description: "Unlock boosts and reward supporters with every on-chain bid.",
    icon: Gavel,
    actions: [
      {
        label: "Pre-market flow",
        href: "/pre-marketplace",
        variant: "ghost",
        icon: ArrowLeft,
        type: "route",
      },
      {
        label: "Submit a meme",
        href: "/myplace",
        variant: "hero",
        icon: Sparkles,
        type: "route",
      },
    ],
  },
  "/meme-nft": {
    eyebrow: "NFT launchpad",
    title: "Mint ownable culture",
    description: "Create editions, set staking rewards, and empower collectors.",
    icon: Gem,
    actions: [
      {
        label: "View auctions",
        href: "/auction",
        variant: "ghost",
        icon: Gavel,
        type: "route",
      },
      {
        label: "Open wallet",
        href: "/wallet",
        variant: "outline",
        icon: Wallet,
        type: "route",
      },
    ],
  },
  "/portfolio": {
    eyebrow: "Creator portfolio",
    title: "Track your on-chain footprint",
    description: "Review drops, bids, and community traction at a glance.",
    icon: UserCircle,
    actions: [
      {
        label: "Marketplace",
        href: "/marketplace",
        variant: "ghost",
        icon: ShoppingBag,
        type: "route",
      },
    ],
  },
  "/wallet": {
    eyebrow: "Wallet",
    title: "Manage your connected accounts",
    description: "Connect wallets, review balances, and sync with drops.",
    icon: Wallet,
    actions: [
      {
        label: "View marketplace",
        href: "/marketplace",
        variant: "outline",
        icon: ArrowRight,
        type: "route",
      },
    ],
  },
};

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, principal, username } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [activeLink, setActiveLink] = useState(
    location.hash
      ? `#${location.hash.replace("#", "")}`
      : location.pathname !== "/"
      ? location.pathname
      : "#hero"
  );

  const navLinks = useMemo(() => NAV_LINKS, []);

  const closeMenu = () => setMenuOpen(false);

  const handleNav = (link) => {
    setActiveLink(link.href);

    if (link.type === "route") {
      navigate(link.href);
      closeMenu();
      return;
    }

    if (link.href.startsWith("#")) {
      const elementId = link.href.replace("#", "");
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
    }

    closeMenu();
  };

  const handleAction = (action) => {
    if (!action || !action.href) {
      return;
    }

    if (action.type === "external") {
      if (typeof window !== "undefined") {
        window.open(action.href, action.target || "_blank", "noopener,noreferrer");
      }
      return;
    }

    if (action.href.startsWith("#")) {
      const elementId = action.href.replace("#", "");
      const element = document.getElementById(elementId);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "start" });
      }
      return;
    }

    navigate(action.href);
  };

  useEffect(() => {
    const currentHash = location.hash?.replace("#", "");
    if (location.pathname !== "/") {
      setActiveLink(location.pathname);
      return;
    }

    if (currentHash) {
      setActiveLink(`#${currentHash}`);
    } else {
      setActiveLink("#hero");
    }
  }, [location.hash, location.pathname]);

  useEffect(() => {
    const anchors = navLinks
      .filter((link) => link.type === "anchor" && link.href.startsWith("#"))
      .map((link) => document.getElementById(link.href.replace("#", "")))
      .filter(Boolean);

    if (!anchors.length) return undefined;

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            setActiveLink(`#${entry.target.id}`);
          }
        });
      },
      { rootMargin: "-40% 0px -40% 0px", threshold: 0.2 }
    );

    anchors.forEach((section) => observer.observe(section));

    return () => observer.disconnect();
  }, [navLinks]);

  const currentDisplayName =
    username?.trim() || (principal ? `${principal.slice(0, 8)}...` : "Not logged in");

  const normalizedPath = location.pathname.endsWith("/") && location.pathname.length > 1
    ? location.pathname.slice(0, -1)
    : location.pathname;

  const pageDetails = PAGE_DETAILS[normalizedPath] || PAGE_DETAILS.default;
  const DetailIcon = pageDetails?.icon;

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="mx-auto flex w-full max-w-6xl items-center justify-between px-5 py-4 sm:px-8">
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 text-white shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span>Mementic</span>
          </div>
        </div>

        <nav className="hidden items-center gap-4 lg:flex flex-1 justify-center">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeLink === link.href;
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNav(link)}
                className={`group relative inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{link.label}</span>
                <span
                  className={`pointer-events-none absolute inset-x-4 bottom-0 h-0.5 origin-center scale-x-0 rounded-full bg-gradient-to-r from-purple-500 via-purple-400 to-cyan-400 transition-transform duration-300 ${
                    isActive ? "scale-x-100" : "group-hover:scale-x-100"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="flex items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/portfolio")}
            className="hidden sm:flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card backdrop-blur"
          >
            <UserCircle className="h-3.5 w-3.5 text-primary" />
            <span>Profile</span>
          </button>
          <ThemeToggle />
          <button
            type="button"
            className="lg:hidden inline-flex h-10 w-10 items-center justify-center rounded-full border border-border/60 bg-background/70"
            onClick={() => setMenuOpen((prev) => !prev)}
          >
            {menuOpen ? (
              <X className="h-5 w-5" />
            ) : (
              <Menu className="h-5 w-5" />
            )}
          </button>
        </div>
      </div>

      {menuOpen && (
        <div className="border-t border-border/50 bg-background/95 backdrop-blur-xl lg:hidden">
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-1 px-5 py-4 sm:px-8">
            {navLinks.map((link) => {
              const Icon = link.icon;
              const isActive = activeLink === link.href;
              return (
                <button
                  key={link.label}
                  type="button"
                  onClick={() => handleNav(link)}
                  className={`flex items-center justify-between rounded-xl border border-border/60 px-4 py-3 text-sm font-medium transition-colors ${
                    isActive
                      ? "bg-primary/10 text-primary"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <span className="flex items-center gap-3">
                    <Icon className="h-4 w-4" />
                    <span>{link.label}</span>
                  </span>
                </button>
              );
            })}
          </div>
        </div>
      )}

      {pageDetails && (
        <motion.div
          initial={{ opacity: 0, y: -6 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.25 }}
          className="border-t border-border/40 bg-background/70 backdrop-blur-xl"
        >
          <div className="mx-auto flex w-full max-w-6xl flex-col gap-4 px-5 py-3 sm:flex-row sm:items-center sm:justify-between sm:px-8">
            <div className="space-y-1">
              <div className="flex flex-wrap items-center gap-2 text-[11px] font-semibold uppercase tracking-[0.3em] text-muted-foreground">
                <span>{pageDetails.eyebrow || "Mementic"}</span>
                {isAuthenticated && (
                  <span className="inline-flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-2.5 py-1 text-[10px] font-medium text-primary">
                    <span className="h-2 w-2 rounded-full bg-primary" />
                    {currentDisplayName}
                  </span>
                )}
              </div>
              <div className="flex items-center gap-2 text-sm font-semibold sm:text-base">
                {DetailIcon ? <DetailIcon className="h-4 w-4 text-primary" /> : null}
                <span>{pageDetails.title}</span>
              </div>
              {pageDetails.description && (
                <p className="text-xs text-muted-foreground sm:text-sm">{pageDetails.description}</p>
              )}
              {isAuthenticated && (
                <p className="text-[11px] text-muted-foreground/80">
                  Connected as <span className="font-medium text-foreground">{currentDisplayName}</span>
                </p>
              )}
              {!isAuthenticated && pageDetails.showGuestNotice !== false && (
                <p className="text-[11px] text-muted-foreground/80">
                  Browsing as guest — connect to unlock personalized stats and publishing.
                </p>
              )}
            </div>
            {pageDetails.actions?.length ? (
              <div className="flex flex-wrap items-center gap-2">
                {pageDetails.actions.map((action) => {
                  const ActionIcon = action.icon;
                  return (
                    <Button
                      key={action.label}
                      variant={action.variant || "outline"}
                      size="sm"
                      className="flex items-center gap-2 rounded-full px-4"
                      onClick={() => handleAction(action)}
                    >
                      {ActionIcon ? <ActionIcon className="h-3.5 w-3.5" /> : null}
                      <span>{action.label}</span>
                    </Button>
                  );
                })}
              </div>
            ) : null}
          </div>
        </motion.div>
      )}
    </header>
  );
};

export default Navigation;
