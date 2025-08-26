// src/http_outcall.rs
#![allow(clippy::too_many_arguments)]

use candid::{CandidType, Nat, Principal};
use ic_cdk::{caller,api::time};
use ic_cdk::api::management_canister::http_request::{
    http_request, CanisterHttpRequestArgument, HttpHeader, HttpMethod, HttpResponse, TransformArgs,
    TransformContext,
};
use ic_cdk_macros::{query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, Storable,
};
use ic_stable_structures::storable::Bound;
use serde::{Deserialize, Serialize};
use std::borrow::Cow;
use std::cell::RefCell;

// ---------- Type aliases ----------
type Memory = VirtualMemory<DefaultMemoryImpl>;

// ---------- Constants ----------
const OUTCALL_CYCLES: u128 = 10_000_000_000; // cycles per outcall
const MEME_WORKER_URL: &str = "https://plain-night-ff62.h28177922.workers.dev/generate_meme";

// ---------- Storable wrapper for Principal ----------
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, CandidType, Serialize, Deserialize)]
pub struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    const BOUND: Bound = Bound::Bounded { max_size: 29, is_fixed_size: false };
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Borrowed(self.0.as_slice()) }
    fn into_bytes(self) -> Vec<u8> { self.0.as_slice().to_vec() }
    fn from_bytes(bytes: Cow<[u8]>) -> Self { StorablePrincipal(Principal::from_slice(bytes.as_ref())) }
}
impl From<Principal> for StorablePrincipal { fn from(p: Principal) -> Self { StorablePrincipal(p) } }
impl From<StorablePrincipal> for Principal { fn from(sp: StorablePrincipal) -> Self { sp.0 } }

// ---------- Storable wrapper for Vec<u64> ----------
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct StorableVecU64(pub Vec<u64>);
impl StorableVecU64 {
    pub const MAX_LEN: usize = 1024;
    #[inline] fn byte_capacity_for(len: usize) -> usize { 4 + 8 * len }
}
impl Storable for StorableVecU64 {
    const BOUND: Bound = Bound::Bounded { max_size: (4 + 8 * Self::MAX_LEN) as u32, is_fixed_size: false };
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut len = self.0.len().min(Self::MAX_LEN);
        let mut bytes = Vec::with_capacity(Self::byte_capacity_for(len));
        bytes.extend_from_slice(&(len as u32).to_le_bytes());
        for &item in self.0.iter().take(len) {
            bytes.extend_from_slice(&item.to_le_bytes());
        }
        Cow::Owned(bytes)
    }
    fn into_bytes(self) -> Vec<u8> {
        let mut len = self.0.len().min(Self::MAX_LEN);
        let mut bytes = Vec::with_capacity(Self::byte_capacity_for(len));
        bytes.extend_from_slice(&(len as u32).to_le_bytes());
        for item in self.0.into_iter().take(len) {
            bytes.extend_from_slice(&item.to_le_bytes());
        }
        bytes
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let b = bytes.as_ref();
        if b.len() < 4 { return StorableVecU64(Vec::new()); }
        let declared = u32::from_le_bytes([b[0], b[1], b[2], b[3]]) as usize;
        let len = declared.min(Self::MAX_LEN);
        let mut v = Vec::with_capacity(len);
        for i in 0..len {
            let start = 4 + i * 8;
            if start + 8 > b.len() { break; }
            let mut arr = [0u8; 8];
            arr.copy_from_slice(&b[start..start + 8]);
            v.push(u64::from_le_bytes(arr));
        }
        StorableVecU64(v)
    }
}
impl From<Vec<u64>> for StorableVecU64 { fn from(v: Vec<u64>) -> Self { StorableVecU64(v) } }
impl From<StorableVecU64> for Vec<u64> { fn from(sv: StorableVecU64) -> Self { sv.0 } }

// ---------- Stable memory setup ----------
thread_local! {
    static MEM_MGR: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static RATE: RefCell<StableBTreeMap<StorablePrincipal, DayUsage, Memory>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(20)))));

    static MEMES: RefCell<StableBTreeMap<u64, StoredMeme, Memory>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(21)))));

    static USER_MEMES: RefCell<StableBTreeMap<StorablePrincipal, StorableVecU64, Memory>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(22)))));

    static MEME_COUNTER: RefCell<StableBTreeMap<u8, u64, Memory>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(23)))));
}

