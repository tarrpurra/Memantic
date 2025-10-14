// src/lib.rs
use candid::{CandidType, Decode, Encode, Nat, Principal};
use ic_cdk::api::time;
use ic_cdk_macros::{init, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::{Bound, Storable},
    DefaultMemoryImpl, StableBTreeMap,
};

use crate::{PublicStoredMeme, TopEntry};

use serde::{Deserialize, Serialize};
use std::{borrow::Cow, cell::RefCell};

// Import shared types (must exist in your crate)

pub type MemeId = u64;
pub type ListingId = u128;

// Re-use Nat as the public token identifier to remain backward compatible with the
// existing candid surface until a full ICRC-7 refactor lands. Internally we still
// treat it as a bigint so callers can downcast to u128 when needed.
// ---------- Stable memory ----------
type Mem = VirtualMemory<DefaultMemoryImpl>;

// ---------- Wrappers to implement Storable ----------
#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct SNat(pub Nat);

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct SPrincipal(pub Principal);

#[derive(Clone, Debug, Default, CandidType, Serialize, Deserialize)]
pub struct OwnerTokens(pub Vec<Nat>);

#[derive(Clone, Debug, CandidType, Serialize, Deserialize, PartialEq, Eq, PartialOrd, Ord)]
pub struct SListingId(pub ListingId);

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct ListingCounter(pub ListingId);

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
    const BOUND: Bound = Bound::Bounded {
        max_size: 64,
        is_fixed_size: false,
    };

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

impl Storable for SListingId {
    const BOUND: Bound = Bound::Bounded {
        max_size: 32,
        is_fixed_size: true,
    };

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode SListingId"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode SListingId")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, SListingId).expect("decode SListingId")
    }
}

impl Storable for ListingCounter {
    const BOUND: Bound = Bound::Bounded {
        max_size: 32,
        is_fixed_size: true,
    };

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode ListingCounter"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode ListingCounter")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, ListingCounter).expect("decode ListingCounter")
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
    pub total_supply: u128,
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
            total_supply: 0u128,
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

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct NftMetadata {
    pub name: String,
    pub symbol: String,
    pub description: Option<String>,
    pub royalty_bps: Option<u16>,
    pub external_url: Option<String>,
    pub attributes: Vec<(String, String)>,
    pub license: Option<String>,
    pub image_uri: String,
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
    pub minted_by: Principal,
    pub edition_number: Option<u32>,
    pub edition_size: Option<u32>,
    pub custom_metadata: Option<NftMetadata>,
}

#[derive(Clone, Debug, Default, CandidType, Serialize, Deserialize)]
pub struct TokenSaleMetadata {
    pub token_id: Nat,
    pub meme_id: u64,
    pub is_listed: bool,
    pub listing_price: Option<u128>,
    pub listed_quantity: u32,
    pub listed_at: Option<u64>,
    pub total_sales: u64,
    pub total_earned: u128,
    pub last_sale_price: Option<u128>,
    pub last_sale_at: Option<u64>,
    pub floor_price: Option<u128>,
    pub total_volume: u128,
    pub current_owner: Option<Principal>,
    pub ranking_hint: Option<u32>,
}

#[derive(Clone, Debug, Default, CandidType, Serialize, Deserialize)]
pub struct NftMarketInfo {
    pub listed: bool,
    pub listing_price: Option<u128>,
    pub listed_quantity: u32,
    pub total_volume: u128,
    pub floor_price: Option<u128>,
    pub last_sale_price: Option<u128>,
    pub last_sale_at: Option<u64>,
    pub total_sales: u64,
    pub ranking: Option<u32>,
    pub current_owner: Option<Principal>,
}

#[derive(Clone, CandidType, Deserialize)]
pub struct NftImage {
    pub mime_type: String,
    pub image: Vec<u8>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct SupportedStandard {
    pub name: String,
    pub url: String,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub enum MintingStatus {
    Single {
        token_id: Nat,
        metadata: NftMetadata,
    },
    Collection {
        token_ids: Vec<Nat>,
        edition_size: u32,
        metadata: NftMetadata,
    },
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MintingInfo {
    pub meme_id: MemeId,
    pub minted_by: Principal,
    pub minted_at: u64,
    pub status: MintingStatus,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct NftSummary {
    pub meme_id: MemeId,
    pub token_id: Nat,
    pub name: String,
    pub image_uri: String,
    pub is_collection: bool,
    pub edition_size: Option<u32>,
    pub owned_quantity: u32,
    pub market: NftMarketInfo,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct Listing {
    pub listing_id: ListingId,
    pub token_id: Nat,
    pub seller: Principal,
    pub unit_price: u128,
    pub quantity: u32,
    pub created_at_ns: u64,
    pub expires_at_ns: Option<u64>,
    pub active: bool,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct ListingRecord {
    pub listing: Listing,
    pub meme_id: MemeId,
    pub locked_token_ids: Vec<Nat>,
}

#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MarketplaceListing {
    pub listing: Listing,
    pub meme_id: MemeId,
    pub name: String,
    pub image_uri: String,
    pub is_collection: bool,
    pub edition_size: Option<u32>,
    pub market: NftMarketInfo,
}

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

impl Storable for TokenSaleMetadata {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode TokenSaleMetadata"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode TokenSaleMetadata")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, TokenSaleMetadata).expect("decode TokenSaleMetadata")
    }
}

impl Storable for MintingInfo {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode MintingInfo"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode MintingInfo")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, MintingInfo).expect("decode MintingInfo")
    }
}

