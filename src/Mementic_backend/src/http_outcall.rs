// src/http_outcall.rs
use candid::{CandidType, Principal,Nat};
use ic_cdk::api::management_canister::http_request::{
    http_request,                    // The function to make HTTP calls
    HttpHeader,                     // For request/response headers
    HttpMethod,                     // GET, POST, etc.
    HttpResponse,                   // Response type
    TransformArgs,                  // For transform function arguments
    TransformContext,               // Transform context
    CanisterHttpRequestArgument,    // The request type
};
use ic_cdk::{caller, api::time};
use ic_cdk_macros::{query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    DefaultMemoryImpl, StableBTreeMap, Storable
};
use ic_stable_structures::storable::Bound;
use serde::{Deserialize, Serialize};
use std::cell::RefCell;
use std::borrow::Cow;


// ---------- Type aliases ----------
type Memory = VirtualMemory<DefaultMemoryImpl>;

// ---------- Constants ----------
// Cycles to attach to each HTTPS outcall. Tune as needed based on payload sizes.
const OUTCALL_CYCLES: u128 = 3_000_000_000; // 3B cycles

// Meme Generator AI Service URL
const MEME_GENERATOR_URL: &str = "https://meme-generator-0kk3.onrender.com/generate_meme";

// ---------- Storable wrapper for Principal ----------
#[derive(Clone, Debug, PartialEq, Eq, PartialOrd, Ord, CandidType, Serialize, Deserialize)]
pub struct StorablePrincipal(Principal);

impl Storable for StorablePrincipal {
    // Principals are <= 29 bytes, variable length.
    const BOUND: Bound = Bound::Bounded {
        max_size: 29,
        is_fixed_size: false,
    };

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Borrowed(self.0.as_slice())
    }

    fn into_bytes(self) -> Vec<u8> {
        self.0.as_slice().to_vec()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        StorablePrincipal(Principal::from_slice(bytes.as_ref()))
    }
}

impl From<Principal> for StorablePrincipal {
    fn from(p: Principal) -> Self {
        StorablePrincipal(p)
    }
}

impl From<StorablePrincipal> for Principal {
    fn from(sp: StorablePrincipal) -> Self {
        sp.0
    }
}

// ---------- Storable wrapper for Vec<u64> ----------
#[derive(Clone, Debug, Default, PartialEq, Eq)]
pub struct StorableVecU64(pub Vec<u64>);

impl StorableVecU64 {
    // Adjust to whatever your application guarantees.
    pub const MAX_LEN: usize = 1024;

    #[inline]
    fn byte_capacity_for(len: usize) -> usize {
        4 + 8 * len // 4 bytes for length (u32) + 8 bytes per u64
    }
}

impl Storable for StorableVecU64 {
    // Variable length, but bounded so the storage layer can validate sizes.
    const BOUND: Bound = Bound::Bounded {
        max_size: (4 + 8 * Self::MAX_LEN) as u32,
        is_fixed_size: false,
    };

    fn to_bytes(&self) -> Cow<[u8]> {
        let mut len = self.0.len();
        if len > Self::MAX_LEN {
            len = Self::MAX_LEN; // cap to stay within BOUND
        }
        let mut bytes = Vec::with_capacity(Self::byte_capacity_for(len));
        bytes.extend_from_slice(&(len as u32).to_le_bytes());
        for &item in self.0.iter().take(len) {
            bytes.extend_from_slice(&item.to_le_bytes());
        }
        Cow::Owned(bytes)
    }

