use crate::model::{MemeId, WeekId};
use crate::state::{MemeIdList, MEMES_BY_WEEK};

pub fn append_meme_to_week(week_id: WeekId, meme_id: MemeId) {
    MEMES_BY_WEEK.with(|map| {
        let mut map = map.borrow_mut();
        let mut list = map.get(&week_id).map(|l| l.0).unwrap_or_default();
        if !list.contains(&meme_id) {
            list.push(meme_id);
            map.insert(week_id, MemeIdList(list));
        }
    });
}

pub fn week_meme_ids(week_id: WeekId) -> Vec<MemeId> {
    MEMES_BY_WEEK.with(|map| map.borrow().get(&week_id).map(|l| l.0).unwrap_or_default())
}
