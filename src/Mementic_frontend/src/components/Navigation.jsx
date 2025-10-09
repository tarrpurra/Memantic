import { useEffect, useState } from "react";
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

  const navLinks = NAV_LINKS;

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

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/70 backdrop-blur-xl">
      <div className="flex items-center justify-between px-5 py-4 sm:px-8 w-full">
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
        <div className="lg:hidden border-t border-border/50 bg-background/95 backdrop-blur-xl">
          <div className="flex flex-col gap-1 px-5 py-4 sm:px-8">
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