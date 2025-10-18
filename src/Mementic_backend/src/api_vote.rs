use crate::leaderboard::apply_vote;
use crate::model::{MemeId, MemeStatus};
use crate::rollover;
use crate::state::{get_active_week_id, MEMES};
use candid::Principal;
use ic_cdk::caller;

pub fn vote(meme_id: MemeId, up: bool) -> Result<(), String> {
    rollover::maybe_perform_rollover(crate::leaderboard::DEFAULT_TOP_N);

    let caller = caller();
    if caller == Principal::anonymous() {
        return Err("Anonymous votes are not allowed".into());
    }

    let meme = MEMES
        .with(|memes| memes.borrow().get(&meme_id))
        .ok_or("Meme not found")?;

    if meme.week_id != get_active_week_id() {
        return Err("Voting is only allowed on the active week".into());
    }

    if meme.status != MemeStatus::InVoting || meme.week_ended {
        return Err("Voting is closed for this meme".into());
    }

    apply_vote(meme_id, up);
    Ok(())
}
