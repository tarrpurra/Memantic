mod http_outcall;
mod voting;
mod nft_module;

use candid::{CandidType, Nat, Principal, Decode, Encode};
use ic_cdk::api::management_canister::http_request::TransformArgs;
use ic_cdk::api::management_canister::http_request::HttpResponse;
use crate::nft_module::InitArgs;
use ic_cdk_macros::{query, update};
use serde::{Deserialize, Serialize};

pub use http_outcall::{
    MemeData, PythonMetadata, StoredMeme, PublicStoredMeme,
    get_meme, get_user_memes, get_total_memes, get_user_meme_count, generate_meme, health, check_remaining_calls,
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

#[update]
pub async fn mint_week_top3_here(week_id: u64) -> Result<Vec<MintedPair>, String> {
    let voting_canister = ic_cdk::id();
    nft_module::mint_week_top3_from_voting(voting_canister, week_id).await
}

ic_cdk::export_candid!();
