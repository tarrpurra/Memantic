import { useEffect, useMemo, useState } from "react";
import { useLocation, useNavigate } from "react-router-dom";
import { Menu, X, Sparkles, Store, ShoppingBag, Gavel, UserCircle, PenTool, Gem, Wallet, ChevronDown, LogOut, User } from "lucide-react";
import ThemeToggle from "./ThemeToggle";
import { useAuth } from "../contexts/AuthContext";

// Static navigation - always shows the same 5 items regardless of current page
const NAV_LINKS = [
  { label: "Market Place", href: "/marketplace", icon: ShoppingBag, type: "route" },
  { label: "Pre Market Place", href: "/pre-marketplace", icon: Store, type: "route" },
  { label: "Auction", href: "/auction", icon: Gavel, type: "route" },
  { label: "LaunchPad", href: "/meme-nft", icon: Gem, type: "route" },
  { label: "Meme Studio", href: "/myplace", icon: PenTool, type: "route" },
];

const Navigation = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { isAuthenticated, principal, username, logout } = useAuth();

  const [menuOpen, setMenuOpen] = useState(false);
  const [profileDropdownOpen, setProfileDropdownOpen] = useState(false);
  const normalizedPath = useMemo(() => {
    if (location.pathname.endsWith("/") && location.pathname.length > 1) {
      return location.pathname.slice(0, -1);
    }
    return location.pathname || "/";
  }, [location.pathname]);

  // Use static navigation links
  const navLinks = NAV_LINKS;

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
    // For static navigation, just highlight the current route
    if (navLinks.some((link) => link.href === normalizedPath)) {
      setActiveLink(normalizedPath);
    } else {
      setActiveLink(navLinks[0]?.href || "");
    }
  }, [normalizedPath, navLinks]);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (profileDropdownOpen && !event.target.closest('.profile-dropdown')) {
        setProfileDropdownOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [profileDropdownOpen]);

  const currentDisplayName =
    username?.trim() || (principal ? `${principal.slice(0, 8)}...` : "Login");

  return (
    <header className="sticky top-0 z-40 border-b border-border/40 bg-background/75 backdrop-blur-xl">
      <div className="flex w-full items-center gap-6 px-5 py-4 sm:px-8">
        <div className="flex flex-1 items-center gap-3">
          <button
            type="button"
            onClick={() => navigate("/")}
            className="flex items-center gap-2 text-lg font-semibold hover:opacity-80 transition-opacity"
          >
            <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-primary text-white shadow-glow">
              <Sparkles className="h-5 w-5" />
            </div>
            <span>Mementic</span>
          </button>
        </div>

        <nav className="hidden flex-1 items-center justify-center gap-2 lg:flex w-10">
          {navLinks.map((link) => {
            const Icon = link.icon;
            const isActive = activeLink === link.href;
            return (
              <button
                key={link.label}
                type="button"
                onClick={() => handleNav(link)}
                className={`group relative inline-flex items-center gap-2 w-40 rounded-full px-4 py-3 text-sm font-medium transition-colors ${
                  isActive
                    ? "text-primary"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                <Icon className="h-4 w-4 flex-shrink-0" />
                <span className="w-40 text-center">{link.label}</span>
                <span
                  className={`pointer-events-none absolute inset-x-4 bottom-0 h-0.5 origin-center scale-x-0 rounded-full bg-gradient-primary transition-transform duration-300 ${
                    isActive ? "scale-x-100" : "group-hover:scale-x-100"
                  }`}
                />
              </button>
            );
          })}
        </nav>

        <div className="flex flex-1 items-center justify-end gap-3">
          {isAuthenticated ? (
            <div className="relative hidden sm:block profile-dropdown">
              <button
                type="button"
                onClick={() => setProfileDropdownOpen(!profileDropdownOpen)}
                className="flex items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card backdrop-blur hover:bg-background/80 transition-colors"
              >
                <UserCircle className="h-3.5 w-3.5 text-primary" />
                <span>{currentDisplayName}</span>
                <ChevronDown className={`h-3 w-3 transition-transform ${profileDropdownOpen ? 'rotate-180' : ''}`} />
              </button>

              {profileDropdownOpen && (
                <div className="absolute right-0 top-full mt-2 w-48 rounded-lg border border-border/50 bg-background/95 backdrop-blur-xl shadow-lg">
                  <div className="py-1">
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/portfolio");
                        setProfileDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                    >
                      <User className="h-4 w-4" />
                      Portfolio
                    </button>
                    <button
                      type="button"
                      onClick={() => {
                        navigate("/wallet");
                        setProfileDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-muted-foreground hover:bg-primary/10 hover:text-foreground"
                    >
                      <Wallet className="h-4 w-4" />
                      Wallet
                    </button>
                    <div className="border-t border-border/50 my-1"></div>
                    <button
                      type="button"
                      onClick={async () => {
                        await logout();
                        setProfileDropdownOpen(false);
                      }}
                      className="flex w-full items-center gap-3 px-4 py-2 text-sm text-red-400 hover:bg-red-500/10 hover:text-red-300"
                    >
                      <LogOut className="h-4 w-4" />
                      Logout
                    </button>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <button
              type="button"
              onClick={() => navigate("/login")}
              className="hidden items-center gap-2 rounded-full border border-border/50 bg-background/60 px-3 py-1.5 text-xs font-medium text-muted-foreground shadow-card backdrop-blur sm:flex"
            >
              <UserCircle className="h-3.5 w-3.5 text-primary" />
              <span>Login</span>
            </button>
          )}
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
