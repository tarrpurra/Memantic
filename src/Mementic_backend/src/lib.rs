mod feedback;
mod http_outcall;
mod nft_module;
mod user_profiles;
mod voting;

use crate::nft_module::InitArgs;
use candid::{Nat, Principal};
use ic_cdk::api::management_canister::http_request::HttpResponse;
use ic_cdk::api::management_canister::http_request::TransformArgs;
use ic_cdk_macros::{query, update};

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
    publish_meme,
    MemeData,
    PublicStoredMeme,
    PythonMetadata,
    StoredMeme,
};

pub use voting::{
    finalize_finished_weeks, finalize_week, get_completed_weeks, get_current_leaderboard,
    get_current_week_status, get_meme_votes, get_top3_for_week, get_user_vote, get_voting_stats,
    get_week_leaderboard, remove_vote, vote_meme, LeaderboardEntry, MemeVotes, TopEntry,
    VoteRecord, VoteResponse, VoteType, WeeklyLeaderboard, WeeklyPeriod,
};

pub use nft_module::{
    buy, cancel_listing, get_nft_image, get_sale_metadata, get_sale_metadata_for_meme, get_token,
    get_token_by_meme_id, get_user_listings, icrc7_name, icrc7_owner_of, icrc7_supported_standards,
    icrc7_symbol, icrc7_tokens_of, icrc7_total_supply, list_for_sale, mint_collection_nft,
    mint_single_nft, mint_week_top3_from_voting, my_minted_nfts, show_all_nfts_for_sale,
    update_listing, Listing, ListingId, MarketplaceListing, MemeId, MetadataValue, MintedPair,
    NftImage, NftMarketInfo, NftMetadata, NftSummary, SupportedStandard, TokenMetadataEntry,
    TokenRecord, TokenSaleMetadata,
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
pub async fn mint_week_top3_here(week_id: u64) -> Result<Vec<MintedPair>, String> {
    nft_module::mint_week_top3_from_voting(week_id).await
}

ic_cdk::export_candid!();