// ---------- Data structures ----------
#[derive(Clone, Debug, Default, Serialize, Deserialize, CandidType)]
struct DayUsage { day: u64, count: u8 }
impl Storable for DayUsage {
    const BOUND: Bound = Bound::Bounded { max_size: 9, is_fixed_size: true };
    fn to_bytes(&self) -> Cow<[u8]> {
        let mut bytes = Vec::with_capacity(9);
        bytes.extend_from_slice(&self.day.to_le_bytes());
        bytes.push(self.count);
        Cow::Owned(bytes)
    }
    fn into_bytes(self) -> Vec<u8> {
        let mut bytes = Vec::with_capacity(9);
        bytes.extend_from_slice(&self.day.to_le_bytes());
        bytes.push(self.count);
        bytes
    }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        if bytes.len() != 9 { return DayUsage::default(); }
        let mut day_arr = [0u8; 8];
        day_arr.copy_from_slice(&bytes[0..8]);
        DayUsage { day: u64::from_le_bytes(day_arr), count: bytes[8] }
    }
}

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct MemeData {
    pub prompt: String,
    pub image_url: String,
    pub image_filename: String,
    pub image_format: String,
    pub metadata: PythonMetadata,
}
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct PythonMetadata {
    pub processing_time: f64,
    pub timestamp: u64,
    pub file_size_bytes: u64,
    pub service: String,
}
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct StoredMeme {
    pub id: u64,
    pub owner: StorablePrincipal,
    pub meme_data: MemeData,
    pub created_at: u64,
    pub canister_timestamp: u64,
}
impl Storable for StoredMeme {
    const BOUND: Bound = Bound::Unbounded;
    fn to_bytes(&self) -> Cow<[u8]> { Cow::Owned(serde_json::to_vec(self).unwrap_or_default()) }
    fn into_bytes(self) -> Vec<u8> { serde_json::to_vec(&self).unwrap_or_default() }
    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(bytes.as_ref()).unwrap_or_else(|_| StoredMeme {
            id: 0,
            owner: StorablePrincipal(Principal::anonymous()),
            meme_data: MemeData {
                prompt: String::new(),
                image_url: String::new(),
                image_filename: String::new(),
                image_format: String::new(),
                metadata: PythonMetadata { processing_time: 0.0, timestamp: 0, file_size_bytes: 0, service: String::new() },
            },
            created_at: 0,
            canister_timestamp: 0,
        })
    }
}
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct PublicStoredMeme {
    pub id: u64,
    pub owner: Principal,
    pub meme_data: MemeData,
    pub created_at: u64,
    pub canister_timestamp: u64,
}
impl From<StoredMeme> for PublicStoredMeme {
    fn from(sm: StoredMeme) -> Self {
        PublicStoredMeme {
            id: sm.id,
            owner: sm.owner.into(),
            meme_data: sm.meme_data,
            created_at: sm.created_at,
            canister_timestamp: sm.canister_timestamp,
        }
    }
}

// ---------- Helpers ----------
fn is_url_allowed(url: &str) -> bool {
    url.starts_with("https://") || url.starts_with("http://127.0.0.1") || url.starts_with("http://localhost")
}
fn url_encode(input: &str) -> String {
    input.chars().map(|c| match c {
        'A'..='Z' | 'a'..='z' | '0'..='9' | '-' | '_' | '.' | '~' => c.to_string(),
        ' ' => "%20".to_string(),
        _ => format!("%{:02X}", c as u8),
    }).collect()
}

