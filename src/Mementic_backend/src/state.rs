use crate::model::{Meme, MemeId, WeekId, WeeklyLeaderboard};
use candid::Principal;
use ic_stable_structures::cell::StableCell;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::storable::{Bound, Storable};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

pub type Memory = VirtualMemory<DefaultMemoryImpl>;

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct StoredU64(pub u64);

impl From<StoredU64> for u64 {
    fn from(value: StoredU64) -> Self {
        value.0
    }
}

impl From<u64> for StoredU64 {
    fn from(value: u64) -> Self {
        StoredU64(value)
    }
}

impl Storable for StoredU64 {
    const BOUND: Bound = Bound::Bounded {
        max_size: 8,
        is_fixed_size: true,
    };

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.to_le_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        if bytes.len() != 8 {
            return StoredU64(0);
        }
        let mut arr = [0u8; 8];
        arr.copy_from_slice(&bytes);
        StoredU64(u64::from_le_bytes(arr))
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct StoredI64(pub i64);

impl From<StoredI64> for i64 {
    fn from(value: StoredI64) -> Self {
        value.0
    }
}

impl From<i64> for StoredI64 {
    fn from(value: i64) -> Self {
        StoredI64(value)
    }
}

impl Storable for StoredI64 {
    const BOUND: Bound = Bound::Bounded {
        max_size: 8,
        is_fixed_size: true,
    };

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(self.0.to_le_bytes().to_vec())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.to_le_bytes().to_vec()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        if bytes.len() != 8 {
            return StoredI64(0);
        }
        let mut arr = [0u8; 8];
        arr.copy_from_slice(&bytes);
        StoredI64(i64::from_le_bytes(arr))
    }
}

#[derive(Clone, Debug, Default, Serialize, Deserialize)]
pub struct MemeIdList(pub Vec<MemeId>);

impl Storable for MemeIdList {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(&self.0).unwrap_or_default())
    }

    fn into_bytes(self) -> Vec<u8> {
        serde_json::to_vec(&self.0).unwrap_or_default()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let vec = serde_json::from_slice(bytes.as_ref()).unwrap_or_default();
        MemeIdList(vec)
    }
}

impl Storable for Meme {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap_or_default())
    }

    fn into_bytes(self) -> Vec<u8> {
        serde_json::to_vec(&self).unwrap_or_default()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(bytes.as_ref()).unwrap_or_else(|_| Meme {
            id: 0,
            creator: Principal::anonymous(),
            image_cid: String::new(),
            caption: String::new(),
            created_at: 0,
            week_id: 0,
            status: crate::model::MemeStatus::InVoting,
            week_ended: false,
            finalized_at: None,
        })
    }
}

impl Storable for WeeklyLeaderboard {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap_or_default())
    }

    fn into_bytes(self) -> Vec<u8> {
        serde_json::to_vec(&self).unwrap_or_default()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(bytes.as_ref()).unwrap_or_else(|_| WeeklyLeaderboard {
            week_id: 0,
            finalized_at: 0,
            top: Vec::new(),
        })
    }
}

thread_local! {
    pub static MEMORY_MANAGER: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    pub static MEMES: RefCell<StableBTreeMap<MemeId, Meme, Memory>> = RefCell::new(StableBTreeMap::init(
        MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(60)))
    ));

    pub static MEMES_BY_WEEK: RefCell<StableBTreeMap<WeekId, MemeIdList, Memory>> = RefCell::new(StableBTreeMap::init(
        MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(61)))
    ));

    pub static LIVE_VOTES: RefCell<StableBTreeMap<MemeId, u64, Memory>> = RefCell::new(StableBTreeMap::init(
        MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(62)))
    ));

    pub static FINALIZED_LEADERBOARDS: RefCell<StableBTreeMap<WeekId, WeeklyLeaderboard, Memory>> = RefCell::new(StableBTreeMap::init(
        MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(63)))
    ));

    static ACTIVE_WEEK_ID_CELL: RefCell<StableCell<StoredU64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(64))),
            StoredU64(0)
        ).expect("initialize ACTIVE_WEEK_ID cell")
    );

    static NEXT_MEME_ID_CELL: RefCell<StableCell<StoredU64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(65))),
            StoredU64(1)
        ).expect("initialize NEXT_MEME_ID cell")
    );

    static WEEK_OFFSET_CELL: RefCell<StableCell<StoredI64, Memory>> = RefCell::new(
        StableCell::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(66))),
            StoredI64(0)
        ).expect("initialize WEEK_OFFSET cell")
    );
}

pub fn get_active_week_id() -> WeekId {
    ACTIVE_WEEK_ID_CELL.with(|cell| cell.borrow().get().0)
}

pub fn set_active_week_id(week_id: WeekId) {
    ACTIVE_WEEK_ID_CELL.with(|cell| {
        let mut cell = cell.borrow_mut();
        let current = cell.get().0;
        if current != week_id {
            cell.set(StoredU64(week_id)).expect("set active week id");
        }
    });
}

pub fn get_week_offset() -> i64 {
    WEEK_OFFSET_CELL.with(|cell| cell.borrow().get().0)
}

pub fn set_week_offset(offset: i64) {
    WEEK_OFFSET_CELL.with(|cell| {
        cell.borrow_mut()
            .set(StoredI64(offset))
            .expect("set week offset");
    });
}

pub fn next_meme_id() -> MemeId {
    NEXT_MEME_ID_CELL.with(|cell| {
        let mut cell = cell.borrow_mut();
        let current = cell.get().0;
        let next = current + 1;
        cell.set(StoredU64(next)).expect("increment meme id");
        current
    })
}

pub fn set_next_meme_id(value: MemeId) {
    NEXT_MEME_ID_CELL.with(|cell| {
        cell.borrow_mut()
            .set(StoredU64(value))
            .expect("set next meme id");
    });
}

pub fn peek_next_meme_id() -> MemeId {
    NEXT_MEME_ID_CELL.with(|cell| cell.borrow().get().0)
}

pub fn ensure_next_meme_id_at_least(value: MemeId) {
    NEXT_MEME_ID_CELL.with(|cell| {
        let mut cell = cell.borrow_mut();
        let current = cell.get().0;
        if current < value {
            cell.set(StoredU64(value)).expect("ensure next meme id");
        }
    });
}

pub fn with_active_week_id<F, R>(f: F) -> R
where
    F: FnOnce(WeekId) -> R,
{
    let week = get_active_week_id();
    f(week)
}

pub fn with_week_offset<F, R>(f: F) -> R
where
    F: FnOnce(i64) -> R,
{
    let offset = get_week_offset();
    f(offset)
}
