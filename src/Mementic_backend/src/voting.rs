// src/voting.rs
use crate::get_meme;
use crate::PublicStoredMeme;
use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk::{api::time, caller};
use ic_cdk_macros::{query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::{Bound, Storable},
    DefaultMemoryImpl, StableBTreeMap,
};
use serde::{Deserialize, Serialize};
use std::{borrow::Cow, cell::RefCell};

// Import from http_outcall module

// ---------- Stable memory ----------
type Mem = VirtualMemory<DefaultMemoryImpl>;

// ---------- Wrapper types for Storable ----------

// Wrapper for composite key (Principal, u64)
#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct UserMemeKey(pub Principal, pub u64);

impl Storable for UserMemeKey {
    const BOUND: Bound = Bound::Bounded {
        max_size: 100, // your estimate is fine if comfortably above worst-case
        is_fixed_size: false,
    };

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode UserMemeKey"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode UserMemeKey")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, UserMemeKey).expect("decode UserMemeKey")
    }
}

thread_local! {
    static MEM_MGR: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    // key = meme_id, val = MemeVotes
    static VOTES: RefCell<StableBTreeMap<u64, MemeVotes, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(30)))));

    // key = UserMemeKey(user, meme_id), val = VoteRecord
    static USER_VOTES: RefCell<StableBTreeMap<UserMemeKey, VoteRecord, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(31)))));

    // key = week_id, val = WeeklyPeriod
    static WEEKLY_PERIODS: RefCell<StableBTreeMap<u64, WeeklyPeriod, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(32)))));
}

// ---------- Data structures ----------

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct MemeVotes {
    pub meme_id: u64,
    pub upvotes: u32,
    pub downvotes: u32,
    pub total_voters: u32,
    pub score: f64,          // ranking score (with time decay)
    pub created_week: u64,   // week in which the meme was created (from StoredMeme.created_at)
    pub last_vote_time: u64, // last vote timestamp (ns)
}

impl Storable for MemeVotes {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode MemeVotes"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode MemeVotes")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, MemeVotes).expect("decode MemeVotes")
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct VoteRecord {
    pub vote_type: VoteType,
    pub timestamp: u64,
}

impl Storable for VoteRecord {
    // Variable-size Candid encoding; fine for values (not recommended for keys).
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode VoteRecord"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode VoteRecord")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, VoteRecord).expect("decode VoteRecord")
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, CandidType, PartialEq, Eq)]
pub enum VoteType {
    Upvote,
    Downvote,
}

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct WeeklyPeriod {
    pub week_id: u64,
    pub start_time: u64,    // ns
    pub end_time: u64,      // ns
    pub is_completed: bool, // true once voting is locked for this week
    pub meme_count: u32,    // optional; not used for logic here
}