impl Storable for ListingRecord {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode ListingRecord"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode ListingRecord")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, ListingRecord).expect("decode ListingRecord")
    }
}

thread_local! {
    static MEM_MGR: RefCell<MemoryManager<DefaultMemoryImpl>> =
        RefCell::new(MemoryManager::init(DefaultMemoryImpl::default()));

    static TOKENS: RefCell<StableBTreeMap<SNat, TokenRecord, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(0)))));

    static OWNER_INDEX: RefCell<StableBTreeMap<SPrincipal, OwnerTokens, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(1)))));

    static MINT_INDEX: RefCell<StableBTreeMap<MemeId, MintingInfo, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(2)))));

    static WEEK_MINTED: RefCell<StableBTreeMap<u64, bool, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(3)))));

    static STATE: RefCell<CollectionState> = RefCell::new(CollectionState::default());

    // NEW: store actual image bytes (ImageBlob wraps Vec<u8>)
    static STORED_IMAGES: RefCell<StableBTreeMap<u64, ImageBlob, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(4)))));

    static TOKEN_SALES: RefCell<StableBTreeMap<SNat, TokenSaleMetadata, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(5)))));

    static LISTINGS: RefCell<StableBTreeMap<SListingId, ListingRecord, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(6)))));

    static TOKEN_LISTING_INDEX: RefCell<StableBTreeMap<SNat, SListingId, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(7)))));

    static LISTING_SEQ: RefCell<StableBTreeMap<u8, ListingCounter, Mem>> =
        RefCell::new(StableBTreeMap::init(MEM_MGR.with(|m| m.borrow().get(MemoryId::new(8)))));
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
        st.name = args
            .as_ref()
            .and_then(|a| a.name.clone())
            .unwrap_or_else(|| "Mementic Top Memes".into());
        st.symbol = args
            .as_ref()
            .and_then(|a| a.symbol.clone())
            .unwrap_or_else(|| "MEME".into());
        st.description = args.as_ref().and_then(|a| a.description.clone());
        st.logo = args.as_ref().and_then(|a| a.logo.clone());
        st.admin = args.as_ref().and_then(|a| a.admin).unwrap_or(caller);
        st.total_supply = 0u128;
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

#[query]
pub fn get_admin() -> Principal {
    STATE.with(|s| s.borrow().admin)
}

// ---------- ICRC-7-ish queries ----------
#[query(name = "icrc7_name")]
pub fn icrc7_name() -> String {
    STATE.with(|s| s.borrow().name.clone())
}

#[query(name = "icrc7_symbol")]
pub fn icrc7_symbol() -> String {
    STATE.with(|s| s.borrow().symbol.clone())
}

#[query(name = "icrc7_total_supply")]
pub fn icrc7_total_supply() -> Nat {
    STATE.with(|s| Nat::from(s.borrow().total_supply))
}

#[query(name = "icrc7_supported_standards")]
pub fn icrc7_supported_standards() -> Vec<SupportedStandard> {
    vec![
        SupportedStandard {
            name: "ICRC-7".into(),
            url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-7".into(),
        },
        SupportedStandard {
            name: "ICRC-37".into(),
            url: "https://github.com/dfinity/ICRC/ICRCs/ICRC-37".into(),
        },
    ]
}

#[query(name = "icrc7_owner_of")]
pub fn icrc7_owner_of(token_ids: Vec<Nat>) -> Vec<Option<Principal>> {
    TOKENS.with(|t| {
        let map = t.borrow();
        token_ids
            .into_iter()
            .map(|id| map.get(&SNat(id)).map(|r| r.owner))
            .collect()
    })
}

#[query(name = "icrc7_tokens_of")]
pub fn icrc7_tokens_of(owner: Principal) -> Vec<Nat> {
    OWNER_INDEX.with(|idx| {
        idx.borrow()
            .get(&SPrincipal(owner))
            .map(|ot| ot.0.clone())
            .unwrap_or_default()
    })
}

#[query]
pub fn get_token(token_id: Nat) -> Option<TokenRecord> {
    TOKENS.with(|t| t.borrow().get(&SNat(token_id)))
}

#[query]
pub fn get_token_by_meme_id(meme_id: u64) -> Option<Nat> {
    MINT_INDEX.with(|m| {
        m.borrow()
            .get(&meme_id)
            .and_then(|info| match &info.status {
                MintingStatus::Single { token_id, .. } => Some(token_id.clone()),
                MintingStatus::Collection { token_ids, .. } => token_ids.first().cloned(),
            })
    })
}

#[query]
pub fn get_nft_image(token_id: Nat) -> Option<NftImage> {
    let rec_opt = TOKENS.with(|t| t.borrow().get(&SNat(token_id.clone())));
    let rec = rec_opt?;
    let mime = rec
        .mime_type
        .clone()
        .unwrap_or("application/octet-stream".to_string());
    let img_blob = STORED_IMAGES.with(|imgs| imgs.borrow().get(&rec.meme_id))?;
    Some(NftImage {
        mime_type: mime,
        image: img_blob.0.clone(),
    })
}

#[query]
pub fn get_sale_metadata(token_id: Nat) -> Option<TokenSaleMetadata> {
    TOKEN_SALES.with(|sales| sales.borrow().get(&SNat(token_id)))
}

