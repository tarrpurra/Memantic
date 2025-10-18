use crate::index::append_meme_to_week;
use crate::model::{Meme, MemeId, MemeStatus};
use crate::rollover;
use crate::state::{ensure_next_meme_id_at_least, get_active_week_id, set_active_week_id, MEMES};
use crate::time::{compute_week_id, current_week_id, now_secs};
use candid::Principal;
use ic_cdk::caller;

pub fn create_meme(caption: String, image_cid: String) -> MemeId {
    // Ensure rollover if the calendar week has advanced.
    rollover::maybe_perform_rollover(crate::leaderboard::DEFAULT_TOP_N);

    let creator = caller();
    let created_at = now_secs();
    let week_id = current_week_id();

    let meme_id = crate::http_outcall::reserve_meme_id();
    register_meme_with_id(meme_id, creator, caption, image_cid, created_at);

    meme_id
}

pub fn register_meme_with_id(
    meme_id: MemeId,
    creator: Principal,
    caption: String,
    image_cid: String,
    created_at_secs: u64,
) {
    let week_id = compute_week_id(created_at_secs);
    let meme = Meme {
        id: meme_id,
        creator,
        image_cid,
        caption,
        created_at: created_at_secs,
        week_id,
        status: MemeStatus::InVoting,
        week_ended: false,
        finalized_at: None,
    };

    MEMES.with(|memes| {
        memes.borrow_mut().insert(meme_id, meme);
    });

    append_meme_to_week(week_id, meme_id);

    ensure_next_meme_id_at_least(meme_id.saturating_add(1));

    let current_active = get_active_week_id();
    if current_active == 0 || week_id >= current_active {
        set_active_week_id(week_id);
    }
}
