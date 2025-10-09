import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Sparkles, Store, ShoppingBag, Gavel, UserCircle, PenTool, Gem, Wallet } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../contexts/AuthContext";

const NAV_LINKS_BY_PAGE = {
  default: [
    { label: "Landing", href: "/", icon: Sparkles, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auction", href: "/auction", icon: Gavel, type: "route" },
    { label: "NFT Launchpad", href: "/meme-nft", icon: Gem, type: "route" },
    { label: "Wallet", href: "/wallet", icon: Wallet, type: "route" },
  ],
  "/": [
    { label: "Overview", href: "#hero", icon: Sparkles, type: "anchor" },
    { label: "Momentum", href: "#pre-marketplace", icon: Store, type: "anchor" },
    { label: "Creator Studio", href: "/myplace", icon: PenTool, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auction", href: "/auction", icon: Gavel, type: "route" },
  ],
  "/landing": [
    { label: "Overview", href: "#hero", icon: Sparkles, type: "anchor" },
    { label: "Momentum", href: "#pre-marketplace", icon: Store, type: "anchor" },
    { label: "Creator Studio", href: "/myplace", icon: PenTool, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auction", href: "/auction", icon: Gavel, type: "route" },
  ],
  "/login": [
    { label: "Home", href: "/", icon: Sparkles, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auction", href: "/auction", icon: Gavel, type: "route" },
    { label: "NFT Launchpad", href: "/meme-nft", icon: Gem, type: "route" },
    { label: "Wallet", href: "/wallet", icon: Wallet, type: "route" },
  ],
  "/myplace": [
    { label: "Creator Studio", href: "/myplace", icon: PenTool, type: "route" },
    { label: "Pre-Market", href: "/pre-marketplace", icon: Store, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auction", href: "/auction", icon: Gavel, type: "route" },
    { label: "Portfolio", href: "/portfolio", icon: UserCircle, type: "route" },
  ],
  "/pre-marketplace": [
    { label: "Launch Flow", href: "/pre-marketplace", icon: Store, type: "route" },
    { label: "Creator Studio", href: "/myplace", icon: PenTool, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auction", href: "/auction", icon: Gavel, type: "route" },
    { label: "NFT Launchpad", href: "/meme-nft", icon: Gem, type: "route" },
  ],
  "/marketplace": [
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auctions", href: "/auction", icon: Gavel, type: "route" },
    { label: "NFT Launchpad", href: "/meme-nft", icon: Gem, type: "route" },
    { label: "Creator Studio", href: "/myplace", icon: PenTool, type: "route" },
    { label: "Wallet", href: "/wallet", icon: Wallet, type: "route" },
  ],
  "/auction": [
    { label: "Auctions", href: "/auction", icon: Gavel, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "NFT Launchpad", href: "/meme-nft", icon: Gem, type: "route" },
    { label: "Creator Studio", href: "/myplace", icon: PenTool, type: "route" },
    { label: "Wallet", href: "/wallet", icon: Wallet, type: "route" },
  ],
  "/meme-nft": [
    { label: "NFT Launchpad", href: "/meme-nft", icon: Gem, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auctions", href: "/auction", icon: Gavel, type: "route" },
    { label: "Creator Studio", href: "/myplace", icon: PenTool, type: "route" },
    { label: "Wallet", href: "/wallet", icon: Wallet, type: "route" },
  ],
  "/portfolio": [
    { label: "Portfolio", href: "/portfolio", icon: UserCircle, type: "route" },
    { label: "Creator Studio", href: "/myplace", icon: PenTool, type: "route" },
    { label: "Pre-Market", href: "/pre-marketplace", icon: Store, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Wallet", href: "/wallet", icon: Wallet, type: "route" },
  ],
  "/wallet": [
    { label: "Wallet", href: "/wallet", icon: Wallet, type: "route" },
    { label: "Marketplace", href: "/marketplace", icon: ShoppingBag, type: "route" },
    { label: "Auctions", href: "/auction", icon: Gavel, type: "route" },
    { label: "NFT Launchpad", href: "/meme-nft", icon: Gem, type: "route" },
    { label: "Portfolio", href: "/portfolio", icon: UserCircle, type: "route" },
  ],
};

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, principal, username } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const normalizedPath = useMemo(() => {
    if (location.pathname.endsWith("/") && location.pathname.length > 1) {
      return location.pathname.slice(0, -1);
    }
    return location.pathname || "/";
  }, [location.pathname]);

  const navLinks = useMemo(() => {
    return NAV_LINKS_BY_PAGE[normalizedPath] || NAV_LINKS_BY_PAGE.default;
  }, [normalizedPath]);

  const [activeLink, setActiveLink] = useState(() => {
    if (location.hash) {
      return `#${location.hash.replace("#", "")}`;
    }
    if (navLinks.some((link) => link.href === normalizedPath)) {
      return normalizedPath;
    }
    return navLinks[0]?.href || "";
  });

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

  useEffect(() => {
    const currentHash = location.hash?.replace("#", "");

    if (currentHash && navLinks.some((link) => link.href === `#${currentHash}`)) {
      setActiveLink(`#${currentHash}`);
      return;
    }

    if (navLinks.some((link) => link.href === normalizedPath)) {
      setActiveLink(normalizedPath);
      return;
    }

    if (!currentHash && navLinks.length) {
      setActiveLink(navLinks[0].href);
    }
  }, [location.hash, normalizedPath, navLinks]);

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
    username?.trim() || (principal ? `${principal.slice(0, 8)}...` : "Login");

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/75 backdrop-blur-xl">
      <div className="flex w-full items-center gap-6 px-5 py-4 sm:px-8">
        <div className="flex flex-1 items-center gap-3">
          <div className="flex items-center gap-2 text-lg font-semibold">
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-purple-500 to-cyan-400 text-white shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span>Mementic</span>
          </div>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-4 lg:flex">
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

        <div className="flex flex-1 items-center justify-end gap-3">
          <button
            type="button"
            onClick={() => navigate(isAuthenticated ? "/portfolio" : "/login")}
            className="hidden items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card backdrop-blur sm:flex"
          >
            <UserCircle className="h-3.5 w-3.5 text-primary" />
            <span>{isAuthenticated ? currentDisplayName : "Login"}</span>
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
          <div className="flex w-full flex-col gap-1 px-5 py-4 sm:px-8">
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
    </header>
  );
};

export default Navigation;
