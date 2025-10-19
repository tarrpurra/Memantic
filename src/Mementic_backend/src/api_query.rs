use crate::index;
use crate::leaderboard;
use crate::model::{MemeCard, MemeStatus, TopEntry, WeekId, WeeklyLeaderboard};
use crate::state::{get_active_week_id, MEMES};

fn meme_to_card(meme: &crate::model::Meme) -> MemeCard {
    MemeCard {
        id: meme.id,
        caption: meme.caption.clone(),
        image_cid: meme.image_cid.clone(),
        creator: meme.creator,
    }
}

pub fn list_premarket_memes(offset: u32, limit: u32) -> Vec<MemeCard> {
    let week_id = get_active_week_id();
    let ids = index::week_meme_ids(week_id);
    let cards: Vec<MemeCard> = ids
        .into_iter()
        .filter_map(|id| {
            MEMES
                .with(|memes| memes.borrow().get(&id))
                .and_then(|meme| {
                    // Only show memes that are:
                    // 1. In voting status
                    // 2. Not finalized (week hasn't ended)
                    // 3. From the current active week
                    if meme.status == MemeStatus::InVoting
                        && !meme.finalized
                        && !meme.week_ended
                        && meme.week_id == week_id
                    {
                        Some(meme_to_card(&meme))
                    } else {
                        None
                    }
                })
        })
        .collect();

    let start = offset as usize;
    let end = (start + limit as usize).min(cards.len());
    if start >= cards.len() {
        return Vec::new();
    }
    cards[start..end].to_vec()
}

pub fn get_current_leaderboard(offset: u32, limit: u32) -> Vec<TopEntry> {
    leaderboard::current_leaderboard(offset, limit)
}

pub fn get_leaderboard_by_week(week_id: WeekId) -> Option<WeeklyLeaderboard> {
    leaderboard::get_weekly_leaderboard(week_id)
}

pub fn list_finalized_weeks(offset: u32, limit: u32) -> Vec<WeekId> {
    leaderboard::list_finalized_weeks(offset, limit)
}

pub fn list_memes_by_flag(week_ended: bool, offset: u32, limit: u32) -> Vec<MemeCard> {
    let items: Vec<MemeCard> = MEMES.with(|memes| {
        memes
            .borrow()
            .iter()
            .filter_map(|entry| {
                let meme = entry.value();
                if meme.week_ended == week_ended {
                    Some(meme_to_card(&meme))
                } else {
                    None
                }
            })
            .collect()
    });

    let start = offset as usize;
    let end = (start + limit as usize).min(items.len());
    if start >= items.len() {
        return Vec::new();
    }
    items[start..end].to_vec()
}
