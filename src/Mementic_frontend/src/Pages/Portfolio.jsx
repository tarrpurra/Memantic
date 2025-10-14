import { useEffect, useState } from "react";
import Navigation from "../components/Navigation";
import { Button } from "../components/ui/Button";
import { Card, CardContent, CardHeader, CardTitle } from "../components/ui/Card";
import { Input } from "../components/ui/Input";
import { Textarea } from "../components/ui/Textarea";
import { useAuth } from "../contexts/AuthContext";
import { useToast } from "../hooks/use-toast";
import backendService from "../services/backendService";

const TABS = [
  { key: "generated", label: "Generated" },
  { key: "winners", label: "Winners" },
  { key: "minted", label: "My Minted NFTs" },
];

const emptyMintForm = {
  open: false,
  meme: null,
  mode: "single",
  name: "",
  symbol: "MEME",
  description: "",
  royaltyBps: "0",
  externalUrl: "",
  license: "",
  attributes: "",
  editionCount: "10",
};

const emptyListingForm = {
  open: false,
  nft: null,
  price: "",
  quantity: "1",
  expiresHours: "",
};

function parseAttributes(attributeText) {
  if (!attributeText.trim()) return [];
  return attributeText
    .split(",")
    .map((pair) => pair.trim())
    .filter(Boolean)
    .map((pair) => {
      const [key, value] = pair.split(":");
      return [key?.trim() ?? "trait", value?.trim() ?? "value"];
    });
}

function icpToE8s(value) {
  const trimmed = value.trim();
  if (!trimmed) {
    throw new Error("Price is required");
  }
  if (!/^\d*(\.\d{0,8})?$/.test(trimmed)) {
    throw new Error("Enter price in ICP using up to 8 decimals");
  }
  const [wholeRaw, fractionRaw = ""] = trimmed.split(".");
  const whole = wholeRaw.length ? BigInt(wholeRaw) : 0n;
  const fraction = fractionRaw.padEnd(8, "0").slice(0, 8);
  return whole * 100000000n + BigInt(fraction);
}

function buildMetadata(formState, imageUri) {
  return {
    name: formState.name.trim(),
    symbol: formState.symbol.trim() || "MEME",
    description: formState.description.trim() ? [formState.description.trim()] : [],
    royalty_bps:
      formState.royaltyBps && formState.royaltyBps.trim()
        ? [Number(formState.royaltyBps)]
        : [],
    external_url: formState.externalUrl.trim() ? [formState.externalUrl.trim()] : [],
    attributes: parseAttributes(formState.attributes),
    license: formState.license.trim() ? [formState.license.trim()] : [],
    image_uri: imageUri,
  };
}

function formatPrincipalId(principal) {
  if (!principal) return "-";
  const text = principal?.toText?.() ?? principal?.toString?.() ?? String(principal);
  if (text.length <= 10) return text;
  return `${text.slice(0, 5)}...${text.slice(-3)}`;
}

function formatIcpValue(value) {
  if (value === undefined || value === null) return "-";
  try {
    const nat = typeof value === "bigint" ? value : BigInt(value);
    const whole = nat / 100000000n;
    const fraction = nat % 100000000n;
    const fractionStr = fraction
      .toString()
      .padStart(8, "0")
      .replace(/0+$/, "");
    return `${whole}${fractionStr ? `.${fractionStr}` : ""} ICP`;
  } catch (error) {
    console.warn("Failed to format ICP value", value, error);
    return "-";
  }
}

function formatRanking(rank) {
  if (!rank && rank !== 0) return "Unranked";
  const numeric = Number(rank);
  if (!Number.isFinite(numeric) || numeric <= 0) {
    return "Unranked";
  }
  return `#${numeric}`;
}

const unwrapOptional = (value) => (Array.isArray(value) ? value[0] : value);

const toDateFromNs = (ns) => {
  if (ns === undefined || ns === null) return new Date();
  const big = typeof ns === "bigint" ? ns : BigInt(ns);
  return new Date(Number(big / 1000000n));
};

const relativeTimeFromNow = (date) => {
  const now = Date.now();
  const diff = Math.max(0, now - date.getTime());
  const minutes = Math.floor(diff / 60000);
  if (minutes < 1) return "just now";
  if (minutes < 60) return `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours} hour${hours === 1 ? "" : "s"} ago`;
  const days = Math.floor(hours / 24);
  if (days < 30) return `${days} day${days === 1 ? "" : "s"} ago`;
  const months = Math.floor(days / 30);
  if (months < 12) return `${months} month${months === 1 ? "" : "s"} ago`;
  const years = Math.floor(months / 12);
  return `${years} year${years === 1 ? "" : "s"} ago`;
};

