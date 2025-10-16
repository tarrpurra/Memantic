// --- Small utilities ---
export const PAGE_SIZE = 12;

export const ensureArray = (v) => (Array.isArray(v) ? v : v ? Object.values(v) : []);

/** Safely convert BigInt-ish values to number */
export const safeBigIntToNumber = (value) => {
  if (typeof value === "bigint") {
    const MAX = BigInt(Number.MAX_SAFE_INTEGER);
    const MIN = BigInt(Number.MIN_SAFE_INTEGER);
    if (value > MAX) return Number.MAX_SAFE_INTEGER;
    if (value < MIN) return Number.MIN_SAFE_INTEGER;
    return Number(value);
  }
  if (typeof value === "number") return Number.isFinite(value) ? value : 0;
  if (typeof value === "string" && value.trim() !== "") {
    try {
      // handle "123n" style
      if (/^-?\d+n$/.test(value)) {
        const bi = BigInt(value.slice(0, -1));
        return safeBigIntToNumber(bi);
      }
      const n = Number(value);
      return Number.isFinite(n) ? n : 0;
    } catch {
      return 0;
    }
  }
  return 0;
};

/** Safe id string (never React key or URL param with raw BigInt) */
export const toSafeIdString = (v) => {
  if (typeof v === "bigint") return v.toString(10);
  if (typeof v === "number")
    return Number.isFinite(v) ? String(v) : `${Date.now()}`;
  if (typeof v === "string") return v || `${Date.now()}`;
  return `${Date.now()}`;
};

/** Only create BigInt if id is strictly numeric */
export const toOptionalBigInt = (id) => (/^\d+$/.test(id) ? BigInt(id) : null);

/** Optional: strip BigInts before logging (avoids console implicit conversions) */
export const stripBigInts = (obj) => {
  if (typeof obj === "bigint") return obj.toString();
  if (Array.isArray(obj)) return obj.map(stripBigInts);
  if (obj && typeof obj === "object") {
    return Object.fromEntries(
      Object.entries(obj).map(([k, v]) => [k, stripBigInts(v)])
    );
  }
  return obj;
};

export const formatNumber = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (Number.isInteger(n)) return n.toString();
  return n.toFixed(1);
};

export const formatIcp = (value) => {
  const n = Number(value) || 0;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  if (n >= 1) return n.toFixed(2);
  return n.toFixed(4);
};

