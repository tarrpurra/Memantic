# Manual Testing Guide: Weekly Meme → NFT → Marketplace Flow

This guide walks through an end-to-end local test of the weekly competition, mint entitlement, and marketplace flow without modifying the code. It assumes that the canisters already include the mint entitlement logic described in `docs/meme_ecosystem_logic.md`.

## 1. Environment Setup

1. Install the prerequisites listed in the repository `README.md` (Node.js ≥16, Rust toolchain, DFX ≥0.14, npm).
2. From the project root, start a fresh local replica and deploy all canisters:
   ```bash
   dfx start --background --clean
   dfx deploy
   ```
3. Populate the frontend environment file (`src/Mementic_frontend/.env`) with the local canister IDs emitted by the deploy step. At minimum you need:
   ```env
   VITE_AGENT_HOST=http://localhost:4943
   VITE_CANISTER_ID_MEMENTIC_BACKEND=<backend_canister_id>
   DEV=true
   ```
4. Launch the React dev server in another terminal so you can exercise the UI flows:
   ```bash
   npm start
   ```
   The UI will be reachable at `http://localhost:8080`.

## 2. Pre-Marketplace: Submissions and Voting

1. **Authenticate two test identities.** Use Internet Identity in two separate browser profiles or create secondary principals via `dfx identity` for CLI calls (`dfx identity new tester-b`).
2. **Create memes.** In the UI, generate/publish at least three memes from one of the identities. If you prefer the CLI, call the backend directly:
   ```bash
   dfx identity use default
   dfx canister call Mementic_backend publish_meme '(
     record {
       prompt = "Retro penguin celebrating";
       caption = opt "Fresh off the mint";
       image_url = "https://example.com/penguin.png";
       image_filename = "penguin.png";
       image_format = "png";
       metadata = record {
         processing_time = 1.23;
         timestamp = 1_701_234_567_890_000_000;
         file_size_bytes = 204800;
         service = "test-harness"
       }
     }
   )'
   ```
   Repeat for at least three unique memes so that a Top-3 leaderboard can form.
3. **Cast votes.** Log in as the second identity and upvote the memes you want to win. From the CLI, vote with:
   ```bash
   dfx identity use tester-b
   dfx canister call Mementic_backend vote_meme '(1:nat64, variant { Upvote })'
   ```
   Replace `1` with the meme IDs returned from `publish_meme` or visible in the UI leaderboard. You can downvote using `variant { Downvote }` to exercise tie-breaking.
4. **Confirm leaderboard status.** Use either the Pre-Marketplace leaderboard UI or call:
   ```bash
   dfx canister call Mementic_backend get_current_leaderboard
   ```
   Ensure the three highest-scoring memes are the ones you plan to mint.

## 3. Week Finalization and Entitlements

1. Check the active week information (optional):
   ```bash
   dfx canister call Mementic_backend get_current_week_status
   ```
2. Finalize the week so entitlements are issued:
   ```bash
   dfx canister call Mementic_backend finalize_finished_weeks
   ```
   If you are testing in the same week the memes were created, you can force finalization with the explicit week ID:
   ```bash
   dfx canister call Mementic_backend finalize_week '(0:nat64)'
   ```
   Replace `0` with the appropriate `week_id` from the previous status command.
3. As the winning meme owner, fetch your winner notices and active entitlements:
   ```bash
   dfx identity use default
   dfx canister call Mementic_backend get_my_winner_notices
   dfx canister call Mementic_backend get_my_mint_entitlements
   ```
   Each winning meme should report `status = variant { Active }` and include the expiration timestamp.

## 4. Portfolio Minting Flow

1. Open the Portfolio page in the frontend. Winning memes will display the “🏆 You won this week!” badge and a `Mint Meme` button.
2. Trigger the mint modal and choose either **Single NFT** or **Collection NFT**. Validate that the countdown timer matches the `expires_at` timestamp from the entitlement query.
3. To mint from the CLI instead of the UI, run:
   ```bash
   dfx identity use default
   dfx canister call Mementic_backend mint_to '(1:nat64, variant { Single })'
   ```
   For a multi-edition collection:
   ```bash
   dfx canister call Mementic_backend mint_to '(
     2:nat64,
     variant { Collection = record { editions = 10:nat32 } }
   )'
   ```
4. Re-run the entitlement query to confirm the `status` flipped to `variant { Used }` and that `minted_token_ids` contains the minted token identifiers:
   ```bash
   dfx canister call Mementic_backend get_entitlements_for_meme '(1:nat64)'
   ```
5. Optionally verify the token metadata:
   ```bash
   dfx canister call Mementic_backend get_token_by_meme_id '(1:nat64)'
   dfx canister call Mementic_backend get_token '(minted_token_ids[0])'
   ```

## 5. Listing Minted NFTs

1. In the Portfolio UI under “My Minted NFTs,” use `List on Marketplace` to open the listing modal. Provide price, currency, and (for collections) quantity.
2. Via CLI, list the newly minted meme (price is expressed in e8s—`100_000_000` = 1 ICP):
   ```bash
   dfx identity use default
   dfx canister call Mementic_backend list_meme_for_sale '(1:nat64, 100_000_000:nat64)'
   ```
3. Confirm the listing metadata and marketplace feed:
   ```bash
   dfx canister call Mementic_backend get_sale_metadata_for_meme '(1:nat64)'
   dfx canister call Mementic_backend get_marketplace_memes
   ```
   The `sale_metadata` should reflect `is_listed = true` and the price you set. The NFT Marketplace UI will now show the item publicly.
4. Test delisting and relisting if desired:
   ```bash
   dfx canister call Mementic_backend remove_meme_from_market '(1:nat64)'
   dfx canister call Mementic_backend list_meme_for_sale '(1:nat64, 150_000_000:nat64)'
   ```

## 6. Validating Guards and Expiry (Optional)

- Attempting to mint as a non-owner or after `expires_at` should return the respective error messages (`"Only the winning meme owner can mint this NFT"`, `"Mint window expired"`). Switch identities or manipulate `dfx canister call ic clock` to validate expiry handling.
- Use `get_my_winner_notices` to confirm that notifications update once an entitlement is used or expires.
- Verify that previously minted memes cannot mint again: rerunning `mint_to` for the same meme ID should return `"Meme has already been minted as an NFT"`.

## 7. Clean Up

1. Stop the local replica when you finish testing:
   ```bash
   dfx stop
   ```
2. Remove temporary identities if you created them:
   ```bash
   dfx identity remove tester-b
   ```

Following these steps lets you observe the full lifecycle—voting, week finalization, entitlement issuance, minting, listing, and marketplace visibility—without editing any code.
