use candid::{CandidType, Decode, Encode, Nat, Principal};
use ic_cdk::api::time;
use ic_cdk_macros::query;
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::Bound,
    DefaultMemoryImpl, StableBTreeMap, Storable,
};
use serde::{Deserialize, Serialize};
use std::{borrow::Cow, cell::RefCell};

use crate::{get_meme, TopEntry};

// ---------- Stable memory aliases ----------
type Mem = VirtualMemory<DefaultMemoryImpl>;

// ---------- Constants ----------
const ENTITLEMENT_WINDOW_NS: u64 = 14 * 24 * 60 * 60 * 1_000_000_000; // 14 days

// ---------- Key wrappers ----------
#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
struct WeekMemeKey(pub u64, pub u64);

impl Storable for WeekMemeKey {
    const BOUND: Bound = Bound::Bounded {
        max_size: 16,
        is_fixed_size: true,
    };

    fn to_bytes(&self) -> Cow<[u8]> {
        let mut bytes = Vec::with_capacity(16);
        bytes.extend_from_slice(&self.0.to_le_bytes());
        bytes.extend_from_slice(&self.1.to_le_bytes());
        Cow::Owned(bytes)
    }

    fn into_bytes(self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(16);
        bytes.extend_from_slice(&self.0.to_le_bytes());
        bytes.extend_from_slice(&self.1.to_le_bytes());
        bytes
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let b = bytes.as_ref();
        let mut week = [0u8; 8];
        let mut meme = [0u8; 8];
        week.copy_from_slice(&b[0..8]);
        meme.copy_from_slice(&b[8..16]);
        WeekMemeKey(u64::from_le_bytes(week), u64::from_le_bytes(meme))
    }
}

// ---------- Entitlement types ----------
#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq)]
pub enum EntitlementStatus {
    Active,
    Used,
    Expired,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MintEntitlement {
    pub entitlement_id: u64,
    pub meme_id: u64,
    pub owner: Principal,
    pub week_id: u64,
    pub rank: u8,
    pub meme_title: String,
    pub created_at: u64,
    pub expires_at: u64,
    pub status: EntitlementStatus,
    pub used_at: Option<u64>,
    pub minted_token_ids: Vec<Nat>,
}

impl Storable for MintEntitlement {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode MintEntitlement"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode MintEntitlement")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, MintEntitlement).expect("decode MintEntitlement")
    }
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct WinnerNotice {
    pub entitlement_id: u64,
    pub meme_id: u64,
    pub meme_title: String,
    pub rank: u8,
    pub week_id: u64,
    pub issued_at: u64,
    pub expires_at: u64,
    pub used_at: Option<u64>,
    pub status: EntitlementStatus,
    pub message: String,
}

// ---------- Stable storage ----------
thread_local! {
    static MEM_MGR: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static ENTITLEMENTS: RefCell<StableBTreeMap<u64, MintEntitlement, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(60)))));

    static ENTITLEMENT_COUNTER: RefCell<StableBTreeMap<u64, u64, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(61)))));

    static WEEK_MEME_INDEX: RefCell<StableBTreeMap<WeekMemeKey, u64, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(62)))));
}

// ---------- Helpers ----------
fn next_entitlement_id() -> u64 {
    ENTITLEMENT_COUNTER.with(|counter| {
        let mut map = counter.borrow_mut();
        let current = map.get(&0).unwrap_or(0);
        let next = current.saturating_add(1);
        map.insert(0, next);
        next
    })
}

fn refresh_status(entitlement: &mut MintEntitlement, now: u64) {
    if matches!(entitlement.status, EntitlementStatus::Active) && now > entitlement.expires_at {
        entitlement.status = EntitlementStatus::Expired;
    }
}

fn find_entitlement_record(owner: Principal, meme_id: u64) -> Option<(u64, MintEntitlement)> {
    ENTITLEMENTS.with(|ents| {
        let map = ents.borrow();
        map.iter()
            .filter_map(|entry| {
                let ent = entry.value();
                if ent.owner == owner && ent.meme_id == meme_id {
                    Some((*entry.key(), ent))
                } else {
                    None
                }
            })
            .max_by_key(|(_, ent)| ent.created_at)
    })
}

fn store_entitlement(entitlement_id: u64, entitlement: MintEntitlement) {
    ENTITLEMENTS.with(|ents| {
        ents.borrow_mut().insert(entitlement_id, entitlement);
    });
}