impl Storable for WeeklyPeriod {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode WeeklyPeriod"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode WeeklyPeriod")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, WeeklyPeriod).expect("decode WeeklyPeriod")
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct WeeklyLeaderboard {
    pub week_id: u64,
    pub period: WeeklyPeriod,
    pub top_memes: Vec<LeaderboardEntry>,
    pub is_active: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct LeaderboardEntry {
    pub meme_id: u64,
    pub meme_data: Option<PublicStoredMeme>,
    pub votes: MemeVotes,
    pub rank: u32,
}

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct TopLikedLeaderboard {
    pub total_ranked: u32,
    pub top_memes: Vec<LeaderboardEntry>,
}

/// Minimal data your NFT canister will need
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct TopEntry {
    pub meme_id: u64,
    pub score: f64,
    pub upvotes: u32,
    pub downvotes: u32,
    pub last_vote_time: u64,
}

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct VoteResponse {
    pub success: bool,
    pub message: String,
    pub new_vote_count: u32,
    pub user_previous_vote: Option<VoteType>,
}

// ---------- Helpers ----------

const WEEK_S: u64 = 864_000; // 10 * 24 * 60 * 60 (10 days in seconds)

/// Week index (0-based) from timestamp ns
fn get_week_id(timestamp_ns: u64) -> u64 {
    const SEC: u64 = 1_000_000_000;
    (timestamp_ns / SEC) / WEEK_S
}

/// Create or fetch current week period
fn get_or_create_current_week() -> WeeklyPeriod {
    let now = time();
    let week_id = get_week_id(now);

    WEEKLY_PERIODS.with(|wp| {
        let mut periods = wp.borrow_mut();
        if let Some(period) = periods.get(&week_id) {
            period
        } else {
            let week_start = week_id * WEEK_S * 1_000_000_000;
            let week_end = week_start + (WEEK_S * 1_000_000_000);
            let new_period = WeeklyPeriod {
                week_id,
                start_time: week_start,
                end_time: week_end,
                is_completed: false,
                meme_count: 0,
            };
            periods.insert(week_id, new_period.clone());
            new_period
        }
    })
}

/// Reddit-like score with time decay (higher is better)
fn calculate_score(upvotes: u32, downvotes: u32, age_hours: f64) -> f64 {
    let total = upvotes + downvotes;
    if total == 0 {
        return 0.0;
    }
    let net = upvotes as f64 - downvotes as f64;
    let ratio = upvotes as f64 / total as f64;
    let base = net * ratio;
    let time_factor = 1.0 / (1.0 + age_hours / 24.0); // decay ~ per day
    base * time_factor
}

/// Deterministic ordering: score ↓, last_vote_time ↓, meme_id ↑
fn sort_entries(items: &mut Vec<(u64, MemeVotes)>) {
    use std::cmp::Ordering;
    items.sort_by(|a, b| {
        b.1.score
            .partial_cmp(&a.1.score)
            .unwrap_or(Ordering::Equal)
            .then_with(|| b.1.last_vote_time.cmp(&a.1.last_vote_time))
            .then_with(|| a.0.cmp(&b.0))
    });
}

/// Top-N for a week (sorted, limited)
fn get_top_memes_for_week_stable(week_id: u64, limit: usize) -> Vec<(u64, MemeVotes)> {
    VOTES.with(|v| {
        let votes = v.borrow();

        let mut items: Vec<(u64, MemeVotes)> = votes
            .iter()
            .filter_map(|entry| {
                let mv = entry.value(); // owned in ic-stable-structures 0.7
                if mv.created_week == week_id {
                    Some((*entry.key(), mv)) // <- deref the key
                } else {
                    None
                }
            })
            .collect();

        sort_entries(&mut items);

        if items.len() > limit {
            items.truncate(limit);
        }
        items
    })
}

/// Mark any past weeks complete if their end_time has passed
#[update]
fn close_finished_weeks() {
    let now = ic_cdk::api::time();
    WEEKLY_PERIODS.with(|wp| {
        let mut periods = wp.borrow_mut();

        // gather only unfinished & expired
        let to_close: Vec<u64> = periods
            .iter()
            .filter_map(|e| {
                let p = e.value(); // owned in ic-stable-structures 0.7; if &T in your build, clone()
                if !p.is_completed && now > p.end_time {
                    Some(*e.key())
                } else {
                    None
                }
            })
            .collect();

        for week_id in to_close {
            if let Some(mut p) = periods.get(&week_id) {
                p.is_completed = true;
                periods.insert(week_id, p); // write back

                // Automatically mint NFTs for top 3 memes of completed week
                mint_top3_for_completed_week(week_id);
            }
        }
    });
}

/// Automatically mint NFTs for the top 3 memes of a completed week
fn mint_top3_for_completed_week(week_id: u64) {
    ic_cdk::println!("Attempting to mint NFTs for completed week: {}", week_id);

    // Spawn an async task to mint the NFTs
    ic_cdk::spawn(async move {
        match crate::nft_module::mint_week_top3_from_voting(week_id).await {
            Ok(minted_pairs) => {
                ic_cdk::println!(
                    "Successfully minted {} NFTs for week {}",
                    minted_pairs.len(),
                    week_id
                );
                for pair in minted_pairs {
                    let minted_list = if pair.token_ids.is_empty() {
                        "(no tokens)".to_string()
                    } else {
                        pair.token_ids
                            .iter()
                            .map(|id| id.to_string())
                            .collect::<Vec<_>>()
                            .join(", ")
                    };
                    ic_cdk::println!(
                        "Minted NFT(s) [{}] for meme {} owned by {}",
                        minted_list,
                        pair.meme_id,
                        pair.owner
                    );
                }
            }
            Err(e) => {
                ic_cdk::println!("Failed to mint NFTs for week {}: {}", week_id, e);
            }
        }
    });
}

// ---------- Main voting ----------

/// Cast or change a vote on a meme in the **current active week**.
/// Rejects if meme is not from current week or if the week is completed/expired.
#[update]
pub fn vote_meme(meme_id: u64, vote_type: VoteType) -> Result<VoteResponse, String> {
    let user = caller();
    ic_cdk::println!("Vote meme - Caller principal: {}", user.to_text());

    if user == Principal::anonymous() {
        ic_cdk::println!("Vote meme - Anonymous user detected, rejecting request");
        return Err("Authentication required".into());
    }

    ic_cdk::println!("Vote meme - Authenticated user: {}", user.to_text());
    let now = time();

    // Input validation
    if meme_id == 0 {
        return Err("Invalid meme ID".into());
    }

    // Ensure week periods are up to date (auto-lock past weeks)
    // close_finished_weeks();

    // Validate meme exists
    let meme = get_meme(meme_id).ok_or("Meme not found")?;

    // Prevent self-voting: check if caller is the meme owner
    if meme.owner == user {
        return Err("Cannot vote on your own meme".into());
    }

    // Determine meme's week and current week
    let meme_week = get_week_id(meme.created_at);
    let period = get_or_create_current_week();
    let current_week = period.week_id;

    // Only allow votes for memes created this week
    if meme_week != current_week {
        return Err("Can only vote on memes from the current week".into());
    }
    // Block voting if the week is completed or time passed
    if period.is_completed || now > period.end_time {
        return Err("Voting period for the current week has ended".into());
    }

    // Track previous vote
    let key = UserMemeKey(user, meme_id);
    let previous_vote = USER_VOTES.with(|uv| uv.borrow().get(&key));

    // Prevent multiple votes per user per meme
    if previous_vote.is_some() {
        return Err("You have already voted on this meme".into());
    }

    // Update user's vote record
    USER_VOTES.with(|uv| {
        uv.borrow_mut().insert(
            key,
            VoteRecord {
                vote_type: vote_type.clone(),
                timestamp: now,
            },
        );
    });

    // Update aggregates
    VOTES.with(|v| {
        let mut map = v.borrow_mut();
        let mut mv = map.get(&meme_id).unwrap_or(MemeVotes {
            meme_id,
            upvotes: 0,
            downvotes: 0,
            total_voters: 0,
            score: 0.0,
            created_week: meme_week,
            last_vote_time: now,
        });

        // undo previous vote (if switching)
        if let Some(prev) = &previous_vote {
            match prev.vote_type {
                VoteType::Upvote => mv.upvotes = mv.upvotes.saturating_sub(1),
                VoteType::Downvote => mv.downvotes = mv.downvotes.saturating_sub(1),
            }
        } else {
            mv.total_voters = mv.total_voters.saturating_add(1);
        }

        // apply new
        match vote_type {
            VoteType::Upvote => mv.upvotes = mv.upvotes.saturating_add(1),
            VoteType::Downvote => mv.downvotes = mv.downvotes.saturating_add(1),
        }

        // recompute score
        let age_hours = (now - meme.created_at) as f64 / 1_000_000_000.0 / 3600.0;
        mv.score = calculate_score(mv.upvotes, mv.downvotes, age_hours);
        mv.last_vote_time = now;

        map.insert(meme_id, mv.clone());

        Ok(VoteResponse {
            success: true,
            message: "Vote recorded".into(),
            new_vote_count: mv.upvotes + mv.downvotes,
            user_previous_vote: previous_vote.map(|v| v.vote_type),
        })
    })
}

/// Remove your vote (works only for current active week)
#[update]
pub fn remove_vote(meme_id: u64) -> Result<VoteResponse, String> {
    let user = caller();
    ic_cdk::println!("Remove vote - Caller principal: {}", user.to_text());

    if user == Principal::anonymous() {
        ic_cdk::println!("Remove vote - Anonymous user detected, rejecting request");
        return Err("Authentication required".into());
    }

    ic_cdk::println!("Remove vote - Authenticated user: {}", user.to_text());
    let now = time();

    // Input validation
    if meme_id == 0 {
        return Err("Invalid meme ID".into());
    }

    close_finished_weeks();

    // Need meme, and must belong to current week and be active
    let meme = get_meme(meme_id).ok_or("Meme not found")?;

    // Prevent self-voting removal: check if caller is the meme owner
    if meme.owner == user {
        return Err("Cannot remove votes from your own meme".into());
    }

    let meme_week = get_week_id(meme.created_at);
    let period = get_or_create_current_week();
    if meme_week != period.week_id {
        return Err("Can only remove votes from the current week".into());
    }
    if period.is_completed || now > period.end_time {
        return Err("Voting period for the current week has ended".into());
    }

    let key = UserMemeKey(user, meme_id);
    let previous_vote = USER_VOTES.with(|uv| uv.borrow().get(&key));
    if previous_vote.is_none() {
        return Err("No vote found to remove".into());
    }
    let prev = previous_vote.unwrap();

    USER_VOTES.with(|uv| {
        uv.borrow_mut().remove(&key);
    });

    VOTES.with(|v| {
        let mut map = v.borrow_mut();
        if let Some(mut mv) = map.get(&meme_id) {
            match prev.vote_type {
                VoteType::Upvote => mv.upvotes = mv.upvotes.saturating_sub(1),
                VoteType::Downvote => mv.downvotes = mv.downvotes.saturating_sub(1),
            }
            mv.total_voters = mv.total_voters.saturating_sub(1);

            let age_hours = (now - meme.created_at) as f64 / 1_000_000_000.0 / 3600.0;
            mv.score = calculate_score(mv.upvotes, mv.downvotes, age_hours);
            mv.last_vote_time = now;

            map.insert(meme_id, mv.clone());

            Ok(VoteResponse {
                success: true,
                message: "Vote removed".into(),
                new_vote_count: mv.upvotes + mv.downvotes,
                user_previous_vote: Some(prev.vote_type),
            })
        } else {
            Err("Meme votes not found".into())
        }
    })
}

// ---------- Queries ----------

/// Current weekly leaderboard (active week). Limit max 50.
#[query]
pub fn get_current_leaderboard(limit: Option<u32>) -> WeeklyLeaderboard {
    let now = time();
    let period = get_or_create_current_week();
    let week_id = period.week_id;
    let lim = limit.unwrap_or(10).min(50) as usize;

    let top = get_top_memes_for_week_stable(week_id, lim);
    let entries = top
        .into_iter()
        .enumerate()
        .map(|(i, (meme_id, mv))| LeaderboardEntry {
            meme_id,
            meme_data: get_meme(meme_id),
            votes: mv,
            rank: (i + 1) as u32,
        })
        .collect();

    WeeklyLeaderboard {
        week_id,
        period: period.clone(),
        top_memes: entries,
        is_active: !period.is_completed && now <= period.end_time,
    }
}

/// Global leaderboard based on most upvotes across all weeks.
#[query]
pub fn get_top_liked_memes(limit: Option<u32>) -> TopLikedLeaderboard {
    let lim = limit.unwrap_or(3).max(1).min(50) as usize;

    let mut items: Vec<(u64, MemeVotes)> = VOTES.with(|v| {
        v.borrow()
            .iter()
            .map(|entry| (*entry.key(), entry.value().clone()))
            .collect()
    });

    use std::cmp::Ordering;

    items.sort_by(|a, b| {
        b.1.upvotes
            .cmp(&a.1.upvotes)
            .then_with(|| a.1.downvotes.cmp(&b.1.downvotes))
            .then_with(|| b.1.last_vote_time.cmp(&a.1.last_vote_time))
            .then_with(|| a.0.cmp(&b.0))
    });

    if items.len() > lim {
        items.truncate(lim);
    }

    let top_memes = items
        .into_iter()
        .enumerate()
        .map(|(index, (meme_id, mv))| LeaderboardEntry {
            meme_id,
            meme_data: get_meme(meme_id),
            votes: mv,
            rank: (index + 1) as u32,
        })
        .collect();

    let total_ranked = VOTES.with(|v| v.borrow().len() as u32);

    TopLikedLeaderboard {
        total_ranked,
        top_memes,
    }
}

/// Leaderboard for any week id. Returns None if week not found.
#[query]
pub fn get_week_leaderboard(week_id: u64, limit: Option<u32>) -> Option<WeeklyLeaderboard> {
    WEEKLY_PERIODS.with(|wp| {
        let periods = wp.borrow();
        let p = periods.get(&week_id)?;
        let lim = limit.unwrap_or(10).min(50) as usize;

        let top = get_top_memes_for_week_stable(week_id, lim);
        let entries = top
            .into_iter()
            .enumerate()
            .map(|(i, (meme_id, mv))| LeaderboardEntry {
                meme_id,
                meme_data: get_meme(meme_id),
                votes: mv,
                rank: (i + 1) as u32,
            })
            .collect();

        Some(WeeklyLeaderboard {
            week_id,
            period: p,
            top_memes: entries,
            is_active: false,
        })
    })
}

/// Return **Top 3** for a given week (for NFT mint step).
/// Fails if the week is not completed yet.
#[query]
pub fn get_top3_for_week(week_id: u64) -> Result<Vec<TopEntry>, String> {
    // Ensure no active voting and week exists
    let p = WEEKLY_PERIODS.with(|wp| wp.borrow().get(&week_id));
    let period = p.ok_or_else(|| "Week not found".to_string())?;
    if !period.is_completed {
        return Err("Week not completed yet".into());
    }

    // Compute Top-3 strictly by highest upvotes (descending).
    // Tie-breakers: last_vote_time (desc), meme_id (asc).
    let mut items: Vec<(u64, MemeVotes)> = VOTES.with(|v| {
        let votes = v.borrow();
        votes
            .iter()
            .filter_map(|e| {
                let mv = e.value();
                if mv.created_week == week_id {
                    Some((*e.key(), mv))
                } else {
                    None
                }
            })
            .collect()
    });

    use std::cmp::Ordering;
    items.sort_by(|a, b| {
        // upvotes desc
        b.1.upvotes
            .cmp(&a.1.upvotes)
            // then most recent activity
            .then_with(|| b.1.last_vote_time.cmp(&a.1.last_vote_time))
            // then smaller id first for determinism
            .then_with(|| a.0.cmp(&b.0))
    });

    if items.len() > 3 {
        items.truncate(3);
    }

    let out = items
        .into_iter()
        .map(|(meme_id, mv)| TopEntry {
            meme_id,
            score: mv.score, // kept for reference/telemetry, not used for ranking here
            upvotes: mv.upvotes,
            downvotes: mv.downvotes,
            last_vote_time: mv.last_vote_time,
        })
        .collect();

    Ok(out)
}

/// Get per-meme votes
#[query]
pub fn get_meme_votes(meme_id: u64) -> Option<MemeVotes> {
    VOTES.with(|v| v.borrow().get(&meme_id))
}

/// Did caller vote on meme?
#[query]
pub fn get_user_vote(meme_id: u64) -> Option<VoteRecord> {
    let user = caller();
    let key = UserMemeKey(user, meme_id);
    USER_VOTES.with(|uv| uv.borrow().get(&key))
}

/// Completed weeks
#[query]
pub fn get_completed_weeks() -> Vec<WeeklyPeriod> {
    WEEKLY_PERIODS.with(|wp| {
        let periods = wp.borrow();
        periods
            .iter()
            .filter_map(|e| {
                let p = e.value(); // owned value in ic-stable-structures 0.7
                if p.is_completed {
                    Some(p)
                } else {
                    None
                }
            })
            .collect::<Vec<WeeklyPeriod>>()
    })
}

/// Status for current week
#[query]
pub fn get_current_week_status() -> (u64, u64, u64, bool) {
    let now = time();
    let period = get_or_create_current_week();
    let remaining = if now < period.end_time {
        period.end_time - now
    } else {
        0
    };
    (
        period.week_id,
        remaining,
        period.end_time,
        period.is_completed,
    )
}

// ---------- Admin / Ops ----------

/// Manually finalize any weeks that have ended.
/// Useful to ensure `is_completed = true` even if no votes happen at boundary.
#[update]
pub fn finalize_finished_weeks() -> String {
    close_finished_weeks();
    "Finished weeks finalized".into()
}

/// Force-complete a specific week_id (admin/ops hook).
#[update]
pub fn finalize_week(week_id: u64) -> Result<(), String> {
    WEEKLY_PERIODS.with(|wp| {
        let mut periods = wp.borrow_mut();
        if let Some(mut p) = periods.get(&week_id) {
            p.is_completed = true;
            periods.insert(week_id, p);
            Ok(())
        } else {
            Err("Week not found".into())
        }
    })
}

/// Delete a meme and all associated data (votes, user votes)
pub fn delete_meme_data(meme_id: u64) -> Result<(), String> {
    // Remove all votes for this meme
    VOTES.with(|v| {
        v.borrow_mut().remove(&meme_id);
    });

    // Remove all user votes for this meme
    USER_VOTES.with(|uv| {
        let mut map = uv.borrow_mut();
        let keys_to_remove: Vec<UserMemeKey> = map
            .iter()
            .filter_map(|entry| {
                let key = entry.key();
                if key.1 == meme_id {
                    Some(key.clone())
                } else {
                    None
                }
            })
            .collect();

        for key in keys_to_remove {
            map.remove(&key);
        }
    });

    Ok(())
}

/// Quick stats
pub fn get_voting_stats() -> (u32, u32) {
    let total_votes: u32 = VOTES.with(|v| {
        let votes = v.borrow();
        votes
            .iter()
            .map(|e| {
                let mv = e.value(); // in 0.7 this is typically owned; if it's &MemeVotes in your build, see note below
                mv.upvotes + mv.downvotes
            })
            .sum()
    });

    let total_memes_with_votes = VOTES.with(|v| v.borrow().len() as u32);
    (total_votes, total_memes_with_votes)
}
