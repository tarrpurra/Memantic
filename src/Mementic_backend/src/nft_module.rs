// src/lib.rs
use candid::{CandidType, Decode, Encode, Nat, Principal};
use ic_cdk::api::time;
use ic_cdk_macros::{init, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::{Bound, Storable},
    DefaultMemoryImpl, StableBTreeMap,
};

use crate::{WeeklyPeriod, WeeklyLeaderboard, MemeVotes, VoteRecord, MemeData, VoteResponse, VoteType, TransformArgs, HttpResponse};


use serde::{Deserialize, Serialize};
use std::{borrow::Cow, cell::RefCell};

// Import shared types (must exist in your crate)
use crate::http_outcall::PublicStoredMeme;
use crate::TopEntry;

// ---------- Stable memory ----------
type Mem = VirtualMemory<DefaultMemoryImpl>;

// ---------- Wrappers to implement Storable ----------
#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct SNat(pub Nat);

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct SPrincipal(pub Principal);

#[derive(Clone, Debug, Default, CandidType, Serialize, Deserialize)]
pub struct OwnerTokens(pub Vec<Nat>);

// Wrapper for storing image bytes in stable map (so Vec<u8> is Storable)
#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct ImageBlob(pub Vec<u8>);

impl Storable for SNat {
    // Variable-length because Candid’s Nat encoding is arbitrary precision.
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode SNat"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode SNat")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, SNat).expect("decode SNat")
    }
}

impl Storable for SPrincipal {
    const BOUND: Bound = Bound::Bounded { max_size: 64, is_fixed_size: false };

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode SPrincipal"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode SPrincipal")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, SPrincipal).expect("decode SPrincipal")
    }
}

impl Storable for OwnerTokens {
    // Arbitrary-length Candid serialization; okay for values.
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode OwnerTokens"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode OwnerTokens")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, OwnerTokens).expect("decode OwnerTokens")
    }
}

impl Storable for ImageBlob {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode ImageBlob"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode ImageBlob")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, ImageBlob).expect("decode ImageBlob")
    }
}

// ---------- Collection state ----------
#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct CollectionState {
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub logo: Option<String>,
    pub total_supply: Nat,
    pub admin: Principal,
    pub created_at: u64,
}

impl Default for CollectionState {
    fn default() -> Self {
        Self {
            name: String::new(),
            symbol: String::new(),
            description: None,
            logo: None,
            total_supply: Nat::from(0u32),
            admin: Principal::anonymous(),
            created_at: 0,
        }
    }
}

// ---------- NFT metadata ----------
#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct TokenMetadataEntry {
    pub name: String,
    pub immutable: bool,
    pub value: MetadataValue,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum MetadataValue {
    Text(String),
    Blob(Vec<u8>),
    Map(Vec<(String, MetadataValue)>),
    Array(Vec<MetadataValue>),
}

// Token record: note CandidType added and metadata uses Vec<TokenMetadataEntry>
#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct TokenRecord {
    pub token_id: Nat,
    pub owner: Principal,
    pub minted_at: u64,
    pub meme_id: u64,
    pub metadata: Vec<TokenMetadataEntry>,
    pub mime_type: Option<String>, // small
    pub has_image: bool,           // indicates presence in STORED_IMAGES
}

#[derive(Clone, CandidType, Deserialize)]
pub struct NftImage {
    pub mime_type: String,
    pub image: Vec<u8>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SupportedStandard { pub name: String, pub url: String }

impl Storable for TokenRecord {
    // Variable-size Candid; fine for values (not keys).
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode TokenRecord"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode TokenRecord")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, TokenRecord).expect("decode TokenRecord")
    }
}

thread_local! {
    static MEM_MGR: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static TOKENS: RefCell<StableBTreeMap<SNat, TokenRecord, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(0)))));

    static OWNER_INDEX: RefCell<StableBTreeMap<SPrincipal, OwnerTokens, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(1)))));

    static MINT_INDEX: RefCell<StableBTreeMap<u64, SNat, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(2)))));

    static WEEK_MINTED: RefCell<StableBTreeMap<u64, bool, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(3)))));

    static STATE: RefCell<CollectionState> = RefCell::new(CollectionState::default());

    // NEW: store actual image bytes (ImageBlob wraps Vec<u8>)
    static STORED_IMAGES: RefCell<StableBTreeMap<u64, ImageBlob, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(4)))));
}

// ---------- Init ----------
#[derive(CandidType, Deserialize)]
pub struct InitArgs {
    pub name: Option<String>,
    pub symbol: Option<String>,
    pub description: Option<String>,
    pub logo: Option<String>,
    pub admin: Option<Principal>,
}