#[query]
pub fn get_sale_metadata_for_meme(meme_id: u64) -> Option<TokenSaleMetadata> {
    let token_id = get_token_by_meme_id(meme_id)?;
    TOKEN_SALES.with(|sales| sales.borrow().get(&SNat(token_id)))
}

pub fn mutate_sale_metadata<F>(token_id: &Nat, meme_id: u64, mutator: F) -> TokenSaleMetadata
where
    F: FnOnce(&mut TokenSaleMetadata),
{
    TOKEN_SALES.with(|sales| {
        let mut map = sales.borrow_mut();
        let mut record = map
            .get(&SNat(token_id.clone()))
            .unwrap_or_else(|| TokenSaleMetadata {
                token_id: token_id.clone(),
                meme_id,
                ..Default::default()
            });
        record.token_id = token_id.clone();
        record.meme_id = meme_id;
        record.current_owner =
            TOKENS.with(|t| t.borrow().get(&SNat(token_id.clone())).map(|rec| rec.owner));
        let mut_record = &mut record;
        mutator(mut_record);
        if record.is_listed {
            record.floor_price = match record.floor_price {
                Some(existing) => Some(existing.min(record.listing_price.unwrap_or(existing))),
                None => record.listing_price,
            };
        }
        map.insert(SNat(token_id.clone()), record.clone());
        record
    })
}

fn collect_sale_metadata(token_ids: &[Nat]) -> Vec<TokenSaleMetadata> {
    TOKEN_SALES.with(|sales| {
        let map = sales.borrow();
        token_ids
            .iter()
            .filter_map(|token_id| map.get(&SNat(token_id.clone())))
            .collect()
    })
}

fn aggregate_market_info(token_ids: &[Nat]) -> NftMarketInfo {
    let sales = collect_sale_metadata(token_ids);
    let mut info = NftMarketInfo::default();
    let mut latest_sale_ts: Option<u64> = None;

    for sale in sales {
        if sale.is_listed {
            info.listed = true;
            if let Some(price) = sale.listing_price {
                info.listing_price = Some(match info.listing_price {
                    Some(existing) => existing.min(price),
                    None => price,
                });
            }
            info.listed_quantity = info.listed_quantity.saturating_add(sale.listed_quantity);
        }

        info.total_volume = info.total_volume.saturating_add(sale.total_volume);
        info.total_sales = info.total_sales.saturating_add(sale.total_sales);

        if let Some(floor) = sale.floor_price {
            info.floor_price = Some(match info.floor_price {
                Some(existing) => existing.min(floor),
                None => floor,
            });
        }

        if let Some(rank) = sale.ranking_hint {
            info.ranking = Some(match info.ranking {
                Some(existing) => existing.min(rank),
                None => rank,
            });
        }

        if let Some(price) = sale.last_sale_price {
            let ts = sale.last_sale_at.unwrap_or_default();
            match latest_sale_ts {
                Some(existing) if ts <= existing => {}
                _ => {
                    latest_sale_ts = Some(ts);
                    info.last_sale_price = Some(price);
                    info.last_sale_at = sale.last_sale_at;
                }
            }
        }

        if info.current_owner.is_none() {
            info.current_owner = sale.current_owner;
        }
    }

    info
}

// ---------- Internal helpers ----------
fn next_token_id() -> Nat {
    STATE.with(|s| {
        let mut st = s.borrow_mut();
        let tid = st.total_supply;
        st.total_supply = st.total_supply.saturating_add(1);
        Nat::from(tid)
    })
}

