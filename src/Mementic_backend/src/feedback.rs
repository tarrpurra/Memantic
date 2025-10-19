// src/feedback.rs
use candid::{CandidType, Decode, Encode, Principal};
use ic_cdk::{api::time, caller};
use ic_cdk_macros::{init, post_upgrade, query, update};
use ic_stable_structures::{
    memory_manager::{MemoryId, MemoryManager, VirtualMemory},
    storable::{Bound, Storable},
    DefaultMemoryImpl, StableBTreeMap,
};
use serde::{Deserialize, Serialize};
use std::{borrow::Cow, cell::RefCell};

// ---------- Stable memory ----------
type Mem = VirtualMemory<DefaultMemoryImpl>;

// ---------- Data structures ----------

#[derive(Clone, Debug, Serialize, Deserialize, CandidType)]
pub struct Feedback {
    pub id: u64,
    pub user_principal: Principal,
    pub name: String,
    pub likes: String,
    pub dislikes: String,
    pub suggestions: String,
    pub will_return: bool,
    pub timestamp: u64,
    pub is_approved: bool, // For moderation
}

impl Storable for Feedback {
    const BOUND: Bound = Bound::Unbounded;

    fn to_bytes(&self) -> Cow<[u8]> {
        Cow::Owned(candid::Encode!(&self).expect("encode Feedback"))
    }

    fn into_bytes(self) -> Vec<u8> {
        candid::Encode!(&self).expect("encode Feedback")
    }

    fn from_bytes(bytes: Cow<[u8]>) -> Self {
        candid::Decode!(&bytes, Feedback).unwrap_or_else(|_| Feedback {
            id: 0,
            user_principal: Principal::anonymous(),
            name: String::new(),
            likes: String::new(),
            dislikes: String::new(),
            suggestions: String::new(),
            will_return: false,
            timestamp: 0,
            is_approved: false,
        })
    }
}

thread_local! {
    // CRITICAL: Use shared MEMORY_MANAGER from state module to prevent memory corruption
    // key = feedback_id, val = Feedback
    static FEEDBACK: RefCell<StableBTreeMap<u64, Feedback, Mem>> =
        RefCell::new(StableBTreeMap::init(
            crate::state::MEMORY_MANAGER.with(|m| m.borrow().get(MemoryId::new(70)))
        ));

    // Counter for feedback IDs
    static NEXT_FEEDBACK_ID: RefCell<u64> = RefCell::new(1);
}

// ---------- Initialization ----------

/// Initialize feedback system (no sample data)
pub fn init_feedback_data() {
    // Initialize without sample data - only real user feedback will be shown
}

// ---------- Main feedback functions ----------

/// Submit feedback from a user
#[update]
pub fn submit_feedback(
    name: String,
    likes: String,
    dislikes: String,
    suggestions: String,
    will_return: bool,
) -> Result<String, String> {
    let user = caller();

    if user == Principal::anonymous() {
        return Err("Authentication required to submit feedback".into());
    }

    // Basic validation
    if name.trim().is_empty() {
        return Err("Name is required".into());
    }

    if likes.trim().is_empty() && dislikes.trim().is_empty() && suggestions.trim().is_empty() {
        return Err("Please provide at least one piece of feedback".into());
    }

    let feedback_id = NEXT_FEEDBACK_ID.with(|id| {
        let current = *id.borrow();
        *id.borrow_mut() = current + 1;
        current
    });

    let feedback = Feedback {
        id: feedback_id,
        user_principal: user,
        name: name.trim().to_string(),
        likes: likes.trim().to_string(),
        dislikes: dislikes.trim().to_string(),
        suggestions: suggestions.trim().to_string(),
        will_return,
        timestamp: time(),
        is_approved: true, // Auto-approve for immediate display on landing page
    };

    FEEDBACK.with(|f| {
        f.borrow_mut().insert(feedback_id, feedback);
    });

    Ok(format!(
        "Feedback submitted successfully with ID: {}",
        feedback_id
    ))
}

/// Get all approved feedback for public display
#[query]
pub fn get_approved_feedback(limit: Option<u32>) -> Vec<Feedback> {
    let lim = limit.unwrap_or(10).min(50) as usize;

    FEEDBACK.with(|f| {
        let feedback_map = f.borrow();
        let mut approved_feedback: Vec<Feedback> = feedback_map
            .iter()
            .filter_map(|entry| {
                let feedback = entry.value();
                if feedback.is_approved {
                    Some(feedback)
                } else {
                    None
                }
            })
            .collect();

        // Sort by timestamp descending (newest first)
        approved_feedback.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        // Limit results
        if approved_feedback.len() > lim {
            approved_feedback.truncate(lim);
        }

        approved_feedback
    })
}

/// Get all feedback (admin function)
#[query]
pub fn get_all_feedback() -> Vec<Feedback> {
    let caller = ic_cdk::caller();
    let admin = crate::nft_module::get_admin();
    if caller != admin {
        ic_cdk::trap("Unauthorized: admin only");
    }

    FEEDBACK.with(|f| {
        let feedback_map = f.borrow();
        let mut all_feedback: Vec<Feedback> =
            feedback_map.iter().map(|entry| entry.value()).collect();

        // Sort by timestamp descending
        all_feedback.sort_by(|a, b| b.timestamp.cmp(&a.timestamp));

        all_feedback
    })
}

/// Approve feedback for public display (admin function)
#[update]
pub fn approve_feedback(feedback_id: u64) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let admin = crate::nft_module::get_admin();
    if caller != admin {
        return Err("Admin access required".to_string());
    }

    FEEDBACK.with(|f| {
        let mut feedback_map = f.borrow_mut();
        if let Some(mut feedback) = feedback_map.get(&feedback_id) {
            feedback.is_approved = true;
            feedback_map.insert(feedback_id, feedback);
            Ok(format!("Feedback {} approved for display", feedback_id))
        } else {
            Err(format!("Feedback {} not found", feedback_id))
        }
    })
}

/// Delete feedback (admin function)
#[update]
pub fn delete_feedback(feedback_id: u64) -> Result<String, String> {
    let caller = ic_cdk::caller();
    let admin = crate::nft_module::get_admin();
    if caller != admin {
        return Err("Admin access required".to_string());
    }

    FEEDBACK.with(|f| {
        let mut feedback_map = f.borrow_mut();
        if feedback_map.contains_key(&feedback_id) {
            feedback_map.remove(&feedback_id);
            Ok(format!("Feedback {} deleted", feedback_id))
        } else {
            Err(format!("Feedback {} not found", feedback_id))
        }
    })
}

/// Get feedback statistics
#[query]
pub fn get_feedback_stats() -> (u32, u32, f64) {
    FEEDBACK.with(|f| {
        let feedback_map = f.borrow();
        let total_feedback = feedback_map.len() as u32;
        let approved_feedback = feedback_map
            .iter()
            .filter(|entry| entry.value().is_approved)
            .count() as u32;

        let return_rate = if total_feedback > 0 {
            let return_count = feedback_map
                .iter()
                .filter(|entry| entry.value().will_return)
                .count() as f64;
            (return_count / total_feedback as f64) * 100.0
        } else {
            0.0
        };

        (total_feedback, approved_feedback, return_rate)
    })
}