    fn into_bytes(self) -> Vec<u8> {
        let mut len = self.0.len();
        if len > Self::MAX_LEN {
            len = Self::MAX_LEN;
        }
        let mut bytes = Vec::with_capacity(Self::byte_capacity_for(len));
        bytes.extend_from_slice(&(len as u32).to_le_bytes());
        for item in self.0.into_iter().take(len) {
            bytes.extend_from_slice(&item.to_le_bytes());
        }
        bytes
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        let b = bytes.as_ref();
        if b.len() < 4 {
            return StorableVecU64(Vec::new());
        }

        let declared = u32::from_le_bytes([b[0], b[1], b[2], b[3]]) as usize;
        let len = declared.min(Self::MAX_LEN);
        let needed = 4 + 8 * len;

        if b.len() < needed {
            // Truncated payload: parse whatever full u64s are present.
            let available = (b.len().saturating_sub(4)) / 8;
            let len = available.min(len);
            let mut v = Vec::with_capacity(len);
            for i in 0..len {
                let start = 4 + i * 8;
                let end = start + 8;
                let mut arr = [0u8; 8];
                arr.copy_from_slice(&b[start..end]);
                v.push(u64::from_le_bytes(arr));
            }
            return StorableVecU64(v);
        }

        let mut v = Vec::with_capacity(len);
        for i in 0..len {
            let start = 4 + i * 8;
            let end = start + 8;
            let mut arr = [0u8; 8];
            arr.copy_from_slice(&b[start..end]);
            v.push(u64::from_le_bytes(arr));
        }
        StorableVecU64(v)
    }
}

impl From<Vec<u64>> for StorableVecU64 {
    fn from(v: Vec<u64>) -> Self {
        StorableVecU64(v)
    }
}

impl From<StorableVecU64> for Vec<u64> {
    fn from(sv: StorableVecU64) -> Self {
        sv.0
    }
}

// ---------- Stable memory setup ----------
thread_local! {
    static MEM_MGR: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));
    
    // Memory 20: Rate limiting - key = Principal, val = DayUsage
    static RATE: RefCell<StableBTreeMap<StorablePrincipal, DayUsage, Memory>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(20)))));
    
    // Memory 21: Meme storage - key = meme_id, val = StoredMeme
    static MEMES: RefCell<StableBTreeMap<u64, StoredMeme, Memory>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(21)))));
    
    // Memory 22: User memes index - key = Principal, val = Vec<meme_id>
    static USER_MEMES: RefCell<StableBTreeMap<StorablePrincipal, StorableVecU64, Memory>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(22)))));
    
    // Memory 23: Meme counter for unique IDs
    static MEME_COUNTER: RefCell<StableBTreeMap<u8, u64, Memory>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(23)))));
}

// ---------- Data structures ----------

#[derive(Clone, Debug, Default, Serialize, Deserialize, CandidType)]
struct DayUsage { 
    day: u64, 
    count: u8 
}

impl Storable for DayUsage {
    // Exactly 9 bytes: 8 for `day` (LE) + 1 for `count`
    const BOUND: Bound = Bound::Bounded {
        max_size: 9,
        is_fixed_size: true,
    };

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
        let b = bytes.as_ref();
        if b.len() != 9 {
            // Fallback; you could also `panic!` here if you prefer strictness.
            return DayUsage::default();
        }
        let mut day_arr = [0u8; 8];
        day_arr.copy_from_slice(&b[0..8]);
        let day = u64::from_le_bytes(day_arr);
        let count = b[8];
        DayUsage { day, count }
    }
}

/// Input structure for the meme generator AI
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct GeneratorInput {
    pub prompt: String,
    pub style: Option<String>,
    pub return_base64: bool,
}

/// Internal structure for the meme generator service API
#[derive(Clone, Debug, Serialize, Deserialize)]
struct MemeServiceRequest {
    prompt: String,
}