fn next_listing_id() -> ListingId {
    LISTING_SEQ.with(|seq| {
        let mut map = seq.borrow_mut();
        let mut counter = map.get(&0).unwrap_or(ListingCounter(0));
        let id = counter.0;
        counter.0 = counter.0.saturating_add(1);
        map.insert(0, counter.clone());
        id
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

fn remove_owner_token(owner: Principal, token_id: &Nat) {
    OWNER_INDEX.with(|idx| {
        let mut map = idx.borrow_mut();
        if let Some(mut list) = map.get(&SPrincipal(owner)) {
            list.0.retain(|t| t != token_id);
            map.insert(SPrincipal(owner), list);
        }
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

fn build_metadata(m: &PublicStoredMeme, token_id: &Nat) -> Vec<TokenMetadataEntry> {
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
                (
                    "meme:prompt".into(),
                    MetadataValue::Text(m.meme_data.prompt.clone()),
                ),
                (
                    "meme:caption".into(),
                    MetadataValue::Text(m.meme_data.caption.clone().unwrap_or_default()),
                ),
                (
                    "meme:filename".into(),
                    MetadataValue::Text(m.meme_data.image_filename.clone()),
                ),
                (
                    "meme:format".into(),
                    MetadataValue::Text(m.meme_data.image_format.clone()),
                ),
                (
                    "meme:service".into(),
                    MetadataValue::Text(m.meme_data.metadata.service.clone()),
                ),
                (
                    "meme:ai_timestamp_ns".into(),
                    MetadataValue::Text(m.meme_data.metadata.timestamp.to_string()),
                ),
                (
                    "meme:file_size_bytes".into(),
                    MetadataValue::Text(m.meme_data.metadata.file_size_bytes.to_string()),
                ),
                (
                    "meme:created_at_ns".into(),
                    MetadataValue::Text(m.created_at.to_string()),
                ),
                (
                    "meme:stored_at_ns".into(),
                    MetadataValue::Text(m.canister_timestamp.to_string()),
                ),
                (
                    "nft:token_id".into(),
                    MetadataValue::Text(token_id.to_string()),
                ),
            ]),
        },
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

fn enrich_with_custom_metadata(
    base: &mut Vec<TokenMetadataEntry>,
    custom: &NftMetadata,
    edition_number: Option<u32>,
    edition_size: Option<u32>,
) {
    base.push(TokenMetadataEntry {
        name: "nft:name".into(),
        immutable: true,
        value: MetadataValue::Text(custom.name.clone()),
    });
    base.push(TokenMetadataEntry {
        name: "nft:symbol".into(),
        immutable: true,
        value: MetadataValue::Text(custom.symbol.clone()),
    });
    if let Some(desc) = &custom.description {
        base.push(TokenMetadataEntry {
            name: "nft:description".into(),
            immutable: false,
            value: MetadataValue::Text(desc.clone()),
        });
    }
    if let Some(royalty) = custom.royalty_bps {
        base.push(TokenMetadataEntry {
            name: "nft:royalty_bps".into(),
            immutable: true,
            value: MetadataValue::Text(royalty.to_string()),
        });
    }
    if let Some(url) = &custom.external_url {
        base.push(TokenMetadataEntry {
            name: "nft:external_url".into(),
            immutable: false,
            value: MetadataValue::Text(url.clone()),
        });
    }
    if let Some(license) = &custom.license {
        base.push(TokenMetadataEntry {
            name: "nft:license".into(),
            immutable: false,
            value: MetadataValue::Text(license.clone()),
        });
    }

    if !custom.attributes.is_empty() {
        base.push(TokenMetadataEntry {
            name: "nft:attributes".into(),
            immutable: false,
            value: MetadataValue::Map(
                custom
                    .attributes
                    .iter()
                    .map(|(k, v)| (k.clone(), MetadataValue::Text(v.clone())))
                    .collect(),
            ),
        });
    }

    base.push(TokenMetadataEntry {
        name: "nft:image_uri".into(),
        immutable: true,
        value: MetadataValue::Text(custom.image_uri.clone()),
    });

    if let Some(number) = edition_number {
        base.push(TokenMetadataEntry {
            name: "nft:edition_number".into(),
            immutable: true,
            value: MetadataValue::Text(number.to_string()),
        });
    }

    if let Some(size) = edition_size {
        base.push(TokenMetadataEntry {
            name: "nft:edition_size".into(),
            immutable: true,
            value: MetadataValue::Text(size.to_string()),
        });
    }
}

fn token_is_locked(token_id: &Nat) -> bool {
    TOKEN_LISTING_INDEX.with(|idx| idx.borrow().get(&SNat(token_id.clone())).is_some())
}

fn lock_tokens(listing_id: ListingId, token_ids: &[Nat]) {
    TOKEN_LISTING_INDEX.with(|idx| {
        let mut map = idx.borrow_mut();
        for token_id in token_ids {
            map.insert(SNat(token_id.clone()), SListingId(listing_id));
        }
    });
}

fn unlock_tokens(token_ids: &[Nat]) {
    TOKEN_LISTING_INDEX.with(|idx| {
        let mut map = idx.borrow_mut();
        for token_id in token_ids {
            map.remove(&SNat(token_id.clone()));
        }
    });
}

fn metadata_for_meme(meme_id: MemeId) -> Option<(NftMetadata, Vec<Nat>, bool, Option<u32>)> {
    MINT_INDEX.with(|index| {
        index.borrow().get(&meme_id).map(|info| match &info.status {
            MintingStatus::Single { token_id, metadata } => {
                (metadata.clone(), vec![token_id.clone()], false, None)
            }
            MintingStatus::Collection {
                token_ids,
                edition_size,
                metadata,
            } => (
                metadata.clone(),
                token_ids.clone(),
                true,
                Some(*edition_size),
            ),
        })
    })
}

fn owned_unlocked_tokens(meme_id: MemeId, owner: Principal) -> Vec<Nat> {
    MINT_INDEX.with(|index| {
        index
            .borrow()
            .get(&meme_id)
            .map(|info| match info.status {
                MintingStatus::Single { ref token_id, .. } => {
                    let is_owner = TOKENS
                        .with(|t| t.borrow().get(&SNat(token_id.clone())).map(|rec| rec.owner))
                        .map(|principal| principal == owner)
                        .unwrap_or(false);
                    if is_owner && !token_is_locked(token_id) {
                        vec![token_id.clone()]
                    } else {
                        vec![]
                    }
                }
                MintingStatus::Collection { ref token_ids, .. } => token_ids
                    .iter()
                    .filter(|tid| {
                        TOKENS
                            .with(|t| t.borrow().get(&SNat((*tid).clone())).map(|rec| rec.owner))
                            .map(|principal| principal == owner)
                            .unwrap_or(false)
                            && !token_is_locked(tid)
                    })
                    .cloned()
                    .collect(),
            })
            .unwrap_or_default()
    })
}

fn acquire_tokens_for_listing(
    meme_id: MemeId,
    owner: Principal,
    count: u32,
) -> Result<Vec<Nat>, String> {
    let available = owned_unlocked_tokens(meme_id, owner);
    if count as usize > available.len() {
        return Err("Insufficient quantity owned".into());
    }
    Ok(available.into_iter().take(count as usize).collect())
}

fn mark_tokens_unlisted(meme_id: MemeId, tokens: &[Nat]) {
    for token_id in tokens {
        mutate_sale_metadata(token_id, meme_id, |sale| {
            sale.is_listed = false;
            sale.listing_price = None;
            sale.listed_quantity = 0;
        });
    }
    unlock_tokens(tokens);
}

// ---------- X-canister clients ----------
async fn voting_get_top3_for_week(
    voting_canister: Principal,
    week_id: u64,
) -> Result<Vec<TopEntry>, String> {
    use ic_cdk::api::call::call;
    call::<(u64,), (Result<Vec<TopEntry>, String>,)>(
        voting_canister,
        "get_top3_for_week",
        (week_id,),
    )
    .await
    .map(|(res,)| res)
    .map_err(|e| format!("get_top3_for_week call failed: {:?}", e))?
}

async fn voting_get_meme_data(
    voting_canister: Principal,
    meme_id: u64,
) -> Result<Option<PublicStoredMeme>, String> {
    use ic_cdk::api::call::call;
    call::<(u64,), (Option<PublicStoredMeme>,)>(voting_canister, "get_meme", (meme_id,))
        .await
        .map(|(res,)| res)
        .map_err(|e| format!("get_meme call failed: {:?}", e))
}

async fn ensure_image_cached(meme: &PublicStoredMeme) -> Result<String, String> {
    let meme_id = meme.id;
    let mime_type = guess_content_type(&meme.meme_data.image_format)
        .unwrap_or_else(|| "application/octet-stream".into());

    let already_cached = STORED_IMAGES.with(|imgs| imgs.borrow().contains_key(&meme_id));
    if already_cached {
        return Ok(mime_type);
    }

    let image_bytes =
        match crate::http_outcall::fetch_image_bytes_from_image_storage(&meme.meme_data.image_url)
            .await
        {
            Ok(bytes) => bytes,
            Err(e) => {
                return Err(format!(
                    "failed to fetch image for meme {} : {}",
                    meme_id, e
                ))
            }
        };

    STORED_IMAGES.with(|imgs| {
        imgs.borrow_mut().insert(meme_id, ImageBlob(image_bytes));
    });

    Ok(mime_type)
}

// ---------- Public: mint Top-3 (now fetches image bytes before minting) ----------
#[derive(Clone, Debug, CandidType, Serialize, Deserialize)]
pub struct MintedPair {
    pub meme_id: u64,
    pub token_id: Nat,
    pub owner: Principal,
}

async fn mint_tokens_internal(
    meme: &PublicStoredMeme,
    owner: Principal,
    minted_by: Principal,
    metadata: &NftMetadata,
    edition_count: u32,
) -> Result<Vec<Nat>, String> {
    if edition_count == 0 {
        return Err("Edition count must be greater than zero".into());
    }

    if MINT_INDEX.with(|index| index.borrow().contains_key(&meme.id)) {
        return Err("Meme has already been minted".into());
    }

    let mime_type = ensure_image_cached(meme).await?;
    let minted_at = ic_cdk::api::time();
    let ranking_hint = crate::voting::get_rank_for_meme(meme.id);

    let mut minted_tokens = Vec::new();
    for edition in 0..edition_count {
        let token_id = next_token_id();
        let mut token_metadata = build_metadata(meme, &token_id);
        token_metadata.push(TokenMetadataEntry {
            name: "icrc7:metadata:content_type".into(),
            immutable: true,
            value: MetadataValue::Text(mime_type.clone()),
        });
        enrich_with_custom_metadata(
            &mut token_metadata,
            metadata,
            if edition_count > 1 {
                Some(edition + 1)
            } else {
                None
            },
            if edition_count > 1 {
                Some(edition_count)
            } else {
                None
            },
        );

        let record = TokenRecord {
            token_id: token_id.clone(),
            owner,
            minted_at,
            meme_id: meme.id,
            metadata: token_metadata,
            mime_type: Some(mime_type.clone()),
            has_image: true,
            minted_by,
            edition_number: if edition_count > 1 {
                Some(edition + 1)
            } else {
                None
            },
            edition_size: if edition_count > 1 {
                Some(edition_count)
            } else {
                None
            },
            custom_metadata: Some(metadata.clone()),
        };

        TOKENS.with(|t| t.borrow_mut().insert(SNat(token_id.clone()), record));
        push_owner(owner, &token_id);
        mutate_sale_metadata(&token_id, meme.id, |sale| {
            sale.current_owner = Some(owner);
            sale.ranking_hint = ranking_hint;
        });

        minted_tokens.push(token_id);
    }

    let status = if edition_count == 1 {
        MintingStatus::Single {
            token_id: minted_tokens
                .first()
                .cloned()
                .unwrap_or_else(|| Nat::from(0u32)),
            metadata: metadata.clone(),
        }
    } else {
        MintingStatus::Collection {
            token_ids: minted_tokens.clone(),
            edition_size: edition_count,
            metadata: metadata.clone(),
        }
    };

    MINT_INDEX.with(|index| {
        index.borrow_mut().insert(
            meme.id,
            MintingInfo {
                meme_id: meme.id,
                minted_by,
                minted_at,
                status,
            },
        );
    });

    Ok(minted_tokens)
}

#[update]
async fn mint_to(meme_id: u64) -> Result<Nat, String> {
    // Legacy helper kept for compatibility with existing finalize flow.
    let voting_canister = ic_cdk::api::id();
    let stored_meme_data = voting_get_meme_data(voting_canister, meme_id)
        .await?
        .ok_or_else(|| format!("StoredMeme {} not found in voting canister", meme_id))?;

    let auto_meta = NftMetadata {
        name: format!("Mementic Meme #{}", meme_id),
        symbol: "MEME".into(),
        description: stored_meme_data
            .meme_data
            .caption
            .clone()
            .or_else(|| Some("Weekly winner meme".into())),
        royalty_bps: Some(0),
        external_url: Some(stored_meme_data.meme_data.image_url.clone()),
        attributes: vec![
            ("prompt".into(), stored_meme_data.meme_data.prompt.clone()),
            (
                "service".into(),
                stored_meme_data.meme_data.metadata.service.clone(),
            ),
        ],
        license: None,
        image_uri: stored_meme_data.meme_data.image_url.clone(),
    };

    let token_ids = mint_tokens_internal(
        &stored_meme_data,
        stored_meme_data.owner,
        stored_meme_data.owner,
        &auto_meta,
        1,
    )
    .await?;
    Ok(token_ids
        .first()
        .cloned()
        .unwrap_or_else(|| Nat::from(0u32)))
}

#[update]
pub async fn mint_single_nft(meme_id: MemeId, meta: NftMetadata) -> Result<Nat, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".into());
    }

    if !crate::voting::is_winner(meme_id) {
        return Err("Only weekly winners can be minted".into());
    }

    if MINT_INDEX.with(|index| index.borrow().contains_key(&meme_id)) {
        return Err("Meme has already been minted".into());
    }

    let meme = crate::get_meme(meme_id).ok_or("Meme not found")?;
    if meme.owner != caller {
        return Err("Only the meme owner can mint".into());
    }

    if meta.name.trim().is_empty() {
        return Err("NFT name is required".into());
    }

    let token_ids = mint_tokens_internal(&meme, caller, caller, &meta, 1).await?;
    Ok(token_ids
        .first()
        .cloned()
        .unwrap_or_else(|| Nat::from(0u32)))
}

#[update]
pub async fn mint_collection_nft(
    meme_id: MemeId,
    edition_count: u32,
    meta: NftMetadata,
) -> Result<Vec<Nat>, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".into());
    }

    if edition_count == 0 {
        return Err("Edition count must be at least 1".into());
    }

    if edition_count > 10_000 {
        return Err("Edition count too large".into());
    }

    if !crate::voting::is_winner(meme_id) {
        return Err("Only weekly winners can be minted".into());
    }

    if MINT_INDEX.with(|index| index.borrow().contains_key(&meme_id)) {
        return Err("Meme has already been minted".into());
    }

    let meme = crate::get_meme(meme_id).ok_or("Meme not found")?;
    if meme.owner != caller {
        return Err("Only the meme owner can mint".into());
    }

    if meta.name.trim().is_empty() {
        return Err("NFT name is required".into());
    }

    mint_tokens_internal(&meme, caller, caller, &meta, edition_count).await
}