const Portfolio = () => {
  const { isAuthenticated } = useAuth();
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState(TABS[0].key);
  const [loading, setLoading] = useState(true);
  const [generatedMemes, setGeneratedMemes] = useState([]);
  const [winners, setWinners] = useState([]);
  const [mintedNfts, setMintedNfts] = useState([]);
  const [mintForm, setMintForm] = useState(emptyMintForm);
  const [listingForm, setListingForm] = useState(emptyListingForm);
  const [refreshing, setRefreshing] = useState(false);

  useEffect(() => {
    if (!isAuthenticated) return;
    let cancelled = false;
    const run = async () => {
      setLoading(true);
      try {
        await backendService.ensureReady();
        const memes = await backendService.getUserMemes();
        const minted = await backendService.getMyMintedNfts([]);

        const mintedIdSet = new Set(minted.map((item) => Number(item.meme_id ?? 0)));
        const generated = memes.filter((meme) => !mintedIdSet.has(Number(meme.id)));
        const winnerChecks = await Promise.all(
          generated.map(async (meme) => ({
            meme,
            isWinner: await backendService.isWinner(meme.id),
          }))
        );

        const eligibleWinners = winnerChecks
          .filter((entry) => entry.isWinner)
          .map((entry) => ({
            meme: entry.meme,
            alreadyMinted: mintedIdSet.has(Number(entry.meme.id)),
          }));

        if (!cancelled) {
          setGeneratedMemes(generated);
          setWinners(eligibleWinners);
          setMintedNfts(minted);
        }
      } catch (error) {
        console.error("Failed to load portfolio data", error);
        toast({
          title: "Portfolio refresh failed",
          description: error.message ?? String(error),
          variant: "destructive",
        });
      } finally {
        if (!cancelled) {
          setLoading(false);
          setRefreshing(false);
        }
      }
    };
    run();
    return () => {
      cancelled = true;
    };
  }, [isAuthenticated, toast]);

  const openMintForm = (meme) => {
    setMintForm({
      ...emptyMintForm,
      open: true,
      meme,
      name: meme.meme_data.caption ?? `Meme #${meme.id}`,
      description: meme.meme_data.caption ?? "",
      externalUrl: meme.meme_data.image_url,
    });
  };

  const openListingForm = (nft) => {
    setListingForm({
      ...emptyListingForm,
      open: true,
      nft,
      quantity: nft.is_collection ? String(nft.owned_quantity ?? 1) : "1",
    });
  };

  const closeMintForm = () => setMintForm(emptyMintForm);
  const closeListingForm = () => setListingForm(emptyListingForm);

  const refreshData = async () => {
    setRefreshing(true);
    setLoading(true);
    setMintForm(emptyMintForm);
    setListingForm(emptyListingForm);
    // Trigger effect by updating state via ensureReady
    if (isAuthenticated) {
      try {
        const memes = await backendService.getUserMemes();
        const minted = await backendService.getMyMintedNfts([]);
        const mintedIdSet = new Set(minted.map((item) => Number(item.meme_id ?? 0)));
        const generated = memes.filter((meme) => !mintedIdSet.has(Number(meme.id)));
        const winnerChecks = await Promise.all(
          generated.map(async (meme) => ({
            meme,
            isWinner: await backendService.isWinner(meme.id),
          }))
        );
        const eligibleWinners = winnerChecks
          .filter((entry) => entry.isWinner)
          .map((entry) => ({
            meme: entry.meme,
            alreadyMinted: mintedIdSet.has(Number(entry.meme.id)),
          }));
        setGeneratedMemes(generated);
        setWinners(eligibleWinners);
        setMintedNfts(minted);
      } catch (error) {
        console.error("Failed to refresh portfolio", error);
        toast({
          title: "Refresh failed",
          description: error.message ?? String(error),
          variant: "destructive",
        });
      } finally {
        setLoading(false);
        setRefreshing(false);
      }
    }
  };

  const handleMintSubmit = async (event) => {
    event.preventDefault();
    if (!mintForm.meme) return;
    try {
      const metadata = buildMetadata(mintForm, mintForm.meme.meme_data.image_url);
      if (!metadata.name) {
        throw new Error("Name is required");
      }
      if (metadata.royalty_bps.length && (metadata.royalty_bps[0] < 0 || metadata.royalty_bps[0] > 1000)) {
        throw new Error("Royalty must be between 0 and 1000 basis points");
      }
      if (mintForm.mode === "collection") {
        const editionCount = Number(mintForm.editionCount);
        if (!Number.isInteger(editionCount) || editionCount < 2) {
          throw new Error("Collection mint requires at least 2 editions");
        }
        await backendService.mintCollectionNft(mintForm.meme.id, editionCount, metadata);
      } else {
        await backendService.mintSingleNft(mintForm.meme.id, metadata);
      }
      toast({
        title: "Mint successful",
        description: "Your NFT is ready in My Minted NFTs.",
      });
      await refreshData();
    } catch (error) {
      console.error("Mint failed", error);
      toast({
        title: "Mint failed",
        description: error.message ?? String(error),
        variant: "destructive",
      });
    }
  };

  const handleListingSubmit = async (event) => {
    event.preventDefault();
    if (!listingForm.nft) return;
    try {
      const price = icpToE8s(listingForm.price);
      const quantity = Math.max(1, Number(listingForm.quantity));
      const expiresAt = listingForm.expiresHours.trim()
        ? (() => {
            const hours = Number(listingForm.expiresHours);
            const clamped = Number.isFinite(hours) && hours > 0 ? hours : 0;
            const nowNs = BigInt(Date.now()) * 1000000n;
            const durationNs = BigInt(Math.floor(clamped)) * 60n * 60n * 1000000000n;
            return [nowNs + durationNs];
          })()
        : [];
      await backendService.listForSale(
        listingForm.nft.token_id,
        price,
        quantity,
        expiresAt
      );
      toast({
        title: "Listing created",
        description: "Your NFT is live on the marketplace.",
      });
      await refreshData();
    } catch (error) {
      console.error("Listing failed", error);
      toast({
        title: "Listing failed",
        description: error.message ?? String(error),
        variant: "destructive",
      });
    }
  };

  const renderGenerated = () => (
    <div className="grid gap-4">
      {generatedMemes.length === 0 && (
        <Card className="border-dashed border-border/60 bg-background/70">
          <CardContent className="p-8 text-center text-muted-foreground">
            You have no generated memes waiting to be minted.
          </CardContent>
        </Card>
      )}
      {generatedMemes.map((meme) => (
        <Card key={meme.id} className="border-border/60 bg-background/80 shadow-card">
          <CardHeader>
            <CardTitle className="text-lg font-semibold">#{meme.id}</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div className="space-y-2">
              <p className="text-sm text-muted-foreground">{meme.meme_data.prompt}</p>
              {meme.meme_data.caption && (
                <p className="text-sm font-medium text-foreground">{meme.meme_data.caption}</p>
              )}
            </div>
            <div className="flex flex-wrap gap-3 text-xs text-muted-foreground">
              <span>Created {relativeTimeFromNow(toDateFromNs(meme.created_at))}</span>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderWinners = () => (
    <div className="grid gap-4">
      {winners.length === 0 && (
        <Card className="border-dashed border-border/60 bg-background/70">
          <CardContent className="p-8 text-center text-muted-foreground">
            No winning memes waiting for minting yet. Keep competing!
          </CardContent>
        </Card>
      )}
      {winners.map(({ meme, alreadyMinted }) => (
        <Card key={meme.id} className="border-border/60 bg-background/80 shadow-card">
          <CardHeader className="flex flex-row items-center justify-between">
            <CardTitle className="text-lg font-semibold">Weekly Winner #{meme.id}</CardTitle>
            <Button
              disabled={alreadyMinted}
              onClick={() => openMintForm(meme)}
            >
              {alreadyMinted ? "Already Minted" : "Convert to NFT"}
            </Button>
          </CardHeader>
          <CardContent className="grid gap-4 md:grid-cols-[240px_1fr]">
            <img
              src={meme.meme_data.image_url}
              alt={meme.meme_data.caption ?? `Meme ${meme.id}`}
              className="h-48 w-full rounded-xl object-cover"
            />
            <div className="space-y-3">
              <p className="text-sm text-muted-foreground">{meme.meme_data.prompt}</p>
              {meme.meme_data.caption && (
                <p className="text-sm font-medium text-foreground">{meme.meme_data.caption}</p>
              )}
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  const renderMinted = () => (
    <div className="grid gap-4 md:grid-cols-2">
      {mintedNfts.length === 0 && (
        <Card className="border-dashed border-border/60 bg-background/70 md:col-span-2">
          <CardContent className="p-8 text-center text-muted-foreground">
            Mint a winning meme to see it here.
          </CardContent>
        </Card>
      )}
      {mintedNfts.map((nft) => {
        const ownedQuantity = Number(nft.owned_quantity ?? 0);
        const marketInfo = nft.market ?? {};
        const listingPrice = unwrapOptional(marketInfo.listing_price);
        const floorPrice = unwrapOptional(marketInfo.floor_price);
        const lastSalePrice = unwrapOptional(marketInfo.last_sale_price);
        const lastSaleAt = unwrapOptional(marketInfo.last_sale_at);
        const ranking = unwrapOptional(marketInfo.ranking);
        const hasActiveListing = Boolean(
          marketInfo.listed && Number(marketInfo.listed_quantity ?? 0) > 0
        );
        const totalSalesText = marketInfo.total_sales?.toString?.() ?? String(marketInfo.total_sales ?? 0);

        return (
          <Card key={nft.token_id.toString()} className="border-border/60 bg-background/80 shadow-card">
            <CardHeader>
              <CardTitle className="text-lg font-semibold">{nft.name}</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <img
                src={nft.image_uri}
                alt={nft.name}
                className="h-48 w-full rounded-xl object-cover"
              />
              <div className="space-y-1 text-sm text-muted-foreground">
                <p>Token ID: {nft.token_id.toString()}</p>
                <p>Meme ID: {nft.meme_id?.toString?.() ?? "-"}</p>
                {nft.is_collection && <p>Edition Size: {nft.edition_size ?? "?"}</p>}
                <p>Owned Quantity: {ownedQuantity}</p>
                <p>Current Owner: {formatPrincipalId(unwrapOptional(marketInfo.current_owner))}</p>
                <p>Ranking: {formatRanking(ranking)}</p>
              </div>
                <div className="space-y-2 rounded-xl border border-border/60 bg-background/60 p-4 text-xs text-muted-foreground">
                  <div className="flex items-center justify-between text-sm font-medium text-foreground">
                    <span>{hasActiveListing ? "Active Listing" : "Not Listed"}</span>
                    {hasActiveListing && (
                      <span className="text-primary">{formatIcpValue(listingPrice)}</span>
                    )}
                  </div>
                  <div className="grid grid-cols-2 gap-x-4 gap-y-1">
                    <span>Listed Quantity</span>
                    <span className="text-right text-foreground">{marketInfo.listed_quantity ?? 0}</span>
                    <span>Floor Price</span>
                    <span className="text-right text-foreground">{formatIcpValue(floorPrice)}</span>
                    <span>Total Volume</span>
                    <span className="text-right text-foreground">{formatIcpValue(marketInfo.total_volume)}</span>
                    <span>Last Sale</span>
                  <span className="text-right text-foreground">
                    {formatIcpValue(lastSalePrice)}
                    {lastSaleAt
                      ? ` · ${relativeTimeFromNow(toDateFromNs(lastSaleAt))}`
                      : ""}
                  </span>
                  <span>Total Sales</span>
                  <span className="text-right text-foreground">{totalSalesText}</span>
                </div>
              </div>
              <Button
                variant={hasActiveListing ? "default" : "outline"}
                disabled={ownedQuantity === 0}
                onClick={() => openListingForm(nft)}
              >
                {hasActiveListing ? "Manage Listing" : "List for Sale"}
              </Button>
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  return (
    <div className="min-h-screen bg-background text-foreground">
      <Navigation />
      <main className="mx-auto max-w-6xl px-4 py-12 sm:px-6">
        <header className="mb-10 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div>
            <h1 className="text-3xl font-semibold">Portfolio</h1>
            <p className="text-muted-foreground">
              Manage your generated memes, winners, and minted NFTs.
            </p>
          </div>
          <Button variant="outline" onClick={refreshData} disabled={refreshing || loading}>
            {refreshing ? "Refreshing..." : "Refresh"}
          </Button>
        </header>

        <div className="mb-8 flex flex-wrap gap-2">
          {TABS.map((tab) => (
            <Button
              key={tab.key}
              variant={tab.key === activeTab ? "default" : "outline"}
              onClick={() => setActiveTab(tab.key)}
            >
              {tab.label}
            </Button>
          ))}
        </div>

        {loading ? (
          <Card className="border-border/60 bg-background/70">
            <CardContent className="p-12 text-center text-muted-foreground">
              Loading your portfolio...
            </CardContent>
          </Card>
        ) : (
          <div className="space-y-8">
            {activeTab === "generated" && renderGenerated()}
            {activeTab === "winners" && renderWinners()}
            {activeTab === "minted" && renderMinted()}
          </div>
        )}

        {mintForm.open && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
            <Card className="w-full max-w-2xl border-border/60 bg-background">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>Mint NFT</CardTitle>
                <Button variant="ghost" onClick={closeMintForm}>
                  Close
                </Button>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={handleMintSubmit}>
                  <div className="grid grid-cols-2 gap-4">
                    <Button
                      type="button"
                      variant={mintForm.mode === "single" ? "default" : "outline"}
                      onClick={() => setMintForm((prev) => ({ ...prev, mode: "single" }))}
                    >
                      Single (1/1)
                    </Button>
                    <Button
                      type="button"
                      variant={mintForm.mode === "collection" ? "default" : "outline"}
                      onClick={() => setMintForm((prev) => ({ ...prev, mode: "collection" }))}
                    >
                      Collection
                    </Button>
                  </div>
                  {mintForm.mode === "collection" && (
                    <div>
                      <label className="text-sm font-medium">Edition Count</label>
                      <Input
                        value={mintForm.editionCount}
                        min={2}
                        onChange={(e) => setMintForm((prev) => ({ ...prev, editionCount: e.target.value }))}
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Name</label>
                    <Input
                      value={mintForm.name}
                      onChange={(e) => setMintForm((prev) => ({ ...prev, name: e.target.value }))}
                      required
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Symbol</label>
                    <Input
                      value={mintForm.symbol}
                      onChange={(e) => setMintForm((prev) => ({ ...prev, symbol: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Description</label>
                    <Textarea
                      value={mintForm.description}
                      onChange={(e) => setMintForm((prev) => ({ ...prev, description: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Royalty (bps)</label>
                    <Input
                      value={mintForm.royaltyBps}
                      onChange={(e) => setMintForm((prev) => ({ ...prev, royaltyBps: e.target.value }))}
                      placeholder="0"
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">External URL</label>
                    <Input
                      value={mintForm.externalUrl}
                      onChange={(e) => setMintForm((prev) => ({ ...prev, externalUrl: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">License</label>
                    <Input
                      value={mintForm.license}
                      onChange={(e) => setMintForm((prev) => ({ ...prev, license: e.target.value }))}
                    />
                  </div>
                  <div>
                    <label className="text-sm font-medium">Attributes (key:value, key:value)</label>
                    <Input
                      value={mintForm.attributes}
                      onChange={(e) => setMintForm((prev) => ({ ...prev, attributes: e.target.value }))}
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" type="button" onClick={closeMintForm}>
                      Cancel
                    </Button>
                    <Button type="submit">Mint NFT</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}

        {listingForm.open && (
          <div className="fixed inset-0 z-40 flex items-center justify-center bg-black/60 px-4">
            <Card className="w-full max-w-lg border-border/60 bg-background">
              <CardHeader className="flex flex-row items-center justify-between">
                <CardTitle>List NFT for Sale</CardTitle>
                <Button variant="ghost" onClick={closeListingForm}>
                  Close
                </Button>
              </CardHeader>
              <CardContent>
                <form className="grid gap-4" onSubmit={handleListingSubmit}>
                  <div>
                    <label className="text-sm font-medium">Price (ICP)</label>
                    <Input
                      value={listingForm.price}
                      onChange={(e) => setListingForm((prev) => ({ ...prev, price: e.target.value }))}
                      placeholder="e.g. 1.5"
                      required
                    />
                  </div>
                  {listingForm.nft?.is_collection && (
                    <div>
                      <label className="text-sm font-medium">Quantity</label>
                      <Input
                        value={listingForm.quantity}
                        min={1}
                        max={listingForm.nft.owned_quantity ?? 1}
                        onChange={(e) => setListingForm((prev) => ({ ...prev, quantity: e.target.value }))}
                        required
                      />
                    </div>
                  )}
                  <div>
                    <label className="text-sm font-medium">Expires In (hours, optional)</label>
                    <Input
                      value={listingForm.expiresHours}
                      onChange={(e) => setListingForm((prev) => ({ ...prev, expiresHours: e.target.value }))}
                      placeholder="Leave blank for no expiry"
                    />
                  </div>
                  <div className="flex justify-end gap-3 pt-4">
                    <Button variant="outline" type="button" onClick={closeListingForm}>
                      Cancel
                    </Button>
                    <Button type="submit">Create Listing</Button>
                  </div>
                </form>
              </CardContent>
            </Card>
          </div>
        )}
      </main>
    </div>
  );
};

export default Portfolio;