export const normalizeMeme = (m, extra = {}, userProfiles = new Map()) => {
  // Supports PublicStoredMeme { id, owner, meme_data{...}, created_at, ... }
  const md = m?.meme_data || m;
  const owner = m?.owner ?? md?.owner ?? m?.creator;
  const unwrapOptional = (value) =>
    Array.isArray(value) ? value[0] : value ?? null;

  const normalizeTimestampToMs = (candidate) => {
    if (candidate == null) return 0;
    if (Array.isArray(candidate)) {
      return normalizeTimestampToMs(candidate[0]);
    }

    if (typeof candidate === "bigint") {
      if (candidate <= 0n) return 0;
      if (candidate > 1_000_000_000_000_000n) {
        return Number(candidate / 1_000_000n);
      }
      if (candidate > 1_000_000_000_000n) {
        return Number(candidate);
      }
      if (candidate > 1_000_000_000n) {
        return Number(candidate * 1000n);
      }
      if (candidate > 1_000_000n) {
        return Number(candidate / 1000n);
      }
      return Number(candidate);
    }

    if (typeof candidate === "number") {
      if (!Number.isFinite(candidate) || candidate <= 0) return 0;
      if (candidate > 1e15) return Math.floor(candidate / 1e6);
      if (candidate > 1e12) return Math.floor(candidate);
      if (candidate > 1e9) return Math.floor(candidate * 1000);
      if (candidate > 1e6) return Math.floor(candidate / 1000);
      return Math.floor(candidate);
    }

    if (typeof candidate === "string") {
      const trimmed = candidate.trim();
      if (!trimmed) return 0;
      try {
        if (/^-?\d+n$/.test(trimmed)) {
          return normalizeTimestampToMs(BigInt(trimmed.slice(0, -1)));
        }
        if (/^-?\d+$/.test(trimmed)) {
          return normalizeTimestampToMs(BigInt(trimmed));
        }
        const num = Number(trimmed);
        return normalizeTimestampToMs(num);
      } catch {
        return 0;
      }
    }

    return 0;
  };

  // Handle different vote structures
  const up = safeBigIntToNumber(
    extra?.votes?.upvotes ?? md?.upvotes ?? m?.upvotes ?? m?.votes ?? 0
  );
  const down = safeBigIntToNumber(
    extra?.votes?.downvotes ?? md?.downvotes ?? m?.downvotes ?? 0
  );
  const score = safeBigIntToNumber(m?.votes ?? m?.score ?? up - down);

  // Extract image URL from various possible locations
  let image_url =
    md?.image_url || m?.image_url || m?.url || m?.image || md?.url || "";

  // Ensure we have a likely-valid URL
  if (image_url && !/^https?:\/\//i.test(image_url)) {
    image_url = "";
  }

  // Handle owner/principal conversion
  let creator = "Anonymous";
  let ownerPrincipal = null;

  if (owner) {
    if (typeof owner === "string") {
      ownerPrincipal = owner;
      creator = owner;
    } else if (typeof owner === "object" && owner.toText) {
      // Handle Principal objects
      ownerPrincipal = owner.toText();
      creator = ownerPrincipal;
    } else {
      ownerPrincipal = String(owner);
      creator = ownerPrincipal;
    }

    // Try to get username from profiles
    if (ownerPrincipal && userProfiles.has(ownerPrincipal)) {
      const profile = userProfiles.get(ownerPrincipal);
      if (profile?.display_name) {
        creator = profile.display_name;
      } else if (profile?.username) {
        creator = profile.username;
      }
    } else {
      // Truncate long principal IDs for display if no username found
      if (creator.length > 20) {
        creator = creator.slice(0, 8) + "..." + creator.slice(-6);
      }
    }
  }

  const captionCandidate = unwrapOptional(md?.caption ?? m?.caption);
  const safeCaption =
    typeof captionCandidate === "string" && captionCandidate.trim().length > 0
      ? captionCandidate.trim()
      : "";

  const promptText =
    typeof md?.prompt === "string"
      ? md.prompt
      : typeof m?.prompt === "string"
      ? m.prompt
      : "";

  const metadata = unwrapOptional(md?.metadata ?? m?.metadata);
  const metadataTimestamp = metadata
    ? normalizeTimestampToMs(unwrapOptional(metadata?.timestamp))
    : 0;
  const createdAtCandidates = [
    metadataTimestamp,
    normalizeTimestampToMs(m?.created_at),
    normalizeTimestampToMs(md?.created_at),
    normalizeTimestampToMs(m?.timestamp),
    normalizeTimestampToMs(md?.timestamp),
  ];
  const createdAt =
    createdAtCandidates.find((value) => value && value > 0) ?? Date.now();

  const saleMetadata = m?.sale_metadata ?? m?.market_data ?? null;

  return {
    id: toSafeIdString(m?.id ?? m?.meme_id ?? m?._id ?? m?.uuid ?? Date.now()),
    title:
      safeCaption ||
      md?.title ||
      m?.title ||
      promptText ||
      "Untitled Meme",
    caption: safeCaption,
    prompt: promptText,
    creator,
    image_url,
    votes: score,
    views: safeBigIntToNumber(m?.views ?? saleMetadata?.views ?? 0),
    created_at: createdAt,
    rank: safeBigIntToNumber(extra?.rank ?? m?.rank ?? 0),
    emoji: m?.emoji || "🖼️",
    sale_metadata: saleMetadata,
    market_data: saleMetadata,
    __raw: m,
  };
};

export function getWeekEndIST(now = new Date()) {
  const offsetIST = 330; // +05:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + offsetIST * 60000);

  const day = ist.getDay(); // 0=Sun ... 6=Sat
  const daysToSunday = (7 - day) % 7;
  const end = new Date(ist);
  end.setDate(ist.getDate() + daysToSunday);
  end.setHours(23, 59, 59, 999);

  const backUtc = end.getTime() - offsetIST * 60000;
  return new Date(backUtc - end.getTimezoneOffset() * 60000);
}

export function getWeekStartIST(now = new Date()) {
  const offsetIST = 330; // +05:30
  const utc = now.getTime() + now.getTimezoneOffset() * 60000;
  const ist = new Date(utc + offsetIST * 60000);

  const day = ist.getDay(); // 0=Sun
  const daysToLastSunday = day;
  const start = new Date(ist);
  start.setDate(ist.getDate() - daysToLastSunday);
  start.setHours(0, 0, 0, 0);

  const backUtc = start.getTime() - offsetIST * 60000;
  return new Date(backUtc - start.getTimezoneOffset() * 60000);
}

export function formatRemaining(ms) {
  if (ms <= 0) return "0d 0h 0m";
  const d = Math.floor(ms / (24 * 3600e3));
  const h = Math.floor((ms % (24 * 3600e3)) / 3600e3);
  const m = Math.floor((ms % 3600e3) / 60e3);
  return `${d}d ${h}h ${m}m`;
}