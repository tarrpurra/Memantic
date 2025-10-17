import { useEffect, useMemo, useRef, useState } from "react";
import { Button } from "../components/ui/Button";
import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import {
  TrendingUp,
  Coins,
  Crown,
  ArrowUp,
  ArrowDown,
  User,
  Sparkles,
  MessageSquare,
  Gem,
} from "lucide-react";
import { useAuth } from "../contexts/AuthContext";
import { useLocation, useNavigate } from "react-router-dom";
import { useToast } from "../hooks/use-toast";
import { FeedbackForm } from "../components/FeedbackForm";
import Navigation from "../components/Navigation";

import backendService from "../services/backendService";
import MintingModal from "../components/MintingModal";
import ListingModal from "../components/ListingModal";




/**
 * UI NFT shape (for reference)
 * {
 *   id: string,
 *   title: string,
 *   emoji: string,
 *   votes: number,
 *   earnedIcp: number,
 *   views: number,
 *   status: "earning" | "selling" | "minted" | "unknown",
 *   imageUrl?: string
 * }
 */

const SkeletonStat = () => (
  <Card>
    <CardContent className="p-6 text-center animate-pulse">
      <div className="w-8 h-8 mx-auto mb-2 rounded-full bg-muted" />
      <div className="h-7 w-24 mx-auto bg-muted rounded mb-2" />
      <div className="h-4 w-20 mx-auto bg-muted rounded" />
    </CardContent>
  </Card>
);

const SkeletonTile = () => (
  <Card className="group">
    <CardHeader>
      <div className="flex items-center justify-between">
        <div className="w-16 h-16 rounded bg-muted animate-pulse" />
        <div className="h-5 w-40 bg-muted rounded animate-pulse" />
      </div>
    </CardHeader>
    <CardContent className="space-y-4">
      <div className="h-6 w-48 bg-muted rounded animate-pulse" />
      <div className="space-y-2">
        <div className="h-4 w-full bg-muted rounded animate-pulse" />
        <div className="h-4 w-2/3 bg-muted rounded animate-pulse" />
        <div className="h-4 w-1/2 bg-muted rounded animate-pulse" />
      </div>
      <div className="flex gap-2">
        <div className="h-9 w-full bg-muted rounded animate-pulse" />
        <div className="h-9 w-full bg-muted rounded animate-pulse" />
      </div>
    </CardContent>
  </Card>
);

const LoadingState = ({ message }) => (
  <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
    <Navigation />
    <main className="mx-auto flex w-full max-w-4xl flex-col items-center justify-center gap-6 px-4 py-24 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full border-4 border-primary border-t-transparent animate-spin" />
      <p className="text-sm text-muted-foreground">{message}</p>
    </main>
  </div>
);