// ---------- Simple GET helper (Cloudflare Worker) ----------
#[update]
pub async fn generate_meme(prompt: String) -> Result<String, String> {
    if prompt.trim().is_empty() {
        return Err("Prompt cannot be empty".to_string());
    }

    // Check rate limiting
    let user = caller();
    let storable_user = StorablePrincipal::from(user);
    let now = time();
    let current_day = now / (24 * 60 * 60 * 1_000_000_000); // Convert ns to days
    
    // Check if user has exceeded daily limit
    let can_generate = RATE.with(|r| {
        let mut rate_map = r.borrow_mut();
        if let Some(usage) = rate_map.get(&storable_user) {
            if usage.day == current_day {
                // Same day, check if under limit
                usage.count < 10
            } else {
                // New day, reset count
                true
            }
        } else {
            // First time user
            true
        }
    });
    
    if !can_generate {
        return Err("Daily meme generation limit reached. Please try again tomorrow.".to_string());
    }

    let encoded = url_encode(&prompt);
    let url = format!("{base}?prompt={p}", base = MEME_WORKER_URL, p = encoded);

    if !is_url_allowed(&url) {
        return Err("URL not allowed by canister policy".to_string());
    }

    let headers = vec![
        HttpHeader { name: "User-Agent".into(), value: "mementic_canister".into() },
        HttpHeader { name: "Accept".into(), value: "application/json".into() },
    ];

    let req = CanisterHttpRequestArgument {
        url,
        method: HttpMethod::GET,
        body: None,
        headers,
        max_response_bytes: Some(512_000),
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
    };

    let (resp,) = http_request(req, OUTCALL_CYCLES)
        .await
        .map_err(|(code, msg)| format!("HTTP outcall failed: {:?} - {}", code, msg))?;

    if resp.status < Nat::from(200u16) || resp.status >= Nat::from(300u16) {
        return Err(format!("HTTP {} from worker", resp.status));
    }

    // Update rate limiting after successful generation
    RATE.with(|r| {
        let mut rate_map = r.borrow_mut();
        if let Some(usage) = rate_map.get(&storable_user) {
            if usage.day == current_day {
                // Same day, increment count
                let mut new_usage = usage.clone();
                new_usage.count += 1;
                rate_map.insert(storable_user, new_usage);
            } else {
                // New day, reset count to 1
                rate_map.insert(storable_user, DayUsage { day: current_day, count: 1 });
            }
        } else {
            // First time user, start with count 1
            rate_map.insert(storable_user, DayUsage { day: current_day, count: 1 });
        }
    });

    Ok(String::from_utf8(resp.body).unwrap_or_else(|_| "<non-utf8-body>".to_string()))
}

// ---------- Queries ----------
#[query]
pub fn get_meme(meme_id: u64) -> Option<PublicStoredMeme> {
    MEMES.with(|m| m.borrow().get(&meme_id).map(|sm| sm.into()))
}

#[query]
pub fn check_remaining_calls() -> u8 {
    let user = caller();
    let storable_user = StorablePrincipal::from(user);
    
    // Get current day (in nanoseconds since epoch, converted to days)
    let now = time();
    let current_day = now / (24 * 60 * 60 * 1_000_000_000); // Convert ns to days
    
    RATE.with(|r| {
        let rate_map = r.borrow();
        if let Some(usage) = rate_map.get(&storable_user) {
            if usage.day == current_day {
                // Same day, return remaining calls (assuming max 10 per day)
                let max_calls = 10;
                if usage.count >= max_calls {
                    0 // No calls remaining
                } else {
                    max_calls - usage.count
                }
            } else {
                // New day, reset to max calls
                10
            }
        } else {
            // First time user, return max calls
            10
        }
    })
}
#[query]
pub fn get_user_memes() -> Vec<PublicStoredMeme> {
    let user = caller();
    let storable_user = StorablePrincipal::from(user);
    USER_MEMES.with(|um| {
        let map = um.borrow();
        if let Some(list) = map.get(&storable_user) {
            let mut ids: Vec<u64> = list.into();
            ids.sort_unstable_by(|a, b| b.cmp(a));
            MEMES.with(|m| {
                let mem = m.borrow();
                ids.into_iter().filter_map(|id| mem.get(&id).map(|sm| sm.into())).collect()
            })
        } else { Vec::new() }
    })
}
#[query]
pub fn get_total_memes() -> u64 {
    MEME_COUNTER.with(|c| c.borrow().get(&0).unwrap_or(0))
}
#[query]
pub fn get_user_meme_count() -> u32 {
    let user = caller();
    let storable_user = StorablePrincipal::from(user);
    USER_MEMES.with(|um| um.borrow().get(&storable_user).map(|list| { let v: Vec<u64> = list.into(); v.len() as u32 }).unwrap_or(0))
}
#[query]
pub fn health() -> String {
    format!("Meme Worker: {} - Status: Operational", MEME_WORKER_URL)
}

// ---------- Transform ----------
#[query]
fn transform(args: TransformArgs) -> HttpResponse {
    let mut r = args.response;
    r.headers.retain(|h| matches!(h.name.to_ascii_lowercase().as_str(), "content-type" | "content-length"));
    r
}
