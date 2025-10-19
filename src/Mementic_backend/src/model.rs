use candid::{CandidType, Principal};
use serde::{Deserialize, Serialize};

pub type MemeId = u64;
pub type WeekId = u64;
pub type Timestamp = u64;

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq)]
pub enum MemeStatus {
    InVoting,
    Finalized,
}

impl Default for MemeStatus {
    fn default() -> Self {
        MemeStatus::InVoting
    }
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Meme {
    pub id: MemeId,
    pub creator: Principal,
    pub image_cid: String,
    pub caption: String,
    pub created_at: Timestamp,
    pub week_id: WeekId,
    #[serde(default)]
    pub status: MemeStatus,
    #[serde(default)]
    pub week_ended: bool,
    #[serde(default)]
    pub finalized_at: Option<Timestamp>,
    #[serde(default)]
    pub finalized: bool,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct TopEntry {
    pub meme_id: MemeId,
    pub votes: u64,
    pub rank: u32,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct WeeklyLeaderboard {
    pub week_id: WeekId,
    pub finalized_at: Timestamp,
    pub top: Vec<TopEntry>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MemeCard {
    pub id: MemeId,
    pub caption: String,
    pub image_cid: String,
    pub creator: Principal,
}