#[update]
pub async fn mint_week_top3_from_voting(week_id: u64) -> Result<Vec<MintedPair>, String> {
    assert_admin();

    if WEEK_MINTED.with(|wm| wm.borrow().get(&week_id).unwrap_or(false)) {
        // already minted; proceed to recompute response
    }

    let voting_canister = ic_cdk::api::id();
    let winners = voting_get_top3_for_week(voting_canister, week_id).await?;
    if winners.is_empty() {
        return Ok(vec![]);
    }

    let mut minted: Vec<MintedPair> = Vec::new();
    for w in winners.into_iter() {
        let token_id = mint_to(w.meme_id).await?;
        // Fetch owner from token record
        let owner = TOKENS
            .with(|t| t.borrow().get(&SNat(token_id.clone())).map(|rec| rec.owner))
            .unwrap_or(Principal::anonymous());
        minted.push(MintedPair {
            meme_id: w.meme_id,
            token_id,
            owner,
        });
    }

    WEEK_MINTED.with(|wm| wm.borrow_mut().insert(week_id, true));
    Ok(minted)
}

#[query]
pub fn my_minted_nfts(owner: Option<Principal>) -> Vec<NftSummary> {
    let target = owner.unwrap_or_else(ic_cdk::caller);
    if target == Principal::anonymous() {
        return vec![];
    }

    MINT_INDEX.with(|index| {
        index
            .borrow()
            .iter()
            .filter_map(|entry| {
                let info = entry.value();
                if info.minted_by != target {
                    return None;
                }

                match &info.status {
                    MintingStatus::Single { token_id, metadata } => {
                        let owned = TOKENS
                            .with(|t| t.borrow().get(&SNat(token_id.clone())))
                            .map(|rec| if rec.owner == target { 1 } else { 0 })
                            .unwrap_or(0);
                        let market = aggregate_market_info(&[token_id.clone()]);
                        Some(NftSummary {
                            meme_id: info.meme_id,
                            token_id: token_id.clone(),
                            name: metadata.name.clone(),
                            image_uri: metadata.image_uri.clone(),
                            is_collection: false,
                            edition_size: None,
                            owned_quantity: owned,
                            market,
                        })
                    }
                    MintingStatus::Collection {
                        token_ids,
                        edition_size,
                        metadata,
                    } => {
                        let owned = token_ids
                            .iter()
                            .filter(|tid| {
                                TOKENS
                                    .with(|t| {
                                        t.borrow().get(&SNat((**tid).clone())).map(|rec| rec.owner)
                                    })
                                    .map(|principal| principal == target)
                                    .unwrap_or(false)
                            })
                            .count() as u32;
                        let first_token = token_ids
                            .first()
                            .cloned()
                            .unwrap_or_else(|| Nat::from(0u32));
                        let market = aggregate_market_info(token_ids);
                        Some(NftSummary {
                            meme_id: info.meme_id,
                            token_id: first_token,
                            name: metadata.name.clone(),
                            image_uri: metadata.image_uri.clone(),
                            is_collection: true,
                            edition_size: Some(*edition_size),
                            owned_quantity: owned,
                            market,
                        })
                    }
                }
            })
            .collect()
    })
}

