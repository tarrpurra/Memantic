mod api_create;
mod api_query;
mod api_vote;
mod entitlements;
mod feedback;
mod http_outcall;
mod index;
mod leaderboard;
mod model;
mod nft_module;
mod rollover;
mod state;
mod time;
mod user_profiles;
mod voting;

use crate::nft_module::InitArgs;
use candid::{CandidType, Decode, Encode, Nat, Principal};
use ic_cdk::api::management_canister::http_request::HttpResponse;
use ic_cdk::api::management_canister::http_request::TransformArgs;
use ic_cdk_macros::{post_upgrade, query, update};
use serde::{Deserialize, Serialize};

pub use model::{MemeCard, MemeStatus, TopEntry, WeeklyLeaderboard};

pub use http_outcall::{
    check_remaining_calls,
    // updates
    generate_meme,
    get_all_memes,
    get_marketplace_memes,
    // queries
    get_meme,
    get_total_memes,
    get_total_users,
    get_user_meme_count,
    get_user_memes,
    health,
    increment_meme_views,
    is_meme_minted,
    list_meme_for_sale,
    publish_meme,
    record_meme_sale,
    remove_meme_from_market,
    ListingStrategy,
    MemeData,
    PublicStoredMeme,
    PythonMetadata,
    StoredMeme,
};

pub use voting::{
    finalize_finished_weeks, finalize_week, get_completed_weeks, get_current_week_status,
    get_meme_votes, get_top3_for_week, get_top_liked_memes, get_user_vote, get_voting_stats,
    get_week_leaderboard, remove_vote, vote_meme, LeaderboardEntry, LegacyTopEntry,
    LegacyWeeklyLeaderboard, MemeVotes, TopLikedLeaderboard, VoteRecord, VoteResponse, VoteType,
    WeeklyPeriod,
};

pub use entitlements::{
    get_entitlements_for_meme, get_my_mint_entitlements, get_my_winner_notices, EntitlementStatus,
    MintEntitlement, WinnerNotice,
};

pub use nft_module::{
    get_nft_image,
    get_sale_metadata,
    get_sale_metadata_for_meme,
    get_token,
    get_token_by_meme_id,
    get_tokens_by_meme_id,
    icrc7_name,
    icrc7_owner_of,
    icrc7_supported_standards,
    icrc7_symbol,
    icrc7_tokens_of,
    icrc7_total_supply,
    // minting
    mint_to,
    ListingType,
    MetadataValue,
    MintingMode,
    NftImage,
    SupportedStandard,
    TokenMetadataEntry,
    TokenRecord,
    TokenSaleMetadata,
};

pub use feedback::{
    approve_feedback, delete_feedback, get_all_feedback, get_approved_feedback, get_feedback_stats,
    init_feedback_data, submit_feedback, Feedback,
};

pub use user_profiles::{
    get_user_profile, get_user_profile_by_principal, update_user_profile, UserProfile,
};

#[query]
pub fn whoami() -> Principal {
    ic_cdk::caller()
}

#[update]
pub fn create_meme(caption: String, image_cid: String) -> u64 {
    api_create::create_meme(caption, image_cid)
}

#[update]
pub fn vote(meme_id: u64, up: bool) -> Result<(), String> {
    api_vote::vote(meme_id, up)
}

#[query]
pub fn list_premarket_memes(offset: u32, limit: u32) -> Vec<MemeCard> {
    api_query::list_premarket_memes(offset, limit)
}

#[query]
pub fn get_current_leaderboard(offset: u32, limit: u32) -> Vec<TopEntry> {
    api_query::get_current_leaderboard(offset, limit)
}

#[query]
pub fn get_leaderboard_by_week(week_id: u64) -> Option<WeeklyLeaderboard> {
    api_query::get_leaderboard_by_week(week_id)
}

#[query]
pub fn list_finalized_weeks(offset: u32, limit: u32) -> Vec<u64> {
    api_query::list_finalized_weeks(offset, limit)
}

#[query]
pub fn list_memes_by_flag(week_ended: bool, offset: u32, limit: u32) -> Vec<MemeCard> {
    api_query::list_memes_by_flag(week_ended, offset, limit)
}

#[update]
pub fn admin_rollover_now() -> Option<u64> {
    rollover::admin_rollover_now()
}

#[update]
pub fn admin_set_week_offset(offset_secs: i64) {
    state::set_week_offset(offset_secs);
}

#[query]
pub fn get_active_week() -> u64 {
    state::get_active_week_id()
}

#[query]
pub fn get_week_offset() -> i64 {
    state::get_week_offset()
}

#[post_upgrade]
fn post_upgrade() {
    rollover::ensure_active_week_initialized();
    rollover::start_rollover_timer();
}

ic_cdk::export_candid!();