#[init]
fn init(args: Option<InitArgs>) {
    let caller = ic_cdk::caller();
    STATE.with(|s| {
        let mut st = s.borrow_mut();
        st.name = args.as_ref().and_then(|a| a.name.clone()).unwrap_or_else(|| "Mementic Top Memes".into());
        st.symbol = args.as_ref().and_then(|a| a.symbol.clone()).unwrap_or_else(|| "MEME".into());
        st.description = args.as_ref().and_then(|a| a.description.clone());
        st.logo = args.as_ref().and_then(|a| a.logo.clone());
        st.admin = args.as_ref().and_then(|a| a.admin).unwrap_or(caller);
        st.total_supply = Nat::from(0u32);
        st.created_at = time();
    });

    // Initialize sample feedback data (project-specific)
    crate::init_feedback_data();
}

fn assert_admin() {
    if ic_cdk::caller() != STATE.with(|s| s.borrow().admin) {
        ic_cdk::trap("Unauthorized: admin only");
    }
}

// ---------- ICRC-7-ish queries ----------
#[query(name="icrc7_name")]
pub fn icrc7_name() -> String { STATE.with(|s| s.borrow().name.clone()) }

#[query(name="icrc7_symbol")]
pub fn icrc7_symbol() -> String { STATE.with(|s| s.borrow().symbol.clone()) }

#[query(name="icrc7_total_supply")]
pub fn icrc7_total_supply() -> Nat { STATE.with(|s| s.borrow().total_supply.clone()) }

