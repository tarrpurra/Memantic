# Mementic Meme Ecosystem Logic Specification

## Purpose
This document defines the non-code logic that coordinates the Pre-Marketplace, Portfolio, and NFT Marketplace so that weekly meme competitions feed directly into minting and trading on the Internet Computer (ICP). The goals are to guarantee eligibility, prevent inconsistent state across zones, and deliver predictable UX messaging.

## Weekly Lifecycle Overview
1. **Submission Window (Pre-Marketplace)**
   - Memes can be uploaded and edited until the weekly cutoff.
   - Each submission is linked to its creator's principal and assigned a unique `meme_id`.
2. **Voting Window (Pre-Marketplace)**
   - Users vote on active memes; each vote records `(meme_id, voter_principal, timestamp)` and is deduplicated per voter per meme per week.
   - Engagement metrics (views, shares) are tracked for tie-breaking.
3. **Finalization (Weekly Cron / Governance Canister)**
   - At the designated end time, a deterministic routine aggregates votes and engagement to rank memes.
   - The top three ranked memes emit a `WinnerNotice` and create mint entitlements for their owners.
   - All other memes are marked `not_winner` for the week.
4. **Portfolio Mint Phase**
   - Winners see badges and mint controls in their portfolio during the entitlement validity window (e.g., 14 days).
5. **Post-Mint Trading Phase**
   - Minted NFTs move into "My Minted NFTs" for optional listing on the marketplace.
   - Listings then surface globally in the NFT Marketplace for purchase.

## Core Data Structures
### Meme Record (`StoredMeme`)
- `meme_id`: unique identifier.
- `creator_principal`: principal who submitted the meme.
- `media_uri`, `title`, `description`, `week_id`.
- `vote_count`, `engagement_score`, `placement` (nullable until finalization).
- `status`: `active`, `locked_for_voting`, `finalized`.

### Voting Ledger
- Weekly index keyed by `week_id` → array of `VoteRecord` (`meme_id`, `voter_principal`, `timestamp`).
- Deduplication index `(week_id, voter_principal)` → latest set of memes voted to enforce per-voter limits.

### Mint Entitlement
- `entitlement_id`: deterministic hash of `(meme_id, week_id)`.
- `meme_id`, `week_id`, `winner_principal`.
- `status`: `active`, `used`, `expired`.
- `expires_at`: `finalization_timestamp + mint_window`.
- `winner_notice`: cached struct containing copy-ready UX text (rank, meme name, week, awarded_on).

### NFT Record (`TokenRecord`)
- `token_id`, `meme_id`, `collection_supply`, `edition_number` (for 1/1, supply = 1).
- `owner_principal`, `minted_on`, `metadata_uri`, `mint_mode` (`single`, `collection`).
- `source_entitlement_id` to guarantee unique minting.

### Listing Record
- `listing_id`: unique per token or per edition for collections.
- `token_id`, `seller_principal`, `price`, `currency`, `quantity_available`.
- `status`: `draft`, `listed`, `sold_out`, `cancelled`.
- `created_on`, `updated_on`.

### Notification Log
- `notification_id`, `recipient_principal`, `kind` (`winner`, `mint_success`, `listing_status`, etc.).
- `message`, `created_on`, `read_at` (optional).

## Zone-Specific Logic
### Pre-Marketplace
- **Submissions**: Accept new memes while `submission_window_open == true`.
- **Voting**: Enforce one vote per meme per user per week; attempts beyond that return a friendly toast (“You already backed this meme!”).
- **Leaderboard**: Display provisional rankings (votes + engagement) with a banner clarifying “Top-3 minting rights lock in every Friday at 23:59 UTC”.
- **Finalization Routine**:
  1. Lock submissions and voting.
  2. Calculate `score = vote_count + engagement_weight * engagement_score`.
  3. Sort by score, apply deterministic tie breakers (earlier submission wins).
  4. For top three entries, create `MintEntitlement` with `status=active` and `expires_at`.
  5. Emit `WinnerNotice` records and push notifications to Portfolio zone.
  6. Mark all memes `finalized` with `placement` recorded.