fn assert_token_owner(token_id: &Nat, owner: Principal) -> Result<TokenRecord, String> {
    TOKENS
        .with(|t| t.borrow().get(&SNat(token_id.clone())))
        .ok_or_else(|| "Token not found".into())
        .and_then(|record| {
            if record.owner != owner {
                Err("Caller does not own the requested token".into())
            } else {
                Ok(record)
            }
        })
}

fn refresh_listing_metadata(record: &ListingRecord) {
    for token_id in &record.locked_token_ids {
        mutate_sale_metadata(token_id, record.meme_id, |sale| {
            if record.listing.active {
                sale.is_listed = true;
                sale.listing_price = Some(record.listing.unit_price);
                sale.listed_quantity = record.listing.quantity;
                sale.listed_at = Some(record.listing.created_at_ns);
            } else {
                sale.is_listed = false;
                sale.listing_price = None;
                sale.listed_quantity = 0;
            }
        });
    }
}

#[update]
pub fn list_for_sale(
    token_id: Nat,
    unit_price: u128,
    quantity: u32,
    expires_at_ns: Option<u64>,
) -> Result<ListingId, String> {
    let caller = ic_cdk::caller();
    if caller == Principal::anonymous() {
        return Err("Authentication required".into());
    }
    if unit_price == 0 {
        return Err("Price must be greater than zero".into());
    }
    if quantity == 0 {
        return Err("Quantity must be at least one".into());
    }

    let token = assert_token_owner(&token_id, caller.clone())?;
    if token_is_locked(&token_id) {
        return Err("Token already listed".into());
    }

    let available_tokens = owned_unlocked_tokens(token.meme_id, caller);
    let is_collection = token.edition_size.unwrap_or(1) > 1;

    let selected: Vec<Nat> = if is_collection {
        if quantity as usize > available_tokens.len() {
            return Err("Insufficient quantity owned".into());
        }
        available_tokens
            .into_iter()
            .take(quantity as usize)
            .collect()
    } else {
        if quantity != 1 {
            return Err("Single NFT listings must use quantity 1".into());
        }
        if !available_tokens.iter().any(|tid| tid == &token_id) {
            return Err("Token is not available to list".into());
        }
        vec![token_id.clone()]
    };

    let listing_id = next_listing_id();
    let now = ic_cdk::api::time();
    let listing = Listing {
        listing_id,
        token_id: token_id.clone(),
        seller: ic_cdk::caller(),
        unit_price,
        quantity: selected.len() as u32,
        created_at_ns: now,
        expires_at_ns,
        active: true,
    };

    let record = ListingRecord {
        listing,
        meme_id: token.meme_id,
        locked_token_ids: selected.clone(),
    };

    LISTINGS.with(|listings| {
        listings
            .borrow_mut()
            .insert(SListingId(listing_id), record.clone());
    });

    lock_tokens(listing_id, &selected);
    refresh_listing_metadata(&record);

    Ok(listing_id)
}