const Portfolio = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { toast } = useToast();
  const {
    principal,
    username,
    logout,
    isAuthenticated,
    isLoading: authLoading,
    updateUsername,
  } = useAuth();

  const locationState = location.state ?? {};
  const requestedFrom = locationState?.from;
  const requireUsername = Boolean(locationState?.requireUsername);

  const sanitizedUsername = typeof username === "string" ? username.trim() : "";
  const hasUsername = sanitizedUsername.length > 0;

  const [loading, setLoading] = useState(true);
  const [nfts, setNfts] = useState([]);
  const [error, setError] = useState("");
  const [refreshing, setRefreshing] = useState(false);

  const [entitlements, setEntitlements] = useState([]);
  const [winnerNotices, setWinnerNotices] = useState([]);
  const [mintModalOpen, setMintModalOpen] = useState(false);
  const [mintTarget, setMintTarget] = useState(null);
  const [minting, setMinting] = useState(false);
  const [listingModalOpen, setListingModalOpen] = useState(false);
  const [listingTarget, setListingTarget] = useState(null);
  const [listingLoading, setListingLoading] = useState(false);

  const [usernameInput, setUsernameInput] = useState(sanitizedUsername);
  const [usernameError, setUsernameError] = useState("");
  const [usernameSaved, setUsernameSaved] = useState(false);
  const [savingUsername, setSavingUsername] = useState(false);
  const [showUsernameEditor, setShowUsernameEditor] = useState(!hasUsername || requireUsername);

  const redirectAfterSaveRef = useRef(requestedFrom || null);

  const displayName =
    sanitizedUsername || (principal ? `${principal.slice(0, 8)}...${principal.slice(-6)}` : "Not logged in");
  const principalPreview = principal
    ? `${principal.slice(0, 8)}...${principal.slice(-6)}`
    : "";

  // Calculate portfolio stats
  const totalVotes = nfts.reduce((sum, nft) => sum + nft.votes, 0);
  const totalEarnings = nfts.reduce((sum, nft) => sum + nft.earnedIcp, 0);
  const totalViews = nfts.reduce((sum, nft) => sum + nft.views, 0);
  const avgEarningsPerVote = totalVotes > 0 ? totalEarnings / totalVotes : 0;

  const generatedCount = nfts.length;
  const mintedCount = nfts.filter(nft => nft.isMinted).length;
  const listedCount = nfts.filter(nft => nft.isListed).length;
  const totalSales = nfts.reduce((sum, nft) => sum + (nft.totalSales || 0), 0);

  const mintedProgress = generatedCount > 0 ? Math.round((mintedCount / generatedCount) * 100) : 0;
  const listedProgress = generatedCount > 0 ? Math.round((listedCount / generatedCount) * 100) : 0;

  const generatedMemes = nfts.filter(nft => !nft.isMinted);
  const mintedNFTs = nfts.filter(nft => nft.isMinted);

  const handleLogout = async () => {
    await logout();
    // Navigation is handled in AuthContext logout function
  };

  // Redirect if not authenticated
  useEffect(() => {
    if (!authLoading && !isAuthenticated) {
      navigate("/login");
    }
  }, [isAuthenticated, authLoading, navigate]);

  useEffect(() => {
    setUsernameInput(sanitizedUsername);
    if (sanitizedUsername) {
      setShowUsernameEditor(false);
    }
  }, [sanitizedUsername]);

  useEffect(() => {
    if (requestedFrom) {
      redirectAfterSaveRef.current = requestedFrom;
    }
  }, [requestedFrom]);

  useEffect(() => {
    if (!requireUsername) return;

    setShowUsernameEditor(true);
    if (requestedFrom) {
      redirectAfterSaveRef.current = requestedFrom;
    }

    navigate(location.pathname, {
      replace: true,
      state: requestedFrom ? { from: requestedFrom } : undefined,
    });
  }, [requireUsername, requestedFrom, location.pathname, navigate]);

  const handleEditUsername = () => {
    setShowUsernameEditor(true);
    setUsernameSaved(false);
    setUsernameError("");
    setUsernameInput(sanitizedUsername);
  };

  const handleCancelUsername = () => {
    setShowUsernameEditor(false);
    setUsernameError("");
    setUsernameInput(sanitizedUsername);
  };

  const handleUsernameSubmit = async (event) => {
    event.preventDefault();
    const trimmed = typeof usernameInput === "string" ? usernameInput.trim() : "";

    if (trimmed.length < 3) {
      setUsernameError("Username must be at least 3 characters long.");
      return;
    }

    if (trimmed.length > 32) {
      setUsernameError("Username must be 32 characters or fewer.");
      return;
    }

    try {
      setSavingUsername(true);
      await updateUsername(trimmed);
      setUsernameSaved(true);
      setShowUsernameEditor(false);
      setUsernameError("");
      toast({
        title: "Profile updated",
        description: "Your username is live across the marketplace and creator studio.",
      });

      const target = redirectAfterSaveRef.current;
      if (target) {
        redirectAfterSaveRef.current = null;
        setTimeout(() => {
          navigate(target, { replace: true });
        }, 400);
      }
    } catch (error) {
      console.error("Failed to update username:", error);
      setUsernameError("Failed to save username. Please try again.");
    } finally {
      setSavingUsername(false);
    }
  };

  // Safely unwrap candid optionals that arrive as [] | [value]
  function unopt(v) {
    return Array.isArray(v) ? v[0] : v;
  }

  /**
   * Safely convert BigInt to number, handling large values
   */
  function safeBigIntToNumber(value) {
    if (typeof value === 'bigint') {
      // Check if BigInt is within safe number range
      if (value > Number.MAX_SAFE_INTEGER) {
        return Number.MAX_SAFE_INTEGER;
      }
      if (value < Number.MIN_SAFE_INTEGER) {
        return Number.MIN_SAFE_INTEGER;
      }
      return Number(value);
    }
    return Number(value) || 0;
  }

  const unwrapOptional = (value) => (Array.isArray(value) ? value[0] : value);

  function toMilliseconds(candidate) {
    const value = unwrapOptional(candidate);
    if (value == null) return 0;

    if (typeof value === 'bigint') {
      if (value > 1_000_000_000_000_000n) {
        return Number(value / 1_000_000n);
      }
      if (value > 1_000_000_000_000n) {
        return Number(value);
      }
      if (value > 1_000_000_000n) {
        return Number(value * 1000n);
      }
      if (value > 1_000_000n) {
        return Number(value / 1000n);
      }
      return Number(value);
    }

    if (typeof value === 'number') {
      if (!Number.isFinite(value) || value <= 0) return 0;
      if (value > 1e15) return Math.floor(value / 1e6);
      if (value > 1e12) return Math.floor(value);
      if (value > 1e9) return Math.floor(value * 1000);
      if (value > 1e6) return Math.floor(value / 1000);
      return Math.floor(value);
    }

    if (typeof value === 'string') {
      const trimmed = value.trim();
      if (!trimmed) return 0;
      try {
        if (/^-?\d+n$/.test(trimmed)) {
          return toMilliseconds(BigInt(trimmed.slice(0, -1)));
        }
        if (/^-?\d+$/.test(trimmed)) {
          return toMilliseconds(BigInt(trimmed));
        }
        const num = Number(trimmed);
        return toMilliseconds(num);
      } catch {
        return 0;
      }
    }

    return 0;
  }

  const parseStatusVariant = (variant) => {
    if (variant && typeof variant === 'object') {
      const keys = Object.keys(variant);
      if (keys.length > 0) {
        return keys[0];
      }
    }
    return 'Unknown';
  };

  const normalizeEntitlements = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map((item) => {
      const status = parseStatusVariant(item?.status);
      const mintedTokenIds = Array.isArray(item?.minted_token_ids)
        ? item.minted_token_ids.map((token) => {
            if (typeof token === 'bigint') return token.toString();
            if (typeof token === 'number') return Math.floor(token).toString();
            if (typeof token === 'string') return token;
            return '';
          }).filter(Boolean)
        : [];

      return {
        entitlementId: safeBigIntToNumber(item?.entitlement_id ?? 0),
        memeId: safeBigIntToNumber(item?.meme_id ?? 0),
        owner:
          item?.owner && typeof item.owner === 'object' && item.owner.toText
            ? item.owner.toText()
            : item?.owner ?? '',
        weekId: safeBigIntToNumber(item?.week_id ?? 0),
        rank: safeBigIntToNumber(item?.rank ?? 0),
        memeTitle: item?.meme_title ?? 'Untitled Meme',
        createdAtMs: toMilliseconds(item?.created_at),
        expiresAtMs: toMilliseconds(item?.expires_at),
        usedAtMs: toMilliseconds(item?.used_at),
        status,
        mintedTokenIds,
        message: item?.message ?? null,
        raw: item,
      };
    });
  };

  const normalizeWinnerNotices = (rawList) => {
    if (!Array.isArray(rawList)) return [];
    return rawList.map((notice) => ({
      entitlementId: safeBigIntToNumber(notice?.entitlement_id ?? 0),
      memeId: safeBigIntToNumber(notice?.meme_id ?? 0),
      memeTitle: notice?.meme_title ?? 'Untitled Meme',
      rank: safeBigIntToNumber(notice?.rank ?? 0),
      weekId: safeBigIntToNumber(notice?.week_id ?? 0),
      issuedAtMs: toMilliseconds(notice?.issued_at),
      expiresAtMs: toMilliseconds(notice?.expires_at),
      usedAtMs: toMilliseconds(notice?.used_at),
      status: parseStatusVariant(notice?.status),
      message: notice?.message ?? '',
    }));
  };

  const formatMintCountdown = (expiresAtMs) => {
    if (!expiresAtMs) return 'Mint window expired';
    const remaining = expiresAtMs - Date.now();
    if (remaining <= 0) return 'Mint window expired';

    const minutes = Math.floor(remaining / 60000);
    if (minutes >= 1440) {
      const days = Math.floor(minutes / 1440);
      const hours = Math.floor((minutes % 1440) / 60);
      return `${days}d ${hours}h left`;
    }
    if (minutes >= 60) {
      const hours = Math.floor(minutes / 60);
      const mins = minutes % 60;
      return `${hours}h ${mins}m left`;
    }
    return `${minutes}m left`;
  };

  const formatDateTime = (ms) => {
    if (!ms) return '';
    try {
      return new Date(ms).toLocaleString('en-IN', {
        timeZone: 'Asia/Kolkata',
        dateStyle: 'medium',
        timeStyle: 'short',
      });
    } catch {
      return '';
    }
  };

  // Map canister records -> UI
  const mapToUi = (item) => {
    const memeData = unopt(item?.meme_data) || {};
    const marketData = item?.sale_metadata ?? item?.market_data ?? {};
    const votes = safeBigIntToNumber(item?.votes?.upvotes ?? item?.votes ?? 0);

    // Handle bigint conversion for earned ICP (from market data)
    let earnedIcp = 0;
    if (marketData?.total_earned) {
      earnedIcp = safeBigIntToNumber(marketData.total_earned) / 100000000; // Convert e8s to ICP
    }

    // Determine status based on market data
    let status = "earning";
    if (marketData?.is_listed) {
      status = "selling";
    }

    return {
      id: String(item?.meme_id ?? item?.id ?? crypto.randomUUID()),
      title: memeData?.prompt || item?.title || "Untitled Meme",
      emoji: "🖼️",
      votes: votes,
      earnedIcp: Number.isFinite(earnedIcp) ? earnedIcp : 0,
      views: safeBigIntToNumber(item?.views || marketData?.views || 0),
      status,
      imageUrl: memeData?.image_url,
      // Market data
      isListed: marketData?.is_listed || false,
      listingPrice: marketData?.listing_price ? safeBigIntToNumber(marketData.listing_price) / 100000000 : null,
      totalSales: safeBigIntToNumber(marketData?.total_sales || 0),
      lastSalePrice: marketData?.last_sale_price ? safeBigIntToNumber(marketData.last_sale_price) / 100000000 : null,
      listedAt: marketData?.listed_at,
      lastSaleAt: marketData?.last_sale_at,
      // isMinted will be set in fetchData after checking with backend
      isMinted: false, // default value, will be overridden
    };
  };

  async function fetchData() {
    if (!isAuthenticated) return;
    setLoading(true);
    setError("");
    try {
      // Ensure backend service is ready
      await backendService.ensureReady();

      // Use centralized backend service
      let mine = [];
      try {
        mine = await backendService.getUserMemes();
        console.log(`Fetched ${mine?.length || 0} user memes`);
      } catch (error) {
        console.warn("Failed to fetch user memes:", error);
        // Create sample data for testing
        mine = [
          {
            id: "sample-1",
            meme_data: {
              prompt: "Sample meme for testing",
              image_url: "",
              image_filename: "sample.png",
              image_format: "png",
              metadata: {
                processing_time: 1.5,
                timestamp: Date.now() * 1000000,
                file_size_bytes: 1024000,
                service: "sample"
              }
            },
            created_at: Date.now(),
            sale_metadata: {
              is_listed: false,
              listing_price: null,
              listed_at: null,
              total_sales: 0,
              total_earned: 0,
              last_sale_price: null,
              last_sale_at: null
            },
            views: 0
          }
        ];
        console.log("Using sample data due to backend issues");
      }

      if (!mine || !Array.isArray(mine)) {
        console.warn("Invalid response from getUserMemes:", mine);
        setNfts([]);
        return;
      }

      let entRaw = [];
      let noticesRaw = [];
      try {
        entRaw = await backendService.getMyMintEntitlements();
      } catch (error) {
        console.warn("Failed to fetch mint entitlements:", error);
      }

      try {
        noticesRaw = await backendService.getWinnerNotices();
      } catch (error) {
        console.warn("Failed to fetch winner notices:", error);
      }

      const normalizedEntitlements = normalizeEntitlements(entRaw);
      const normalizedNotices = normalizeWinnerNotices(noticesRaw);

      const entitlementMap = new Map();
      normalizedEntitlements.forEach((ent) => {
        const existing = entitlementMap.get(ent.memeId) || [];
        existing.push(ent);
        entitlementMap.set(ent.memeId, existing);
      });

      // Check minting status for each meme
      const ui = await Promise.all(
        mine.map(async (item, index) => {
          const baseUi = mapToUi(item);
          const numericId = Number(baseUi.id);
          const entitlementList = Number.isFinite(numericId)
            ? entitlementMap.get(numericId) || []
            : [];

          let isMinted = false;
          try {
            if (index > 0) {
              await new Promise((resolve) => setTimeout(resolve, 100));
            }
            if (/^\d+$/.test(baseUi.id)) {
              isMinted = await backendService.isMemeMinted(BigInt(baseUi.id));
            }
          } catch (error) {
            console.warn(`Failed to check minting status for meme ${baseUi.id}:`, error);
          }

          const activeEntitlement = entitlementList.find((ent) => ent.status === 'Active') || null;
          const usedEntitlements = entitlementList
            .filter((ent) => ent.status === 'Used')
            .sort((a, b) => (b.usedAtMs || 0) - (a.usedAtMs || 0));

          return {
            ...baseUi,
            isMinted: Boolean(isMinted),
            entitlements: entitlementList,
            activeEntitlement,
            mintedEntitlement: usedEntitlements.length > 0 ? usedEntitlements[0] : null,
          };
        })
      );

      setEntitlements(normalizedEntitlements);
      setWinnerNotices(normalizedNotices);
      setNfts(ui);
    } catch (e) {
      console.error("Error loading portfolio:", e);
      // Check if it's an authentication/storage error
      if (e.message && (e.message.includes('anchor_number') || e.message.includes('storage'))) {
        setError("Authentication issue. Please try logging out and back in.");
      } else {
        setError("Failed to load your portfolio. Please try again.");
      }
      setNfts([]);
    } finally {
      setLoading(false);
    }
  }

  const findNftByMemeId = (memeId) =>
    nfts.find((nft) => {
      const numericId = Number(nft.id);
      return Number.isFinite(numericId) && numericId === memeId;
    });

  const openMintModal = (nft) => {
    setMintTarget(nft);
    setMintModalOpen(true);
  };

  const closeMintModal = () => {
    setMintModalOpen(false);
    setMintTarget(null);
  };

  const handleMintConfirm = async ({ memeId, mintType, editions }) => {
    try {
      setMinting(true);
      const idAsString = typeof memeId === "string" ? memeId : String(memeId);
      if (!/^\d+$/.test(idAsString)) {
        throw new Error("Invalid meme identifier for minting");
      }

      const mintMode =
        (mintType ?? "").toLowerCase() === "collection"
          ? (() => {
              const total = Number(editions);
              if (!Number.isInteger(total) || total < 2 || total > 50) {
                throw new Error("Collection supply must be between 2 and 50 editions");
              }
              return { Collection: { editions: total } };
            })()
          : { Single: null };

      await backendService.mintMeme(BigInt(idAsString), mintMode);
      toast({
        title: "Your meme has been minted!",
        description: "Mint entitlement consumed successfully.",
      });
      closeMintModal();
      await fetchData();
    } catch (error) {
      console.error("Minting failed:", error);
      toast({
        title: "Minting failed",
        description: error.message || "Could not mint your meme. Please try again.",
        variant: "destructive",
      });
    } finally {
      setMinting(false);
    }
  };

  const openListingModal = (nft) => {
    setListingTarget(nft);
    setListingModalOpen(true);
  };

  const closeListingModal = () => {
    setListingTarget(null);
    setListingModalOpen(false);
  };

  const handleListingConfirm = async (memeId, options = {}) => {
    try {
      setListingLoading(true);
      const idAsString = typeof memeId === "string" ? memeId : String(memeId);
      if (!/^\d+$/.test(idAsString)) {
        throw new Error("Invalid meme identifier for listing");
      }

      const price = Number(options.price);
      if (!Number.isFinite(price) || price <= 0) {
        throw new Error("Listing requires a positive price");
      }

      const priceE8s = BigInt(Math.round(price * 100000000));
      await backendService.listMemeForSale(BigInt(idAsString), priceE8s);
      toast({
        title: "Listing created successfully!",
        description: "Your NFT is now visible on the marketplace.",
      });
      closeListingModal();
      await fetchData();
    } catch (error) {
      console.error("Listing failed:", error);
      toast({
        title: "Listing failed",
        description: error.message || "Could not list your NFT. Please try again.",
        variant: "destructive",
      });
    } finally {
      setListingLoading(false);
    }
  };

  const handleDelist = async (memeId) => {
    try {
      setListingLoading(true);
      const idAsString = typeof memeId === "string" ? memeId : String(memeId);
      if (!/^\d+$/.test(idAsString)) {
        throw new Error("Invalid meme identifier for delisting");
      }

      await backendService.removeMemeFromMarket(BigInt(idAsString));
      toast({
        title: "Listing removed",
        description: "Your NFT has been delisted from the marketplace.",
      });
      await fetchData();
    } catch (error) {
      console.error("Failed to remove listing:", error);
      toast({
        title: "Delisting failed",
        description: error.message || "Could not remove the listing. Please try again.",
        variant: "destructive",
      });
    } finally {
      setListingLoading(false);
    }
  };

  useEffect(() => {
    if (isAuthenticated) {
      fetchData();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isAuthenticated]);

  // Periodic refresh of vote counts and stats
  useEffect(() => {
    if (!isAuthenticated || loading) return;

    const refreshPortfolio = async () => {
      if (refreshing) return; // Prevent multiple simultaneous refreshes

      setRefreshing(true);
      try {
        // Refresh vote counts for existing memes
        if (nfts.length > 0) {
          const updatedNfts = await Promise.all(
            nfts.map(async (nft) => {
              try {
                if (!/^\d+$/.test(String(nft.id))) {
                  return nft;
                }
                const memeIdBigInt = BigInt(nft.id);
                const voteData = await backendService.getMemeVotes(memeIdBigInt);

                if (voteData) {
                  const newVotes = safeBigIntToNumber(voteData.upvotes) - safeBigIntToNumber(voteData.downvotes);
                  return { ...nft, votes: newVotes };
                }
                return nft;
              } catch (error) {
                console.warn(`Failed to refresh votes for meme ${nft.id}:`, error);
                return nft;
              }
            })
          );
          setNfts(updatedNfts);
        }
      } catch (error) {
        console.warn("Failed to refresh portfolio data:", error);
      } finally {
        setRefreshing(false);
      }
    };

    // Initial refresh after loading
    const initialRefreshTimer = setTimeout(refreshPortfolio, 2000);

    // Set up periodic refresh every 30 seconds
    const refreshInterval = setInterval(refreshPortfolio, 30000);

    return () => {
      clearTimeout(initialRefreshTimer);
      clearInterval(refreshInterval);
    };
  }, [isAuthenticated, loading, nfts]);

  if (authLoading) {
    return <LoadingState message="Connecting to your identity…" />;
  }

  if (!isAuthenticated) {
    return <LoadingState message="Redirecting you to the login experience…" />;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-background to-muted/20 text-foreground">
      <Navigation />
      <main className="mx-auto flex w-full max-w-6xl flex-col gap-10 px-4 pb-16 pt-10">
        <Card className="border-primary/20 bg-gradient-to-br from-primary/10 via-primary/5 to-secondary/10 text-foreground shadow-lg shadow-primary/10">
          <CardContent className="p-8">
            <div className="flex flex-col gap-8">
              {/* Header Section */}
              <div className="flex flex-col gap-6 md:flex-row md:items-start md:justify-between">
                <div className="space-y-2">
                  <p className="text-xs font-medium uppercase tracking-[0.3em] text-primary/70 pt-3">Creator Profile</p>
                  <h1 className="text-3xl font-semibold md:text-4xl">
                    {displayName || "Anonymous"}
                  </h1>
                  <p className="max-w-md text-sm text-foreground/80">
                    Track your meme creations, earnings, and momentum across the Mementic universe.
                  </p>
                </div>
              </div>

              {/* Stats Grid */}
              <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-4">
                <div className="rounded-2xl border border-primary/30 bg-primary/10 p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Sparkles className="h-5 w-5 text-primary" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-primary/70">Voting Power</p>
                  <p className="mt-2 text-2xl font-semibold text-primary">{totalVotes.toLocaleString()}</p>
                  <p className="text-xs text-primary/60 mt-1">Total upvotes</p>
                </div>

                <div className="rounded-2xl border border-secondary/30 bg-secondary/10 p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Crown className="h-5 w-5 text-secondary" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-secondary/70">Memes Created</p>
                  <p className="mt-2 text-2xl font-semibold text-secondary">{generatedCount.toLocaleString()}</p>
                  <p className="text-xs text-secondary/60 mt-1">Total generated</p>
                </div>

                <div className="rounded-2xl border border-accent/30 bg-accent/10 p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <TrendingUp className="h-5 w-5 text-accent" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-accent/70">Minted NFTs</p>
                  <p className="mt-2 text-2xl font-semibold text-accent">{mintedCount.toLocaleString()}</p>
                  <p className="text-xs text-accent/60 mt-1">On-chain assets</p>
                </div>

                <div className="rounded-2xl border border-amber-500/30 bg-amber-500/10 p-4 text-center">
                  <div className="flex items-center justify-center mb-2">
                    <Coins className="h-5 w-5 text-amber-600" />
                  </div>
                  <p className="text-xs uppercase tracking-wide text-amber-600/70">Total Sales</p>
                  <p className="mt-2 text-2xl font-semibold text-amber-600">{totalSales.toLocaleString()}</p>
                  <p className="text-xs text-amber-600/60 mt-1">Marketplace transactions</p>
                </div>
              </div>

              {/* Principal Info */}
              <div className="rounded-2xl border border-primary/30 bg-primary/5 p-4">
                <div className="flex items-center justify-between">
                  <div>
                    <span className="text-xs uppercase tracking-wide text-primary/70">Principal ID</span>
                    <span className="mt-2 block text-sm font-mono text-foreground" title={principal}>
                      {principal ? principalPreview : "Not connected"}
                    </span>
                  </div>
                  <div className="text-right">
                    <p className="text-xs text-primary/70">Marketplace Listings</p>
                    <p className="text-lg font-semibold text-primary">{listedCount.toLocaleString()}</p>
                  </div>
                </div>
              </div>

              {/* Username Editor */}
              {usernameSaved && !showUsernameEditor && (
                <div className="rounded-xl border border-emerald-400/40 bg-emerald-500/10 px-4 py-2 text-sm text-emerald-700 dark:text-emerald-200">
                  Username updated successfully.
                </div>
              )}

              {showUsernameEditor ? (
                <form onSubmit={handleUsernameSubmit} className="space-y-3">
                  <div className="flex items-center gap-2 text-sm text-foreground/80">
                    <User className="h-4 w-4 text-primary" />
                    <span>Choose how you appear to other creators</span>
                  </div>
                  <Input
                    value={usernameInput}
                    onChange={(event) => {
                      setUsernameInput(event.target.value);
                      setUsernameError("");
                      setUsernameSaved(false);
                    }}
                    placeholder="e.g. MemeMaestro"
                    maxLength={32}
                    disabled={savingUsername}
                    className="bg-background text-foreground placeholder:text-muted-foreground"
                  />
                  {usernameError && <p className="text-xs text-destructive">{usernameError}</p>}
                  <div className="flex flex-col gap-2 sm:flex-row">
                    <Button type="submit" disabled={savingUsername} className="sm:flex-1">
                      {savingUsername ? "Saving…" : "Save username"}
                    </Button>
                    {hasUsername && (
                      <Button
                        type="button"
                        variant="ghost"
                        className="sm:flex-1"
                        onClick={handleCancelUsername}
                        disabled={savingUsername}
                      >
                        Cancel
                      </Button>
                    )}
                  </div>
                </form>
              ) : (
                <div className="flex flex-col gap-3 text-sm sm:flex-row sm:items-center sm:justify-between">
                  <p className="text-foreground/80">
                    {hasUsername
                      ? "Your username is visible everywhere instead of your principal."
                      : "Pick a username so your principal stays private."}
                  </p>
                  <div className="flex items-center gap-3">
                    {!hasUsername && (
                      <Button size="sm" variant="secondary" onClick={handleEditUsername}>
                        Add username
                      </Button>
                    )}
                    {hasUsername && (
                      <Button size="sm" variant="ghost" onClick={handleEditUsername}>
                        Edit username
                      </Button>
                    )}
                  </div>
                </div>
              )}

              {/* Action Buttons */}
              <div className="flex flex-wrap gap-3">
                <Button
                  variant="secondary"
                  onClick={() => navigate("/myplace")}
                  className="bg-primary hover:bg-primary"
                >
                  <Sparkles className="mr-2 h-4 w-4" />
                  Create meme
                </Button>
                <Button
                  variant="outline"
                  onClick={() => navigate("/marketplace")}
                  className="border-primary/40 text-foreground hover:bg-primary"
                >
                  Browse marketplace
                </Button>
                <Button
                  variant="outline"
                  onClick={async () => {
                    setRefreshing(true);
                    try {
                      await fetchData();
                      toast({
                        title: "Portfolio refreshed",
                        description: "Your latest stats are now up to date.",
                      });
                    } catch (error) {
                      toast({
                        title: "Refresh failed",
                        description: "Could not refresh portfolio data.",
                        variant: "destructive",
                      });
                    } finally {
                      setRefreshing(false);
                    }
                  }}
                  disabled={refreshing || loading}
                  className="border-primary/40 text-foreground hover:bg-primary/10"
                >
                  {refreshing ? (
                    <div className="mr-2 h-4 w-4 animate-spin rounded-full border border-current border-t-transparent" />
                  ) : (
                    <ArrowUp className="mr-2 h-4 w-4" />
                  )}
                  Refresh
                </Button>
                <Button
                  variant="ghost"
                  onClick={handleLogout}
                  className="text-rose-800 hover:bg-rose-500"
                >
                  <ArrowDown className="mr-2 h-4 w-4" />
                  Logout
                </Button>
              </div>
            </div>
        </CardContent>
      </Card>

      {winnerNotices.length > 0 && (
        <Card className="border-amber-300/40 bg-amber-500/10 text-amber-900 dark:text-amber-100 shadow-lg shadow-amber-500/20">
          <CardHeader className="pb-3">
            <CardTitle className="flex items-center gap-2 text-lg">
              <Crown className="h-5 w-5 text-amber-600" />
              Weekly Winners
            </CardTitle>
            <p className="text-sm text-amber-700/80 dark:text-amber-200/80">
              Mint your winning memes before the window closes.
            </p>
          </CardHeader>
          <CardContent className="space-y-4">
            {winnerNotices.map((notice) => {
              const targetNft = findNftByMemeId(notice.memeId);
              const countdown = formatMintCountdown(notice.expiresAtMs);
              return (
                <div
                  key={notice.entitlementId}
                  className="flex flex-col gap-2 rounded-xl border border-amber-400/40 bg-white/60 px-4 py-3 text-sm shadow-sm dark:bg-amber-900/40 md:flex-row md:items-center md:justify-between"
                >
                  <div>
                    <p className="font-semibold text-amber-900 dark:text-amber-100">
                      {notice.message || `🎉 Your meme "${notice.memeTitle}" placed #${notice.rank} in Week ${notice.weekId}.`}
                    </p>
                    <p className="text-xs text-amber-800/80 dark:text-amber-200/80">
                      Mint window {countdown} • Mint before {formatDateTime(notice.expiresAtMs)}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span
                      className={`rounded-full px-3 py-1 text-xs font-semibold ${
                        notice.status === 'Active'
                          ? 'bg-amber-500 text-black'
                          : notice.status === 'Used'
                          ? 'bg-emerald-500/90 text-black'
                          : 'bg-rose-500/90 text-white'
                      }`}
                    >
                      {notice.status === 'Active'
                        ? 'Active'
                        : notice.status === 'Used'
                        ? 'Minted'
                        : 'Expired'}
                    </span>
                    {notice.status === 'Active' && targetNft && (
                      <Button
                        size="sm"
                        className="bg-gradient-to-r from-amber-400 to-rose-400 text-black hover:opacity-90"
                        onClick={() => openMintModal(targetNft)}
                      >
                        Mint Meme
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </CardContent>
        </Card>
      )}

      <div className="grid gap-6 lg:grid-cols-2">
        {/* Performance Overview */}
        <Card className="border-primary/20 bg-gradient-to-br from-card/80 to-card/60 text-card-foreground shadow-lg shadow-primary/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                <TrendingUp className="h-5 w-5 text-primary" />
                Performance Overview
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Visual breakdown of your portfolio metrics
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Custom Bar Chart */}
              <div className="space-y-4">
                <div className="h-64 w-full">
                  <svg viewBox="0 0 400 200" className="w-full h-full">
                    {/* Grid lines */}
                    <defs>
                      <pattern id="grid" width="40" height="20" patternUnits="userSpaceOnUse">
                        <path d="M 40 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="0.5" opacity="0.1"/>
                      </pattern>
                    </defs>
                    <rect width="100%" height="100%" fill="url(#grid)" />

                    {/* Bars */}
                    {[
                      { label: 'ICP Earned', value: totalEarnings, max: Math.max(totalEarnings * 1.5, 10), color: 'hsl(var(--primary))', icon: Coins },
                      { label: 'Total Views', value: totalViews, max: Math.max(totalViews * 1.5, 1000), color: 'hsl(var(--secondary))', icon: Sparkles },
                      { label: 'Avg ICP/Vote', value: avgEarningsPerVote, max: Math.max(avgEarningsPerVote * 1.5, 1), color: 'hsl(var(--accent))', icon: TrendingUp },
                      { label: 'Listed %', value: listedProgress, max: 100, color: 'hsl(45 86% 58%)', icon: ArrowUp }
                    ].map((metric, index) => {
                      const barHeight = (metric.value / metric.max) * 120;
                      const x = 60 + index * 80;
                      const y = 160 - barHeight;

                      return (
                        <g key={metric.label}>
                          {/* Bar */}
                          <rect
                            x={x}
                            y={y}
                            width="40"
                            height={barHeight}
                            fill={metric.color}
                            rx="4"
                            className="transition-all duration-500 hover:opacity-80"
                          />

                          {/* Value label on top of bar */}
                          <text
                            x={x + 20}
                            y={y - 8}
                            textAnchor="middle"
                            className="text-xs font-semibold fill-current"
                          >
                            {metric.label === 'ICP Earned' ? `${metric.value.toFixed(1)}` :
                             metric.label === 'Total Views' ? `${(metric.value / 1000).toFixed(0)}K` :
                             metric.label === 'Avg ICP/Vote' ? `${(metric.value / 1000).toFixed(2)}` :
                             `${metric.value}%`}
                          </text>

                          {/* X-axis label */}
                          <text
                            x={x + 20}
                            y={180}
                            textAnchor="middle"
                            className="text-xs fill-muted-foreground"
                          >
                            {metric.label.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>

                {/* Legend */}
                <div className="flex flex-wrap justify-center gap-4 text-xs">
                  {[
                    { label: 'ICP Earned', color: 'bg-primary', icon: Coins },
                    { label: 'Total Views', color: 'bg-secondary', icon: Sparkles },
                    { label: 'Avg ICP/Vote', color: 'bg-accent', icon: TrendingUp },
                    { label: 'Listed Share', color: 'bg-amber-500', icon: ArrowUp }
                  ].map((item) => (
                    <div key={item.label} className="flex items-center gap-1">
                      <div className={`w-3 h-3 rounded ${item.color}`} />
                      <span className="text-muted-foreground">{item.label}</span>
                    </div>
                  ))}
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Portfolio Progress */}
          <Card className="border-secondary/20 bg-gradient-to-br from-card/80 to-card/60 text-card-foreground shadow-lg shadow-secondary/10">
            <CardHeader className="pb-4">
              <CardTitle className="text-xl font-semibold text-card-foreground flex items-center gap-2">
                <Crown className="h-5 w-5 text-secondary" />
                Portfolio Progress
              </CardTitle>
              <p className="text-sm text-muted-foreground">
                Track your journey from creation to NFT
              </p>
            </CardHeader>
            <CardContent className="space-y-6">
              {/* Minting Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">NFT Minting Progress</span>
                  <span className="text-sm text-secondary font-semibold">{mintedProgress}%</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-secondary to-accent h-2 rounded-full transition-all duration-500"
                    style={{ width: `${mintedProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {mintedCount} of {generatedCount} memes minted as NFTs
                </p>
              </div>

              {/* Marketplace Progress */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-sm font-medium text-card-foreground">Marketplace Activity</span>
                  <span className="text-sm text-primary font-semibold">{listedCount} listed</span>
                </div>
                <div className="w-full bg-muted rounded-full h-2">
                  <div
                    className="bg-gradient-to-r from-primary to-accent h-2 rounded-full transition-all duration-500"
                    style={{ width: `${listedProgress}%` }}
                  />
                </div>
                <p className="text-xs text-muted-foreground">
                  {listedCount > 0 ? `${listedCount} memes currently listed for sale` : "No memes currently listed for sale"}
                </p>
              </div>

              {/* Quick Stats */}
              <div className="grid grid-cols-2 gap-4 pt-2">
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-primary">{generatedCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Created</p>
                </div>
                <div className="text-center p-3 rounded-lg bg-muted/50">
                  <p className="text-2xl font-bold text-secondary">{mintedCount.toLocaleString()}</p>
                  <p className="text-xs text-muted-foreground">Minted</p>
                </div>
              </div>
            </CardContent>
          </Card>
        </div>

        <section className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-primary/20 text-primary-foreground">
                <Sparkles className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Generated Memes</h2>
                <p className="text-sm text-foreground/80">
                  Keep your meme factory buzzing and convert momentum into NFTs.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/myplace")} className="bg-gradient-to-r from-primary to-secondary text-primary-foreground shadow-lg shadow-primary/20">
              <Sparkles className="mr-2 h-4 w-4" />
              Create new meme
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 6 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : generatedMemes.length === 0 ? (
            <Card className="border border-dashed border-primary/40 bg-muted/40 py-16 text-center text-foreground">
              <CardContent>
                <CardTitle className="text-xl">No generated memes yet</CardTitle>
                <p className="mt-3 text-sm text-foreground/80">
                  Launch your first meme to start earning votes and collector attention.
                </p>
                <Button onClick={() => navigate("/myplace")} className="mt-6 bg-primary text-primary-foreground">
                  Start creating
                </Button>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {generatedMemes.map((nft) => (
                <div
                  key={nft.id}
                  className="group relative cursor-pointer overflow-hidden rounded-xl bg-white dark:bg-gray-900 shadow-lg hover:shadow-2xl transition-all duration-300 w-full max-w-sm mx-auto transform hover:-translate-y-1"
                >
                  {/* Aspect ratio container - Made larger */}
                  <div className="aspect-[4/5] w-full relative">
                    {/* Main Image Container */}
                    <div className="relative w-full h-full overflow-hidden">
                      {nft.imageUrl ? (
                        <img
                          src={nft.imageUrl}
                          alt={nft.title}
                          className="w-full h-full transition-transform duration-500 group-hover:scale-105"
                          loading="lazy"
                        />
                      ) : (
                        <div className="w-full h-full bg-gradient-to-br from-gray-100 to-gray-200 dark:from-gray-800 dark:to-gray-700 flex items-center justify-center">
                          <span className="text-6xl filter drop-shadow-lg">
                            {nft.emoji || "🖼️"}
                          </span>
                        </div>
                      )}

                      {/* Enhanced Gradient Overlay */}
                      <div
                        className={`absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent transition-opacity duration-300 ${
                          true ? "opacity-100" : "opacity-60"
                        }`}
                      />

                      {/* Interactive Overlay Content */}
                      <div className="absolute inset-0 flex flex-col justify-between p-4">
                        {/* Top Section - Badges */}
                        <div className="flex justify-between items-start">
                          <div className="flex flex-wrap gap-2">
                            {nft.activeEntitlement && (
                              <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/90 px-3 py-1 text-xs font-semibold text-black shadow">
                                🏆 You won this week!
                              </span>
                            )}
                            {!nft.activeEntitlement &&
                              Array.isArray(nft.entitlements) &&
                              nft.entitlements.some((ent) => ent.status === 'Expired') && (
                                <span className="inline-flex items-center gap-1 rounded-full bg-rose-500/80 px-3 py-1 text-xs font-semibold text-white">
                                  Mint window expired
                                </span>
                              )}
                          </div>

                          {/* Action indicators */}
                          <div
                            className={`transition-opacity duration-300 ${
                              true ? "opacity-100" : "opacity-0"
                            }`}
                          >
                            <div className="bg-black/40 backdrop-blur-sm rounded-full p-2">
                              <span className="text-white text-xs">View</span>
                            </div>
                          </div>
                        </div>

                        {/* Bottom Section - Info and Stats */}
                        <div className="space-y-3">
                          {/* Stats Row - Always Visible */}
                          <div className="flex items-center justify-between text-white">
                            <div className="flex items-center gap-4">
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-sm">{nft.votes}</span>
                              </div>
                              <div className="flex items-center gap-1">
                                <span className="font-semibold text-sm">{nft.views} views</span>
                              </div>
                            </div>
                          </div>

                          {/* Title and Creator */}
                          <div className="text-white">
                            <h3 className="font-bold text-lg leading-tight mb-1 line-clamp-2">
                              {nft.title}
                            </h3>
                            <p className="text-white/80 text-sm">by @{displayName || "Anonymous"}</p>
                            <p className="text-white/60 text-xs">
                              {new Date(nft.created_at || Date.now()).toLocaleString("en-IN", {
                                timeZone: "Asia/Kolkata",
                                dateStyle: "short",
                                timeStyle: "short",
                              })}
                            </p>
                          </div>

                          {nft.activeEntitlement ? (
                            <div className="space-y-2">
                              <p className="text-xs text-white/80">
                                Mint window closes in {formatMintCountdown(nft.activeEntitlement.expiresAtMs)}
                              </p>
                              <Button
                                size="sm"
                                className="w-full bg-gradient-to-r from-amber-400 to-rose-400 text-black hover:opacity-90"
                                onClick={() => openMintModal(nft)}
                                disabled={minting && mintTarget?.id === nft.id}
                              >
                                Mint Meme
                              </Button>
                            </div>
                          ) : (
                            Array.isArray(nft.entitlements) &&
                            nft.entitlements.some((ent) => ent.status === 'Expired') && (
                              <p className="text-xs text-rose-200/80">Mint window expired</p>
                            )
                          )}
                        </div>
                      </div>
                    </div>
                  </div>

                  {/* Subtle border glow effect */}
                  <div className="absolute inset-0 rounded-xl bg-gradient-to-r from-purple-500/20 to-pink-500/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300 pointer-events-none" />
                </div>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-10">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div className="flex items-center gap-4">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-secondary/20 text-secondary-foreground">
                <Crown className="h-6 w-6" />
              </div>
              <div>
                <h2 className="text-2xl font-semibold text-foreground">Minted NFTs</h2>
                <p className="text-sm text-foreground/80">
                  Celebrate the memes that made it on-chain and keep an eye on collector interest.
                </p>
              </div>
            </div>
            <Button onClick={() => navigate("/marketplace")} className="bg-gradient-to-r from-secondary to-accent text-secondary-foreground shadow-lg shadow-secondary/20">
              Visit marketplace
            </Button>
          </div>

          {loading ? (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {Array.from({ length: 3 }).map((_, i) => (
                <SkeletonTile key={i} />
              ))}
            </div>
          ) : mintedNFTs.length === 0 ? (
            <Card className="border border-dashed border-secondary/40 bg-muted/40 py-16 text-center text-secondary-foreground">
              <CardContent>
                <CardTitle className="text-xl">No minted NFTs yet</CardTitle>
                <p className="mt-3 text-sm text-foreground/80">
                  Your Top-3 winners will appear here after you mint them from your portfolio.
                </p>
              </CardContent>
            </Card>
          ) : (
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
              {mintedNFTs.map((nft) => (
                <Card key={nft.id} className="border border-secondary/30 bg-card shadow-lg shadow-secondary/10">
                  <CardHeader>
                    <div className="flex items-start justify-between gap-4">
                      {nft.imageUrl ? (
                        <img
                          src={nft.imageUrl}
                          alt={nft.title}
                          className="h-16 w-16 rounded-xl object-cover"
                        />
                      ) : (
                        <div className="flex h-16 w-16 items-center justify-center rounded-xl bg-secondary/20 text-3xl">
                          {nft.emoji}
                        </div>
                      )}
                      <div className="flex-1 space-y-1">
                        <h3 className="text-lg font-semibold text-card-foreground line-clamp-2">{nft.title}</h3>
                        <p className="text-xs uppercase tracking-wide text-secondary/70">#{nft.id}</p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="space-y-4 text-sm text-foreground/80">
                    <div className="grid gap-3 sm:grid-cols-2">
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">Votes</p>
                        <p className="mt-2 text-xl font-semibold text-amber-100">{nft.votes.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">Views</p>
                        <p className="mt-2 text-xl font-semibold text-sky-100">{nft.views.toLocaleString()}</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">Earned</p>
                        <p className="mt-2 text-xl font-semibold text-emerald-100">{nft.earnedIcp.toFixed(4)} ICP</p>
                      </div>
                      <div className="rounded-xl bg-white/5 p-3">
                        <p className="text-xs uppercase tracking-wide text-purple-200/70">Status</p>
                        <p className="mt-2 text-sm font-semibold text-purple-100">Minted NFT</p>
                      </div>
                    </div>
                    {nft.mintedEntitlement && (
                      <div className="rounded-xl bg-white/5 p-3 text-xs text-purple-100/80">
                        <p className="uppercase tracking-wide text-purple-200/70">
                          Week {nft.mintedEntitlement.weekId} winner
                        </p>
                        <p className="mt-2 text-sm font-semibold text-purple-100">
                          {formatDateTime(nft.mintedEntitlement.usedAtMs)
                            ? `Minted on ${formatDateTime(nft.mintedEntitlement.usedAtMs)}`
                            : "Minted"}
                          {` • #${nft.mintedEntitlement.rank} finish`}
                        </p>
                      </div>
                    )}
                    {typeof nft.listingPrice === "number" && (
                      <div className="rounded-xl bg-white/5 p-3 text-xs text-purple-100/80">
                        <p className="uppercase tracking-wide text-purple-200/70">Last listing</p>
                        <p className="mt-2 text-base font-semibold text-purple-100">{nft.listingPrice.toFixed(2)} ICP</p>
                      </div>
                    )}
                    <div className="flex flex-wrap gap-3">
                      {nft.isListed ? (
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleDelist(nft.id)}
                          className="border-rose-300 text-rose-100 hover:bg-rose-500/20"
                          disabled={listingLoading}
                        >
                          Delist from marketplace
                        </Button>
                      ) : (
                        <Button
                          size="sm"
                          onClick={() => openListingModal(nft)}
                          className="bg-gradient-to-r from-amber-400 to-rose-400 text-black hover:opacity-90"
                          disabled={listingLoading}
                        >
                          List on marketplace
                        </Button>
                      )}
                      <Button
                        variant="outline"
                        size="sm"
                        onClick={() => navigate("/marketplace")}
                        className="border-secondary/40 text-foreground hover:bg-secondary/10"
                      >
                        View marketplace
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </section>

        <section className="space-y-6 rounded-3xl border border-primary/20 bg-card p-8 shadow-lg shadow-primary/10">
          <div className="flex flex-wrap items-center gap-4">
            <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-accent/20 text-accent-foreground">
              <MessageSquare className="h-6 w-6" />
            </div>
          <div>
            <h2 className="text-2xl font-semibold text-card-foreground">Share your feedback</h2>
            <p className="text-sm text-foreground/80">
              Help us shape the next wave of meme tools and creator features.
            </p>
          </div>
          </div>
          <FeedbackForm />
        </section>
      </main>

      <MintingModal
        isOpen={mintModalOpen}
        onClose={closeMintModal}
        meme={mintTarget}
        entitlement={mintTarget?.activeEntitlement ?? null}
        onConfirm={handleMintConfirm}
        isMinting={minting}
      />

      <ListingModal
        isOpen={listingModalOpen}
        onClose={closeListingModal}
        nft={listingTarget}
        onConfirm={handleListingConfirm}
        isProcessing={listingLoading}
      />
    </div>
  );
}

export default Portfolio
