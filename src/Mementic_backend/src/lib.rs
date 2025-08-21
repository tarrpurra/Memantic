//! Monolithic canister entry-point that wires:
//! - http_outcall: HTTPS outcalls to Python AI + meme storage
//! - voting: weekly votes, leaderboards, top-3 getters
//! - NFT_module: lean ICRC-7 NFT minter that can mint Top-3 winners
//!
//! Use `mint_week_top3_here(week_id)` to mint within this canister
//! by calling the NFT module with this canister's own principal
//! as the "voting canister".

mod http_outcall;
mod voting;


mod nft_module;

use candid::{CandidType,Nat, Principal,Decode,Encode};
use ic_cdk::api::management_canister::http_request::TransformArgs;
use ic_cdk::api::management_canister::http_request::HttpResponse;
use crate::nft_module::InitArgs;
use ic_cdk_macros::{query, update};
use serde::{Deserialize, Serialize};

// ---- Re-exports so frontend/Node can import from this canister idl easily ----
pub use http_outcall::{
    GeneratorInput, GeneratorResponse, MemeAIResponse, MemeData, PythonMetadata, 
    StoredMeme, PublicStoredMeme, get_meme, get_user_memes, check_remaining_calls,
    get_total_memes, get_user_meme_count, call_generator,
};
pub use voting::{
    MemeVotes, VoteRecord, VoteType, WeeklyPeriod, WeeklyLeaderboard, LeaderboardEntry, TopEntry,
    VoteResponse, vote_meme, remove_vote, get_current_leaderboard, get_week_leaderboard,
    get_top3_for_week, get_meme_votes, get_user_vote, get_completed_weeks,
    get_current_week_status, finalize_finished_weeks, finalize_week, get_voting_stats,
};
pub use nft_module::{
    SupportedStandard, TokenRecord, TokenMetadataEntry, MetadataValue, MintedPair
};

// MintedPair is imported from nft_module

/// Simple health probe
// #[query]
// fn health() -> &'static str {
//     "OK"
// }

/// Orchestrator: mint Top-3 for a completed `week_id` using the local modules.
///
/// Internally calls `nft_module::mint_week_top3_from_voting` with this canister's
/// principal as the voting canister (since `voting` + `http_outcall` live here).
///
/// Access control is enforced in the NFT module (admin-only).
#[update]
pub async fn mint_week_top3_here(week_id: u64) -> Result<Vec<MintedPair>, String> {
    let voting_canister = ic_cdk::id();
    nft_module::mint_week_top3_from_voting(voting_canister, week_id).await
}

// ------------------------------
// All other update/query methods are defined inside the three modules.
// Because they use #[update]/#[query] and are `pub`, they are exported
// by this canister automatically.
// ------------------------------



ic_cdk::export_candid!();
// // Candid export
// #[cfg(target_arch = "wasm32")]
// #[no_mangle]
// pub fn canister_query__get_candid_interface_tmp_hack() -> String {
//     ic_cdk::export_candid!();
//     String::new()
// }

// #[cfg(not(target_arch = "wasm32"))]
// pub fn export_candid() -> String {
//     use candid::export_service;
//     export_service!();
//     __export_service()
// }