### Portfolio
- **Default View**: List all memes created/owned by the user sorted by week. Non-winning memes show neutral status.
- **Winner Badges**: For memes with `MintEntitlement.status == active`, show “🏆 You won this week!” and `Mint Meme` CTA.
- **Entitlement Expiry**: When `now > expires_at`, status flips to `expired`, UI label reads “Mint window expired”. Button is hidden.
- **Mint Flow**:
  1. User clicks `Mint Meme`.
  2. System verifies entitlement still `active` and `caller == winner_principal`.
  3. Prompt for mint mode: `Single NFT` or `Collection NFT`. If collection, request total editions (min 2).
  4. On confirmation, mint `TokenRecord`(s):
     - For single: create one token.
     - For collection: mint `collection_supply` tokens with sequential `edition_number`.
  5. Mark entitlement `used` and store the resulting `token_id`(s) under `My Minted NFTs`.
  6. Display toast “Your meme has been minted!” and add notification entry.

- **My Minted NFTs**:
  - Show table/gallery of tokens minted by the user with status badges (`Unlisted`, `Listed`, `Sold Out`).
  - Each unlisted token exposes `List on Marketplace` button.

- **Listing Flow**:
  1. Verify `caller == owner_principal` and token not already `listed`.
  2. Prompt for `price`, `currency` (ICP or supported ICRC-1), and `quantity` (for collections, max remaining editions).
  3. Validate `price > 0` and `quantity <= unlisted_supply`.
  4. Persist `ListingRecord` with `status=listed` and associate with token.
  5. Show confirmation “Listing created successfully!” and notification.

### NFT Marketplace
- Pulls only `ListingRecord.status == listed` entries.
- Displays metadata: meme title, creator, edition info, price, and CTA to buy.
- **Purchase Flow** (read-only logic description):
  1. Buyer chooses `Buy`.
  2. System ensures listing still active and buyer ≠ seller.
  3. Funds transfer occurs via escrow; on success, token ownership updates and quantity decrements.
  4. If quantity reaches zero, listing -> `sold_out`.
  5. Notifications dispatched to both seller and buyer.
- No minting or new listings can originate here; buttons route back to Portfolio.

## State Synchronization & Guards
- **Single Source of Truth**:
  - Meme status (votes, placement) stored in Pre-Marketplace canister.
  - Entitlements live in a dedicated `MintEntitlement` store but reference meme IDs and principals.
  - NFTs and listings exist in the Portfolio/Marketplace canister pair but always reference `source_entitlement_id` for traceability.
- **Cross-Canister Messaging**:
  - After finalization, a message dispatch updates the Portfolio canister with new entitlements and notifications.
  - Minting updates push back to Pre-Marketplace to mark `meme_id` as minted (prevents duplicate entitlements from future weeks).
- **Guards**:
  - Mint API requires `status == active` and `caller == winner_principal`.
  - Listing API requires `caller == owner` and token `not listed`.
  - Purchase API rejects if listing `status != listed` or buyer lacks funds.
  - Cron task sweeps entitlements daily to flip `active` → `expired` when needed.

## Notifications & UX Copy
- **Winner**: “🎉 Congratulations! Your meme placed in the Top-3 this week. You can mint it as an NFT in your Portfolio.”
- **Mint Success**: “Your meme has been minted!”
- **Mint Expired**: “Mint window expired” badge replaces button.
- **Listing Success**: “Listing created successfully!”
- **Purchase Success (Seller)**: “Your NFT just sold!”
- **Purchase Success (Buyer)**: “You now own this meme NFT!”

## Edge Cases & Recovery
- **Tie at Rank 3**: Deterministic tie-breaker uses earliest submission timestamp; losers receive consolation notification.
- **Owner Transfer Before Finalization**: `winner_principal` is captured at finalization moment; entitlement bound to that principal even if meme ownership changes later.
- **Entitlement Expiration**: Cron marks expired; UI hides mint button and shows grey badge. Entitlements remain for audit but cannot be reactivated without admin override.
- **Failed Mint Transaction**: If minting fails mid-process, entitlement remains `active` and user sees retry prompt.
- **Delist/Re-list**: Owners can set listing `status=cancelled` to delist; they can re-list by creating a new listing with updated price.
- **Redeployment / Hot Reload**: All state stored on-chain; upon canister upgrade, initialization routine rehydrates caches and recomputes derived leaderboard from persisted data.

## User Journey Recap
1️⃣ **Vote** in the Pre-Marketplace during the weekly session.
2️⃣ **Win** when your meme lands in the Top-3 at finalization and receive an entitlement.
3️⃣ **Mint** the meme via your Portfolio within 14 days.
4️⃣ **List** the minted NFT from “My Minted NFTs” with your chosen price.
5️⃣ **Sell** on the NFT Marketplace as collectors discover and purchase the listed NFT.