#[update]
pub fn update_listing(
    listing_id: ListingId,
    new_unit_price: Option<u128>,
    new_quantity: Option<u32>,
    new_expires_at_ns: Option<u64>,
) -> Result<(), String> {
    let caller = ic_cdk::caller();
    LISTINGS.with(|listings| {
        let mut map = listings.borrow_mut();
        let mut record = map
            .get(&SListingId(listing_id))
            .ok_or_else(|| "Listing not found".to_string())?;

        if record.listing.seller != caller {
            return Err("Only the seller can update the listing".into());
        }
        if !record.listing.active {
            return Err("Listing is no longer active".into());
        }

        if let Some(price) = new_unit_price {
            if price == 0 {
                return Err("Price must be greater than zero".into());
            }
            record.listing.unit_price = price;
        }

        if let Some(expiry) = new_expires_at_ns {
            record.listing.expires_at_ns = Some(expiry);
        }

        if let Some(qty) = new_quantity {
            if qty == 0 {
                return Err("Quantity must be at least one".into());
            }

            if qty < record.listing.quantity {
                let to_release = (record.listing.quantity - qty) as usize;
                let released = record
                    .locked_token_ids
                    .split_off(record.locked_token_ids.len() - to_release);
                mark_tokens_unlisted(record.meme_id, &released);
                record.listing.quantity = qty;
            } else if qty > record.listing.quantity {
                let additional = qty - record.listing.quantity;
                let extra_tokens = acquire_tokens_for_listing(record.meme_id, caller, additional)?;
                lock_tokens(listing_id, &extra_tokens);
                record.locked_token_ids.extend(extra_tokens);
                record.listing.quantity = qty;
            }
        }

        refresh_listing_metadata(&record);
        map.insert(SListingId(listing_id), record);
        Ok(())
    })
}

