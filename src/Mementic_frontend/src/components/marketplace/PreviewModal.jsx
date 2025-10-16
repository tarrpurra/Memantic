import { useEffect, useState } from "react";
import { Button } from "../ui/Button";
import { X, Heart, Eye, Coins } from "lucide-react";

function PreviewModal({
  open,
  onClose,
  meme,
  onLike,
  isAuthenticated,
  isOwn,
  hasProfileName,
}) {
  const [hasVoted, setHasVoted] = useState(false);
  const [loadingVoteStatus, setLoadingVoteStatus] = useState(false);

  useEffect(() => {
    const onKey = (e) => {
      if (e.key === "Escape") onClose();
    };
    if (open) window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  // Check vote status when meme changes
  useEffect(() => {
    if (!open || !meme || !isAuthenticated || isOwn) {
      setHasVoted(false);
      setLoadingVoteStatus(false);
      return;
    }

    const checkVoteStatus = async () => {
      setLoadingVoteStatus(true);
      try {
        const bid = toOptionalBigInt(String(meme.id));
        if (!bid) {
          setHasVoted(false);
        } else {
          const userVote = await backendService.getUserVote(bid);
          setHasVoted(!!userVote);
        }
      } catch (error) {
        console.warn("Failed to check vote status:", error);
        setHasVoted(false);
      } finally {
        setLoadingVoteStatus(false);
      }
    };

    checkVoteStatus();
  }, [open, meme, isAuthenticated, isOwn]);

  if (!open || !meme) return null;

  const createdAt = (meme.created_at && !isNaN(Number(meme.created_at)) && Number(meme.created_at) > 1000000000000) ? Number(meme.created_at) : Date.now();
  const createdDate = new Date(createdAt);
  const createdStr = createdDate.toLocaleString("en-IN", {
    timeZone: "Asia/Kolkata",
    dateStyle: "medium",
    timeStyle: "short",
  });

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center w-screen">
      <div className="absolute inset-0 bg-black/60" onClick={onClose} />
      <div className="relative bg-card border border-border rounded-2xl shadow-2xl w-[95vw] max-w-7xl h-[95vh] overflow-hidden">
        <div className="flex h-full">
          {/* Left Panel: Image */}
          <div className="flex-1 flex items-center justify-center bg-muted p-4 overflow-auto ">
            {meme.image_url ? (
              <img
                src={meme.image_url}
                alt={meme.title}
                className="max-w-full"
                loading="lazy"
              />
            ) : (
              <div className="text-9xl">
                {meme.emoji || "🖼️"}
              </div>
            )}
          </div>

          {/* Right Panel: Info */}
          <div className="w-96 flex flex-col border-l border-border">
            {/* Header */}
            <div className="flex items-center justify-between px-4 py-3 border-b border-border">
              <div className="flex items-center gap-3">
                <div className="w-9 h-9 rounded-full bg-gradient-to-br from-primary/60 to-primary/30 flex items-center justify-center text-card font-bold">
                  {meme.creator?.[0]?.toUpperCase() || "U"}
                </div>
                <div>
                  <div className="font-semibold">{meme.creator || "Unknown"}</div>
                  <div className="text-xs text-muted-foreground">{createdStr}</div>
                </div>
              </div>
              <Button size="icon" variant="ghost" onClick={onClose} title="Close">
                <X className="w-5 h-5" />
              </Button>
            </div>

            {/* Content */}
            <div className="flex-1 overflow-y-auto p-4">
              <div className="space-y-4">
                <div>
                  <h3 className="text-lg font-semibold mb-2">{meme.title}</h3>
                  {meme.caption ? (
                    <p className="text-sm text-muted-foreground mb-2">{meme.caption}</p>
                  ) : meme.prompt ? (
                    <p className="text-sm text-muted-foreground mb-2">{meme.prompt}</p>
                  ) : null}
                </div>

                <div className="flex items-center justify-between">
                  <div className="flex items-center gap-4">
                    <div className="flex items-center gap-1">
                      <Heart className="w-4 h-4 text-red-500" />
                      <span className="text-sm text-black">{meme.votes}</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Eye className="w-4 h-4 text-blue-500" />
                      <span className="text-sm text-blue-500">{meme.views ?? 0} views</span>
                    </div>
                    <div className="flex items-center gap-1">
                      <Coins className="w-4 h-4 text-yellow-500" />
                      <span className="text-sm text-yellow-500">{meme.stakeAmount || 0} ICP</span>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Actions */}
            <div className="px-4 py-3 border-t border-border">
              <Button
                size="sm"
                variant={hasVoted ? "secondary" : (isAuthenticated && !isOwn ? "default" : "outline")}
                onClick={() => {
                  onLike(meme.id, meme.votes, meme.creator);
                  setHasVoted(true); // Optimistic update
                }}
                disabled={!isAuthenticated || !hasProfileName || isOwn || hasVoted || loadingVoteStatus}
                className={(!isAuthenticated || isOwn || hasVoted) ? "opacity-60" : ""}
                title={
                  !isAuthenticated
                    ? "Login to like"
                    : isOwn
                    ? "Can't like your own meme"
                    : hasVoted
                    ? "You have already voted on this meme"
                    : loadingVoteStatus
                    ? "Checking vote status..."
                    : "Like"
                }
              >
                <Heart className={`w-4 h-4 mr-2 ${hasVoted ? "fill-current" : ""}`} />
                {loadingVoteStatus ? (
                  <>
                    <div className="animate-spin h-3 w-3 border border-current border-t-transparent rounded-full mr-1" />
                    Loading...
                  </>
                ) : isOwn ? (
                  "Your Meme"
                ) : hasVoted ? (
                  `Voted (${meme.votes})`
                ) : (
                  `Vote (${meme.votes})`
                )}
              </Button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

export default PreviewModal;