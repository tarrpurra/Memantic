use candid::{CandidType, Principal};
use ic_cdk::api::time;
use ic_stable_structures::memory_manager::{MemoryId, MemoryManager, VirtualMemory};
use ic_stable_structures::{DefaultMemoryImpl, StableBTreeMap, Storable};
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

use crate::http_outcall::StorablePrincipal;

type Memory = VirtualMemory<DefaultMemoryImpl>;
type Mem = ic_stable_structures::memory_manager::MemoryManager<DefaultMemoryImpl>;

thread_local! {
    static MEMORY_MANAGER: RefCell<Mem> = RefCell::new(
        MemoryManager::init(DefaultMemoryImpl::default())
    );

    // Memory ID 4 for user profiles
    static USER_PROFILES: RefCell<StableBTreeMap<StorablePrincipal, UserProfile, Memory>> =
        RefCell::new(StableBTreeMap::init(
            MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(4)))
        ));
}

#[derive(CandidType, Serialize, Deserialize, Clone, Debug)]
pub struct UserProfile {
    pub principal: Principal,
    pub username: Option<String>,
    pub display_name: Option<String>,
    pub created_at: u64,
    pub updated_at: u64,
}

impl Storable for UserProfile {
    const BOUND: ic_stable_structures::storable::Bound = ic_stable_structures::storable::Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        use candid::Encode;
        Cow::Owned(Encode!(self).unwrap())
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        use candid::Decode;
        Decode!(bytes.as_ref(), Self).unwrap()
    }

    fn into_bytes(self) -> Vec<u8> {
        self.to_bytes().into_owned()
    }
}

#[ic_cdk::update]
pub fn update_user_profile(username: Option<String>, display_name: Option<String>) -> Result<(), String> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return Err("Authentication required".to_string());
    }

    let now = time();
    let storable_principal = StorablePrincipal::from(caller);

    USER_PROFILES.with(|profiles| {
        let mut map = profiles.borrow_mut();

        // Get existing profile or create new one
        let existing_profile = map.get(&storable_principal);

        let profile = UserProfile {
            principal: caller,
            username: username.clone(),
            display_name,
            created_at: existing_profile.as_ref().map(|p| p.created_at).unwrap_or(now),
            updated_at: now,
        };

        map.insert(storable_principal, profile);
        Ok(())
    })
}

#[ic_cdk::query]
pub fn get_user_profile() -> Option<UserProfile> {
    let caller = ic_cdk::caller();

    if caller == Principal::anonymous() {
        return None;
    }

    let storable_principal = StorablePrincipal::from(caller);

    USER_PROFILES.with(|profiles| {
        profiles.borrow().get(&storable_principal)
    })
}

#[ic_cdk::query]
pub fn get_user_profile_by_principal(principal: Principal) -> Option<UserProfile> {
    let storable_principal = StorablePrincipal::from(principal);

    USER_PROFILES.with(|profiles| {
        profiles.borrow().get(&storable_principal)
    })
}

#[ic_cdk::query]
pub fn get_all_user_profiles() -> Vec<UserProfile> {
    USER_PROFILES.with(|profiles| {
        let map = profiles.borrow();
        map.iter().map(|entry| entry.value()).collect()
    })
}