#[update]
pub fn cancel_listing(listing_id: ListingId) -> Result<(), String> {
    let caller = ic_cdk::caller();
    LISTINGS.with(|listings| {
        let mut map = listings.borrow_mut();
        let mut record = map
            .get(&SListingId(listing_id))
            .ok_or_else(|| "Listing not found".to_string())?;

        if record.listing.seller != caller {
            return Err("Only the seller can cancel the listing".into());
        }
        if !record.listing.active {
            return Ok(());
        }

        record.listing.active = false;
        record.listing.quantity = 0;
        mark_tokens_unlisted(record.meme_id, &record.locked_token_ids);
        record.locked_token_ids.clear();
        refresh_listing_metadata(&record);
        map.insert(SListingId(listing_id), record);
        Ok(())
    })
}

fn transfer_token(token_id: &Nat, from: Principal, to: Principal, meme_id: MemeId) {
    TOKENS.with(|tokens| {
        let mut map = tokens.borrow_mut();
        if let Some(mut rec) = map.get(&SNat(token_id.clone())) {
            rec.owner = to;
            map.insert(SNat(token_id.clone()), rec);
        }
    });
    remove_owner_token(from, token_id);
    push_owner(to, token_id);
    mutate_sale_metadata(token_id, meme_id, |sale| {
        sale.current_owner = Some(to);
        sale.is_listed = false;
        sale.listing_price = None;
        sale.listed_quantity = 0;
        sale.total_sales = sale.total_sales.saturating_add(1);
    });
}

#[update]
pub fn buy(listing_id: ListingId, quantity: u32) -> Result<(), String> {
    if quantity == 0 {
        return Err("Quantity must be at least one".into());
    }
    let buyer = ic_cdk::caller();
    if buyer == Principal::anonymous() {
        return Err("Authentication required".into());
    }

    LISTINGS.with(|listings| {
        let mut map = listings.borrow_mut();
        let mut record = map
            .get(&SListingId(listing_id))
            .ok_or_else(|| "Listing not found".to_string())?;

        if !record.listing.active {
            return Err("Listing is no longer active".into());
        }

        if let Some(expiry) = record.listing.expires_at_ns {
            if ic_cdk::api::time() > expiry {
                record.listing.active = false;
                mark_tokens_unlisted(record.meme_id, &record.locked_token_ids);
                record.locked_token_ids.clear();
                map.insert(SListingId(listing_id), record);
                return Err("Listing has expired".into());
            }
        }

        if quantity > record.listing.quantity {
            return Err("Not enough quantity remaining".into());
        }

        let seller = record.listing.seller;
        if buyer == seller {
            return Err("Cannot purchase your own listing".into());
        }

        let now = ic_cdk::api::time();
        let mut transferred = Vec::new();
        for _ in 0..quantity {
            if let Some(token_id) = record.locked_token_ids.pop() {
                transfer_token(&token_id, seller, buyer, record.meme_id);
                TOKEN_LISTING_INDEX.with(|idx| idx.borrow_mut().remove(&SNat(token_id.clone())));
                mutate_sale_metadata(&token_id, record.meme_id, |sale| {
                    sale.last_sale_at = Some(now);
                    sale.last_sale_price = Some(record.listing.unit_price);
                    sale.total_earned = sale.total_earned.saturating_add(record.listing.unit_price);
                    sale.total_volume = sale.total_volume.saturating_add(record.listing.unit_price);
                });
                transferred.push(token_id);
            }
        }

        record.listing.quantity = record.listing.quantity.saturating_sub(quantity);
        if record.listing.quantity == 0 {
            record.listing.active = false;
        }

        refresh_listing_metadata(&record);
        map.insert(SListingId(listing_id), record);

        Ok(())
    })
}

fn collect_active_listings() -> Vec<ListingRecord> {
    LISTINGS.with(|listings| {
        listings
            .borrow()
            .iter()
            .filter_map(|entry| {
                let record = entry.value();
                if !record.listing.active {
                    return None;
                }
                if let Some(expiry) = record.listing.expires_at_ns {
                    if ic_cdk::api::time() > expiry {
                        return None;
                    }
                }
                Some(record)
            })
            .collect()
    })
}

fn build_marketplace_listing(record: &ListingRecord) -> Option<MarketplaceListing> {
    let (metadata, token_ids, is_collection, edition_size) = metadata_for_meme(record.meme_id)?;
    let market = aggregate_market_info(&token_ids);
    Some(MarketplaceListing {
        listing: record.listing.clone(),
        meme_id: record.meme_id,
        name: metadata.name,
        image_uri: metadata.image_uri,
        is_collection,
        edition_size,
        market,
    })
}

#[query]
pub fn show_all_nfts_for_sale(offset: u64, limit: u32) -> Vec<MarketplaceListing> {
    let listings = collect_active_listings();
    let start = offset as usize;
    listings
        .into_iter()
        .skip(start)
        .take(limit as usize)
        .filter_map(|record| build_marketplace_listing(&record))
        .collect()
}

#[query]
pub fn get_user_listings(user: Option<Principal>) -> Vec<MarketplaceListing> {
    let target = user.unwrap_or_else(ic_cdk::caller);
    if target == Principal::anonymous() {
        return vec![];
    }
    collect_active_listings()
        .into_iter()
        .filter(|record| record.listing.seller == target)
        .filter_map(|record| build_marketplace_listing(&record))
        .collect()
}
