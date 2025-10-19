use crate::index::week_meme_ids;
use crate::leaderboard::{
    clear_live_votes, snapshot_weekly_leaderboard, store_weekly_leaderboard, DEFAULT_TOP_N,
};
use crate::model::{MemeStatus, WeekId};
use crate::state::{get_active_week_id, set_active_week_id, MEMES};
use crate::time::{current_week_id, now_secs};
use ic_cdk::println;
use ic_cdk_timers::{clear_timer, set_timer_interval, TimerId};
use std::cell::RefCell;
use std::time::Duration;

thread_local! {
    static TIMER: RefCell<Option<TimerId>> = RefCell::new(None);
}

pub fn start_rollover_timer() {
    TIMER.with(|cell| {
        if let Some(id) = cell.borrow_mut().take() {
            clear_timer(id);
        }
        let id = set_timer_interval(Duration::from_secs(3600), || {
            maybe_perform_rollover(DEFAULT_TOP_N);
        });
        cell.borrow_mut().replace(id);
    });

    // Perform an immediate check so that deployments catch up to the
    // correct active week without waiting for the first timer tick.
    maybe_perform_rollover(DEFAULT_TOP_N);
}

pub fn maybe_perform_rollover(top_n: usize) -> Option<WeekId> {
    let current = current_week_id();
    let active = get_active_week_id();

    if active == 0 {
        set_active_week_id(current);
        return None;
    }

    if current <= active {
        return None;
    }

    let finalized_week = active;
    finalize_week(finalized_week, top_n);
    set_active_week_id(current);

    println!(
        "Finalized week {} -> new active week {}",
        finalized_week, current
    );
    Some(finalized_week)
}

fn finalize_week(week_id: WeekId, top_n: usize) {
    let finalized_at = now_secs();

    finalize_memes_for_week(week_id, finalized_at);

    if crate::leaderboard::get_weekly_leaderboard(week_id).is_none() {
        let board = snapshot_weekly_leaderboard(week_id, finalized_at, top_n);
        store_weekly_leaderboard(board);
    }

    clear_live_votes();
}

pub(crate) fn finalize_memes_for_week(week_id: WeekId, finalized_at: u64) {
    let meme_ids = week_meme_ids(week_id);
    MEMES.with(|memes| {
        let mut memes = memes.borrow_mut();
        for meme_id in meme_ids {
            if let Some(mut meme) = memes.get(&meme_id) {
                meme.status = MemeStatus::Finalized;
                meme.week_ended = true;
                meme.finalized_at = Some(finalized_at);
                memes.insert(meme_id, meme);
            }
        }
    });
}

pub fn admin_rollover_now() -> Option<WeekId> {
    maybe_perform_rollover(DEFAULT_TOP_N)
}

pub fn ensure_active_week_initialized() {
    if get_active_week_id() == 0 {
        set_active_week_id(current_week_id());
    }
}