/// Response structure from meme generator service (exact format)
#[derive(Clone, Debug, Serialize, Deserialize)]
struct MemeServiceResponse {
    pub success: bool,
    pub message: String,
    pub data: MemeServiceData,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct MemeServiceData {
    pub prompt: String,
    pub image_url: String,
    pub image_filename: String,
    pub image_format: String,
    pub metadata: MemeServiceMetadata,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
struct MemeServiceMetadata {
    pub processing_time: f64,
    pub timestamp: u64,
    pub file_size_bytes: u64,
    pub service: String,
}

/// Response structure from Python backend (exactly matching your format)
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct MemeAIResponse {
    pub success: bool,
    pub message: String,
    pub data: Option<MemeData>,
    pub error: Option<String>,
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

/// Stored meme structure for stable memory
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct StoredMeme {
    pub id: u64,
    pub owner: StorablePrincipal,
    pub meme_data: MemeData,
    pub created_at: u64,
    pub canister_timestamp: u64,
}

impl Storable for StoredMeme {
    // Variable-size JSON; allowed for values (NOT for keys).
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(serde_json::to_vec(self).unwrap_or_default())
    }

    fn into_bytes(self) -> Vec<u8> {
        serde_json::to_vec(&self).unwrap_or_default()
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        serde_json::from_slice(bytes.as_ref()).unwrap_or_else(|_| StoredMeme {
            id: 0,
            owner: StorablePrincipal(Principal::anonymous()),
            meme_data: MemeData {
                prompt: String::new(),
                image_url: String::new(),
                image_filename: String::new(),
                image_format: String::new(),
                metadata: PythonMetadata {
                    processing_time: 0.0,
                    timestamp: 0,
                    file_size_bytes: 0,
                    service: String::new(),
                },
            },
            created_at: 0,
            canister_timestamp: 0,
        })
    }
}

/// Simple response structure for the frontend
#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct GeneratorResponse {
    pub success: bool,
    pub meme_id: Option<u64>,
    pub meme_data: Option<MemeData>,
    pub error_message: Option<String>,
    pub calls_remaining_today: u8,
}

/// Public API version of StoredMeme (for compatibility)
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

// ---------- Helper functions ----------

fn days_since_epoch(ns: u64) -> u64 { 
    ns / 1_000_000_000 / 86_400 
}

fn enforce_rate_limit(user: Principal) -> Result<(), String> {
    let storable_user = StorablePrincipal::from(user);
    RATE.with(|r| {
        let mut map = r.borrow_mut();
        let mut du = map.get(&storable_user).unwrap_or_default();
        let today = days_since_epoch(time());
        
        if du.day != today {
            du.day = today;
            du.count = 0;
        }
        
        if du.count >= 3 {
            return Err("Rate limit: 3 calls per day. Try again tomorrow.".into());
        }
        
        du.count += 1;
        map.insert(storable_user, du);
        Ok(())
    })
}

fn get_remaining_calls_today(user: Principal) -> u8 {
    let storable_user = StorablePrincipal::from(user);
    RATE.with(|r| {
        let map = r.borrow();
        let du = map.get(&storable_user).unwrap_or_default();
        let today = days_since_epoch(time());
        
        if du.day != today {
            3 // New day, full allowance
        } else {
            3_u8.saturating_sub(du.count)
        }
    })
}

fn get_next_meme_id() -> u64 {
    MEME_COUNTER.with(|c| {
        let mut counter = c.borrow_mut();
        let current = counter.get(&0).unwrap_or(0);
        let next_id = current + 1;
        counter.insert(0, next_id);
        next_id
    })
}

fn store_meme(stored_meme: StoredMeme) {
    let meme_id = stored_meme.id;
    let owner = stored_meme.owner.clone();
    
    // Store the meme
    MEMES.with(|m| {
        m.borrow_mut().insert(meme_id, stored_meme);
    });
    
    // Update user's meme list
    USER_MEMES.with(|um| {
        let mut user_memes = um.borrow_mut();
        let mut meme_list: Vec<u64> = user_memes.get(&owner).unwrap_or_default().into();
        meme_list.push(meme_id);
        user_memes.insert(owner, meme_list.into());
    });
}

// ---------- Main functions ----------

/// Main function: Makes HTTPS call to AI generator and stores result in stable memory
#[update]
pub async fn call_generator(url: String, input: GeneratorInput) -> Result<GeneratorResponse, String> {
    let user = caller();
    
    // 1) Check rate limit (3 calls per day)
    enforce_rate_limit(user)?;
    
    // 2) Validate input
    if input.prompt.trim().is_empty() {
        return Ok(GeneratorResponse {
            success: false,
            meme_id: None,
            meme_data: None,
            error_message: Some("Prompt cannot be empty".to_string()),
            calls_remaining_today: get_remaining_calls_today(user),
        });
    }
    
    // 3) Use the meme generator service URL (ignore the url parameter for now)
    let service_url = MEME_GENERATOR_URL.to_string();

    // 4) Prepare HTTP request for meme generator service
    let service_request = MemeServiceRequest {
        prompt: input.prompt.clone(),
    };
    let body = serde_json::to_vec(&service_request).map_err(|e| e.to_string())?;
    let headers = vec![
        HttpHeader { 
            name: "Content-Type".into(), 
            value: "application/json".into() 
        },
        HttpHeader { 
            name: "Accept".into(), 
            value: "application/json".into() 
        },
    ];
    
    let req = CanisterHttpRequestArgument {
        url: service_url,
        method: HttpMethod::POST,
        body: Some(body),
        headers,
        max_response_bytes: Some(2_000_000), // 2MB limit due to IC message size caps
        transform: Some(TransformContext::from_name("transform".to_string(), vec![])),
    };
    
    // 5) Make HTTPS call (attach cycles)
    let (resp,) = http_request(req, OUTCALL_CYCLES).await.map_err(|(code, msg)| {
        format!("HTTP outcall failed: {:?} - {}", code, msg)
    })?;
    
    // 6) Check HTTP status
    let status = resp.status.clone(); // Nat
    if status < Nat::from(200u16) || status >= Nat::from(300u16) {
        return Ok(GeneratorResponse {
            success: false,
            meme_id: None,
            meme_data: None,
            error_message: Some(format!("AI service returned HTTP {}", status)),
            calls_remaining_today: get_remaining_calls_today(user),
        });
    }
    
        // 7) Parse response and store in stable memory
    let body_string = String::from_utf8_lossy(&resp.body);
    
    // Debug logging
    ic_cdk::println!("Response body: {}", body_string);
    
    match serde_json::from_str::<MemeServiceResponse>(&body_string) {
        Ok(service_response) => {
            // Check if the service was successful
            if !service_response.success {
                return Ok(GeneratorResponse {
                    success: false,
                    meme_id: None,
                    meme_data: None,
                    error_message: Some(service_response.message),
                    calls_remaining_today: get_remaining_calls_today(user),
                });
            }
            
            // Convert service response to our internal format
            let meme_data = MemeData {
                prompt: service_response.data.prompt.clone(),
                image_url: service_response.data.image_url,
                image_filename: service_response.data.image_filename,
                image_format: service_response.data.image_format,
                metadata: PythonMetadata {
                    processing_time: service_response.data.metadata.processing_time,
                    timestamp: service_response.data.metadata.timestamp,
                    file_size_bytes: service_response.data.metadata.file_size_bytes,
                    service: service_response.data.metadata.service,
                },
            };
            
            // Generate unique meme ID and store in stable memory
            let meme_id = get_next_meme_id();
            let current_time = time();
            
            let stored_meme = StoredMeme {
                id: meme_id,
                owner: StorablePrincipal::from(user),
                meme_data: meme_data.clone(),
                // Store canister time as authoritative creation time
                created_at: current_time,
                canister_timestamp: current_time,
            };
            
            // Store in stable memory
            store_meme(stored_meme);
            
            ic_cdk::println!("Meme {} stored successfully for user {}", meme_id, user);
            
            Ok(GeneratorResponse {
                success: true,
                meme_id: Some(meme_id),
                meme_data: Some(meme_data),
                error_message: None,
                calls_remaining_today: get_remaining_calls_today(user),
            })
        }
        Err(parse_error) => {
            // Try to parse as error response with the actual service format
            if let Ok(error_response) = serde_json::from_str::<serde_json::Value>(&body_string) {
                let error_msg = if let Some(success) = error_response["success"].as_bool() {
                    if !success {
                        // Service returned success: false
                        error_response["message"]
                            .as_str()
                            .unwrap_or("Service returned failure")
                    } else {
                        // Service succeeded but we couldn't parse the data
                        "Service succeeded but response format is invalid"
                    }
                } else {
                    // Try to find error message in various possible fields
                    error_response["error"]
                        .as_str()
                        .or(error_response["message"].as_str())
                        .or(error_response["detail"].as_str())
                        .unwrap_or("Unknown error from meme generator service")
                };
                
                Ok(GeneratorResponse {
                    success: false,
                    meme_id: None,
                    meme_data: None,
                    error_message: Some(error_msg.to_string()),
                    calls_remaining_today: get_remaining_calls_today(user),
                })
            } else {
                Ok(GeneratorResponse {
                    success: false,
                    meme_id: None,
                    meme_data: None,
                    error_message: Some(format!("Failed to parse service response: {}", parse_error)),
                    calls_remaining_today: get_remaining_calls_today(user),
                })
            }
        }
    }
}

// ---------- Query functions for accessing stored data ----------

/// Get a specific meme by ID
#[query]
pub fn get_meme(meme_id: u64) -> Option<PublicStoredMeme> {
    MEMES.with(|m| m.borrow().get(&meme_id).map(|sm| sm.into()))
}

/// Get all memes for the calling user
#[query]
pub fn get_user_memes() -> Vec<PublicStoredMeme> {
    let user = caller();
    let storable_user = StorablePrincipal::from(user);
    USER_MEMES.with(|um| {
        let user_memes = um.borrow();
        if let Some(meme_ids) = user_memes.get(&storable_user) {
            let mut meme_ids: Vec<u64> = meme_ids.into();
            // Newest first by meme_id (assuming monotonic increasing IDs)
            meme_ids.sort_unstable_by(|a, b| b.cmp(a));
            MEMES.with(|m| {
                let memes = m.borrow();
                meme_ids
                    .iter()
                    .filter_map(|&id| memes.get(&id).map(|sm| sm.into()))
                    .collect()
            })
        } else {
            Vec::new()
        }
    })
}

/// Get user's remaining calls for today
#[query]
pub fn check_remaining_calls() -> u8 {
    get_remaining_calls_today(caller())
}

/// Get total number of stored memes
#[query]
pub fn get_total_memes() -> u64 {
    MEME_COUNTER.with(|c| c.borrow().get(&0).unwrap_or(0))
}

/// Get user's meme count
#[query]
pub fn get_user_meme_count() -> u32 {
    let user = caller();
    let storable_user = StorablePrincipal::from(user);
    USER_MEMES.with(|um| {
        um.borrow().get(&storable_user)
            .map(|list| {
                let vec: Vec<u64> = list.into();
                vec.len() as u32
            })
            .unwrap_or(0)
    })
}

/// Health check for the meme generator service
#[query]
pub fn health() -> String {
    format!("Meme Generator Service: {} - Status: Operational\nService Type: ICP Meme Generator\nEndpoint: /generate_meme\nCanister: Mementic_backend", MEME_GENERATOR_URL)
}

// ---------- Transform function for consensus ----------

#[query]
fn transform(args: TransformArgs) -> HttpResponse {
    let mut r = args.response;
    
    // Keep only essential headers for consensus
    r.headers.retain(|h| {
        matches!(h.name.to_ascii_lowercase().as_str(),
            "content-type" | "content-length")
    });
    
    r
}

// ---------- URL allowlist helper ----------

fn is_url_allowed(url: &str) -> bool {
    // Allow HTTPS everywhere; allow http only for localhost during development
    if url.starts_with("https://") {
        return true;
    }
    if url.starts_with("http://127.0.0.1") || url.starts_with("http://localhost") {
        return true;
    }
    false
}