// ---------- Public (internal crate) helpers ----------
pub(crate) fn create_entitlements_for_week(
    week_id: u64,
    winners: &[TopEntry],
) -> Result<Vec<MintEntitlement>, String> {
    if winners.is_empty() {
        return Ok(Vec::new());
    }

    let now = time();
    let mut created = Vec::with_capacity(winners.len());

    for (index, winner) in winners.iter().enumerate() {
        let meme_id = winner.meme_id;
        let meme = get_meme(meme_id)
            .ok_or_else(|| format!("Meme {} not found for week {}", meme_id, week_id))?;

        let key = WeekMemeKey(week_id, meme_id);
        let existing_id = WEEK_MEME_INDEX.with(|idx| idx.borrow().get(&key));

        if let Some(entitlement_id) = existing_id {
            if let Some(mut entitlement) =
                ENTITLEMENTS.with(|ents| ents.borrow().get(&entitlement_id))
            {
                refresh_status(&mut entitlement, now);
                created.push(entitlement.clone());
                store_entitlement(entitlement_id, entitlement);
            }
            continue;
        }

        let entitlement_id = next_entitlement_id();
        let entitlement = MintEntitlement {
            entitlement_id,
            meme_id,
            owner: meme.owner,
            week_id,
            rank: (index + 1) as u8,
            meme_title: meme.meme_data.prompt.clone(),
            created_at: now,
            expires_at: now.saturating_add(ENTITLEMENT_WINDOW_NS),
            status: EntitlementStatus::Active,
            used_at: None,
            minted_token_ids: Vec::new(),
        };

        store_entitlement(entitlement_id, entitlement.clone());
        WEEK_MEME_INDEX.with(|idx| idx.borrow_mut().insert(key, entitlement_id));
        created.push(entitlement);
    }

    Ok(created)
}

pub(crate) fn require_active_entitlement(
    owner: Principal,
    meme_id: u64,
    now: u64,
) -> Result<(u64, MintEntitlement), String> {
    if let Some((entitlement_id, mut entitlement)) = find_entitlement_record(owner, meme_id) {
        refresh_status(&mut entitlement, now);
        store_entitlement(entitlement_id, entitlement.clone());

        match entitlement.status {
            EntitlementStatus::Active => Ok((entitlement_id, entitlement)),
            EntitlementStatus::Expired => Err("Mint window expired".into()),
            EntitlementStatus::Used => Err("Mint entitlement already used".into()),
        }
    } else {
        Err("No mint entitlement available for this meme".into())
    }
}

pub(crate) fn mark_entitlement_used(
    entitlement_id: u64,
    minted_token_ids: Vec<Nat>,
) -> Result<MintEntitlement, String> {
    ENTITLEMENTS.with(|ents| {
        let mut map = ents.borrow_mut();
        if let Some(mut entitlement) = map.get(&entitlement_id) {
            let now = time();
            refresh_status(&mut entitlement, now);
            match entitlement.status {
                EntitlementStatus::Active => {
                    entitlement.status = EntitlementStatus::Used;
                    entitlement.used_at = Some(now);
                    entitlement.minted_token_ids = minted_token_ids;
                    map.insert(entitlement_id, entitlement.clone());
                    Ok(entitlement)
                }
                EntitlementStatus::Expired => Err("Mint window expired".into()),
                EntitlementStatus::Used => Err("Mint entitlement already used".into()),
            }
        } else {
            Err("Mint entitlement not found".into())
        }
    })
}

fn update_and_collect<F>(mut filter: F) -> Vec<MintEntitlement>
where
    F: FnMut(&MintEntitlement) -> bool,
{
    let now = time();
    let entries: Vec<(u64, MintEntitlement)> = ENTITLEMENTS.with(|ents| {
        let map = ents.borrow();
        map.iter()
            .map(|entry| (*entry.key(), entry.value()))
            .collect()
    });

    let mut result = Vec::new();
    ENTITLEMENTS.with(|ents| {
        let mut map = ents.borrow_mut();
        for (id, mut entitlement) in entries {
            refresh_status(&mut entitlement, now);
            let include = filter(&entitlement);
            map.insert(id, entitlement.clone());
            if include {
                result.push(entitlement);
            }
        }
    });

    result
}

// ---------- Public queries ----------
#[query]
pub fn get_my_mint_entitlements() -> Vec<MintEntitlement> {
    let caller = ic_cdk::caller();
    update_and_collect(|entitlement| entitlement.owner == caller)
}

#[query]
pub fn get_entitlements_for_meme(meme_id: u64) -> Vec<MintEntitlement> {
    update_and_collect(|entitlement| entitlement.meme_id == meme_id)
}

#[query]
pub fn get_my_winner_notices() -> Vec<WinnerNotice> {
    get_my_mint_entitlements()
        .into_iter()
        .map(|entitlement| WinnerNotice {
            entitlement_id: entitlement.entitlement_id,
            meme_id: entitlement.meme_id,
            meme_title: entitlement.meme_title.clone(),
            rank: entitlement.rank,
            week_id: entitlement.week_id,
            issued_at: entitlement.created_at,
            expires_at: entitlement.expires_at,
            used_at: entitlement.used_at,
            status: entitlement.status.clone(),
            message: format!(
                "🎉 Congratulations! Your meme \"{}\" placed #{} in Week {}. Mint it before the window closes!",
                entitlement.meme_title, entitlement.rank, entitlement.week_id
            ),
        })
        .collect()
}