#[query(name="icrc7_supported_standards")]
pub fn icrc7_supported_standards() -> Vec<SupportedStandard> {
    vec![
        SupportedStandard { name: "ICRC-7".into(), url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-7".into() },
        SupportedStandard { name: "ICRC-37".into(), url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-37".into() },
    ]
}

#[query(name="icrc7_owner_of")]
pub fn icrc7_owner_of(token_ids: Vec<Nat>) -> Vec<Option<Principal>> {
    TOKENS.with(|t| {
        let map = t.borrow();
        token_ids
            .into_iter()
            .map(|id| map.get(&SNat(id)).map(|r| r.owner))
            .collect()
    })
}

#[query(name="icrc7_tokens_of")]
pub fn icrc7_tokens_of(owner: Principal) -> Vec<Nat> {
    OWNER_INDEX.with(|idx| idx.borrow().get(&SPrincipal(owner)).map(|ot| ot.0.clone()).unwrap_or_default())
}

#[query]
pub fn get_token(token_id: Nat) -> Option<TokenRecord> {
    TOKENS.with(|t| t.borrow().get(&SNat(token_id)))
}

#[query]
pub fn get_token_by_meme_id(meme_id: u64) -> Option<Nat> {
    MINT_INDEX.with(|m| m.borrow().get(&meme_id).map(|sn| sn.0))
}

#[query]
pub fn get_nft_image(token_id: Nat) -> Option<NftImage> {
    let rec_opt = TOKENS.with(|t| t.borrow().get(&SNat(token_id.clone())));
    let rec = rec_opt?;
    let mime = rec.mime_type.clone().unwrap_or("application/octet-stream".to_string());
    let img_blob = STORED_IMAGES.with(|imgs| imgs.borrow().get(&rec.meme_id))?;
    Some(NftImage {
        mime_type: mime,
        image: img_blob.0.clone(),
    })
}

// ---------- Internal helpers ----------
fn next_token_id() -> Nat {
    STATE.with(|s| {
        let mut st = s.borrow_mut();
        let tid = st.total_supply.clone();
        st.total_supply = st.total_supply.clone() + Nat::from(1u32);
        tid
    })
}

fn push_owner(owner: Principal, token_id: &Nat) {
    OWNER_INDEX.with(|idx| {
        let mut map = idx.borrow_mut();
        let mut list = map.get(&SPrincipal(owner)).unwrap_or_default();
        list.0.push(token_id.clone());
        map.insert(SPrincipal(owner), list);
    });
}

fn guess_content_type(ext: &str) -> Option<String> {
    match ext.to_ascii_lowercase().as_str() {
        "png" => Some("image/png".into()),
        "jpg" | "jpeg" => Some("image/jpeg".into()),
        "webp" => Some("image/webp".into()),
        "gif" => Some("image/gif".into()),
        "bmp" => Some("image/bmp".into()),
        "tiff" | "tif" => Some("image/tiff".into()),
        _ => None,
    }
}

fn build_metadata(m: &PublicStoredMeme) -> Vec<TokenMetadataEntry> {
    let ct = guess_content_type(&m.meme_data.image_format);

    let mut root: Vec<TokenMetadataEntry> = vec![
        TokenMetadataEntry {
            name: "icrc7:metadata:uri:image".into(),
            immutable: true,
            value: MetadataValue::Text(m.meme_data.image_url.clone()),
        },
        TokenMetadataEntry {
            name: "icrc7:token_metadata".into(),
            immutable: true,
            value: MetadataValue::Map(vec![
                ("meme:id".into(), MetadataValue::Text(m.id.to_string())),
                ("meme:prompt".into(), MetadataValue::Text(m.meme_data.prompt.clone())),
                ("meme:filename".into(), MetadataValue::Text(m.meme_data.image_filename.clone())),
                ("meme:format".into(), MetadataValue::Text(m.meme_data.image_format.clone())),
                ("meme:service".into(), MetadataValue::Text(m.meme_data.metadata.service.clone())),
                ("meme:ai_timestamp_ns".into(), MetadataValue::Text(m.meme_data.metadata.timestamp.to_string())),
                ("meme:file_size_bytes".into(), MetadataValue::Text(m.meme_data.metadata.file_size_bytes.to_string())),
                ("meme:created_at_ns".into(), MetadataValue::Text(m.created_at.to_string())),
                ("meme:stored_at_ns".into(), MetadataValue::Text(m.canister_timestamp.to_string())),
            ]),
        }
    ];

    if let Some(ctext) = ct {
        root.push(TokenMetadataEntry {
            name: "icrc7:metadata:content_type".into(),
            immutable: true,
            value: MetadataValue::Text(ctext),
        });
    }

    root
}

// ---------- X-canister clients ----------
async fn voting_get_top3_for_week(voting_canister: Principal, week_id: u64) -> Result<Vec<TopEntry>, String> {
    use ic_cdk::api::call::call;
    call::<(u64,), (Result<Vec<TopEntry>, String>,)>(voting_canister, "get_top3_for_week", (week_id,))
        .await
        .map(|(res,)| res)
        .map_err(|e| format!("get_top3_for_week call failed: {:?}", e))?
}

async fn voting_get_meme_data(voting_canister: Principal, meme_id: u64) -> Result<Option<PublicStoredMeme>, String> {
    use ic_cdk::api::call::call;
    call::<(u64,), (Option<PublicStoredMeme>,)>(voting_canister, "get_meme", (meme_id,))
        .await
        .map(|(res,)| res)
        .map_err(|e| format!("get_meme call failed: {:?}", e))
}

// ---------- Public: mint Top-3 (now fetches image bytes before minting) ----------
#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MintedPair { pub meme_id: u64, pub token_id: Nat, pub owner: Principal }

#[update]
async fn mint_to(meme_id: u64) -> Result<Nat, String> {
    // Prevent double-minting for same meme
    if let Some(existing) = MINT_INDEX.with(|mi| mi.borrow().get(&meme_id)) {
        return Ok(existing.0);
    }

    let voting_canister = ic_cdk::api::id();
    let stored_meme_data = voting_get_meme_data(voting_canister, meme_id).await?
        .ok_or_else(|| format!("StoredMeme {} not found in voting canister", meme_id))?;

    let image_url = stored_meme_data.meme_data.image_url.clone();
    let image_format = stored_meme_data.meme_data.image_format.clone();
    let mime_type = guess_content_type(&image_format).unwrap_or_else(|| "application/octet-stream".into());

    let image_bytes = match crate::http_outcall::fetch_image_bytes_from_image_storage(&image_url).await {
        Ok(b) => b,
        Err(e) => return Err(format!("failed to fetch image for meme {} : {}", meme_id, e)),
    };

    // Store image bytes in STORED_IMAGES under meme_id
    STORED_IMAGES.with(|imgs| {
        imgs.borrow_mut().insert(meme_id, ImageBlob(image_bytes));
    });

    // Generate token_id and build token metadata
    let token_id = next_token_id();
    let mut metadata = build_metadata(&stored_meme_data);

    // Add content type to metadata (ensures downstream clients can read content type)
    metadata.push(TokenMetadataEntry {
        name: "icrc7:metadata:content_type".into(),
        immutable: true,
        value: MetadataValue::Text(mime_type.clone()),
    });

    let rec = TokenRecord {
        token_id: token_id.clone(),
        owner: stored_meme_data.owner,
        minted_at: ic_cdk::api::time(),
        meme_id,
        metadata,
        mime_type: Some(mime_type),
        has_image: true,
    };

    // Persist token record and indexes
    TOKENS.with(|t| t.borrow_mut().insert(SNat(token_id.clone()), rec));
    push_owner(stored_meme_data.owner, &token_id);
    MINT_INDEX.with(|mi| mi.borrow_mut().insert(meme_id, SNat(token_id.clone())));

    Ok(token_id)
}

#[update]
pub async fn mint_week_top3_from_voting(week_id: u64) -> Result<Vec<MintedPair>, String> {
    assert_admin();

    if WEEK_MINTED.with(|wm| wm.borrow().get(&week_id).unwrap_or(false)) {
        // already minted; proceed to recompute response
    }

    let voting_canister = ic_cdk::api::id();
    let winners = voting_get_top3_for_week(voting_canister, week_id).await?;
    if winners.is_empty() { return Ok(vec![]); }

    let mut minted: Vec<MintedPair> = Vec::new();
    for w in winners.into_iter() {
        let token_id = mint_to(w.meme_id).await?;
        // Fetch owner from token record
        let owner = TOKENS.with(|t| t.borrow().get(&SNat(token_id.clone())).map(|rec| rec.owner)).unwrap_or(Principal::anonymous());
        minted.push(MintedPair { meme_id: w.meme_id, token_id, owner });
    }

    WEEK_MINTED.with(|wm| wm.borrow_mut().insert(week_id, true));
    Ok(minted)
}
