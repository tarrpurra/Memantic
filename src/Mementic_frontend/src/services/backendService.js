import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import { idlFactory } from "../../../declarations/mementic_backend";
import { getAgentHost, getIdentityProvider, isDevMode, Id } from "../config/environment";

/**
 * Backend Service for Mementic
 * Handles IC canister communication, authentication, and meme operations
 */
class BackendService {
  constructor() {
    this.agent = null;
    this.actor = null;
    this.authClient = null;
    this.isAuthenticated = false;
    this.initialized = false;
    this._initPromise = null;
  }

  /**
   * Initialize the backend service
   */
  async initialize() {
    if (this.initialized) return true;
    if (this._initPromise) return this._initPromise;

    this._initPromise = this._initializeService();
    return this._initPromise.finally(() => (this._initPromise = null));
  }

  async _initializeService() {
    try {
      // Check if declarations are available
      if (!idlFactory || !Id) {
        throw new Error("Backend declarations not available. Please check your build configuration.");
      }

      // Check if storage is available (important for incognito/private browsing)
      const isStorageAvailable = this._checkStorageAvailability();
      if (!isStorageAvailable) {
        console.warn("Storage is not available (possibly incognito mode). Authentication will be limited.");
        // Create a minimal auth client that won't try to access storage
        this.authClient = {
          login: () => Promise.reject(new Error("Storage not available. Please disable incognito/private browsing mode.")),
          logout: () => Promise.resolve(),
          isAuthenticated: () => Promise.resolve(false),
          getIdentity: () => ({ getPrincipal: () => ({ toText: () => "2vxsx-fae" }) }),
        };
      } else {
        // Create auth client normally - allow it to restore identity from storage
        this.authClient = await AuthClient.create();
      }

      // Check if user is already authenticated (restored from storage)
      if (isStorageAvailable) {
        const isAlreadyAuth = await this.authClient.isAuthenticated();
        console.log("Checking for stored authentication:", isAlreadyAuth);

        if (isAlreadyAuth) {
          console.log("Found stored authentication, setting up authenticated agent");
          await this._setupAuthenticatedAgent();
        } else {
          console.log("No stored authentication found, setting up anonymous agent");
          await this._setupAnonymousAgent();
        }
      } else {
        console.log("Storage not available, setting up anonymous agent");
        await this._setupAnonymousAgent();
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Backend service initialization failed:", error);
      // If it's a storage-related error, provide a more helpful message
      if (error.message && (error.message.includes('anchor_number') || error.message.includes('storage'))) {
        throw new Error("Authentication failed: Storage access is required. Please disable incognito/private browsing mode and try again.");
      }
      // If it's a declarations error, provide a helpful message
      if (error.message && error.message.includes('declarations')) {
        throw new Error("Backend configuration error. Please check that the canister is properly deployed and declarations are generated.");
      }
      throw error;
    }
  }

  /**
   * Ensure service is ready before making calls
   */
  async ensureReady() {
    if (this.initialized && this.actor) return true;
    return this.initialize();
  }

  /**
   * Check if localStorage and sessionStorage are available
   * This is important for incognito/private browsing modes
   */
  _checkStorageAvailability() {
    try {
      const testKey = '__storage_test__';
      localStorage.setItem(testKey, 'test');
      localStorage.removeItem(testKey);
      sessionStorage.setItem(testKey, 'test');
      sessionStorage.removeItem(testKey);
      return true;
    } catch (error) {
      return false;
    }
  }

  /**
   * Create a properly configured agent for development
    */
   async _createAgent(identity = null) {
     console.log("Creating agent with host:", getAgentHost());
     console.log("Development mode:", isDevMode());

     // Determine the identity to use
     let finalIdentity = identity;
     if (!finalIdentity) {
       finalIdentity = this.authClient.getIdentity();
       console.log("Using anonymous identity:", finalIdentity.getPrincipal().toString());
     } else {
       console.log("Using provided identity:", finalIdentity.getPrincipal().toString());
     }

     const agentOptions = {
       host: getAgentHost(),
       identity: finalIdentity,
     };
     console.log("Agent options:", agentOptions);

     // Create the agent
     const agent = new HttpAgent(agentOptions);

     // CRITICAL: For development, we must fetch the root key
     if (isDevMode()) {
       console.log("Fetching root key for local development...");
       try {
         await agent.fetchRootKey();
         console.log("Root key fetched successfully");

         // Verify the agent configuration
         console.log("Agent configuration:", {
           identity: finalIdentity ? finalIdentity.getPrincipal().toString() : "anonymous",
           host: agent._host || agent.host,
           verifyQuerySignatures: agent._verifyQuerySignatures,
           rootKeyPresent: !!agent.rootKey,
           rootKeyLength: agent.rootKey?.byteLength || 0
         });

       } catch (error) {
         console.error("Root key fetch failed:", error);
         // In development, this is usually fatal
         throw new Error(`Root key fetch failed: ${error.message}`);
       }
     } else {
       console.log("Production mode: using mainnet certificates");
     }

     return agent;
   }

  /**
   * Setup authenticated agent with user identity
   */
  async _setupAuthenticatedAgent() {
    if (!idlFactory || !Id) {
      throw new Error("Backend service not properly configured");
    }

    console.log("Setting up authenticated agent");
    const identity = this.authClient.getIdentity();
    const principalText = identity.getPrincipal().toText();
    console.log("Identity principal:", principalText);

    // Verify this is not an anonymous identity
    if (principalText === "2vxsx-fae") {
      console.log("Anonymous identity detected, not setting up authenticated agent");
      await this._setupAnonymousAgent();
      return;
    }

    this.agent = await this._createAgent(identity);

    console.log("Creating authenticated actor with canisterId:", Id);
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: Id,
      identity
    });

    console.log("Authenticated agent setup complete");
    this.isAuthenticated = true;
  }

  /**
   * Setup anonymous agent for queries
   */
  async _setupAnonymousAgent() {
    if (!idlFactory || !Id) {
      throw new Error("Backend service not properly configured");
    }

    console.log("Setting up anonymous agent");

    this.agent = await this._createAgent();

    console.log("Creating anonymous actor with canisterId:", Id);
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: Id,
    });

    console.log("Anonymous agent setup complete");
    this.isAuthenticated = false;
  }

  /* ============ AUTHENTICATION METHODS ============ */

  /**
     * Login with Internet Identity
     */
  async login() {
    await this.ensureReady();

    // Check if storage is available
    if (!this._checkStorageAvailability()) {
      throw new Error("Storage not available. Please disable incognito/private browsing mode to login.");
    }

    // Use existing AuthClient or create new one for login
    if (!this.authClient) {
      try {
        this.authClient = await AuthClient.create();
        console.log("Created AuthClient for login");
      } catch (error) {
        console.error("Failed to create AuthClient:", error);
        throw error;
      }
    }

    return new Promise((resolve, reject) => {
      this.authClient.login({
        identityProvider: getIdentityProvider(),
        maxTimeToLive: BigInt(30 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 30 days
        windowOpenerFeatures: "toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100",
        onSuccess: async () => {
          try {
            console.log("Login successful, setting up authenticated agent...");
            await this._setupAuthenticatedAgent();
            resolve(true);
          } catch (error) {
            console.error("Authenticated agent setup failed:", error);
            reject(error);
          }
        },
        onError: (error) => {
          console.error("Login failed:", error);
          if (error === "UserInterrupt") {
            reject(new Error("Login was cancelled. Please allow popups and try again."));
          } else {
            reject(new Error(`Login failed: ${error}`));
          }
        },
      });
    });
  }

  /**
    * Logout user
    */
  async logout() {
    await this.ensureReady();

    // Clear the stored identity and invalidate the current session
    if (this.authClient) {
      await this.authClient.logout();

      // Force clear any stored identity data
      try {
        // Clear localStorage entries related to Internet Identity
        const keysToRemove = [];
        for (let i = 0; i < localStorage.length; i++) {
          const key = localStorage.key(i);
          if (key && (key.includes('internet_identity') || key.includes('authClient') || key.includes('delegation'))) {
            keysToRemove.push(key);
          }
        }
        keysToRemove.forEach(key => localStorage.removeItem(key));

        // Clear sessionStorage as well
        for (let i = 0; i < sessionStorage.length; i++) {
          const key = sessionStorage.key(i);
          if (key && (key.includes('internet_identity') || key.includes('authClient') || key.includes('delegation'))) {
            sessionStorage.removeItem(key);
          }
        }

        console.log("Cleared stored authentication data");
      } catch (error) {
        console.warn("Failed to clear stored auth data:", error);
      }
    }

    await this._setupAnonymousAgent();
    this.isAuthenticated = false;
    return true;
  }

  /**
    * Check if user is authenticated
    */
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  /**
     * Debug authentication state
     */
  debugAuth() {
    return {
      isAuthenticated: this.isAuthenticated,
      actorInitialized: !!this.actor,
      authClientInitialized: !!this.authClient,
      canisterId: Id,
      agentHost: getAgentHost(),
      identityProvider: getIdentityProvider(),
      isDevMode: isDevMode(),
      storageAvailable: this._checkStorageAvailability(),
    };
  }

  /**
    * Get authentication status
    */
  async getAuthStatus() {
    await this.ensureReady();
    return {
      isAuthenticated: this.isAuthenticated,
      canisterId: Id,
    };
  }

  /* ============ SAFE CALL WRAPPER ============ */

  /**
   * Safe wrapper for canister calls with error handling and retries
   */
  async _safeCall(methodName, ...args) {
    const maxRetries = 2;
    let lastError;

    for (let attempt = 1; attempt <= maxRetries; attempt++) {
      try {
        console.log(`Calling ${methodName} (attempt ${attempt}/${maxRetries})`);
        
        // Ensure we're ready
        await this.ensureReady();
        
        const result = await this.actor[methodName](...args);
        console.log(`${methodName} succeeded on attempt ${attempt}`);
        return result;
        
      } catch (error) {
        console.error(`${methodName} failed on attempt ${attempt}:`, error);
        lastError = error;

        // If it's a certificate/signature error and we're in development, try recreating the agent
        if (error.message.includes('certificate') ||
            error.message.includes('signature') ||
            error.message.includes('verification') ||
            error.message.includes('delegation') ||
            error.message.includes('Invalid certificate')) {

          console.log(`Certificate/signature error on attempt ${attempt}:`, error.message);

          if (isDevMode() && attempt < maxRetries) {
            console.log("Recreating agent for local development...");
            try {
              // Force re-initialize the service
              this.initialized = false;
              this.agent = null;
              this.actor = null;
              await this.initialize();
              console.log("Agent recreated successfully, retrying call...");
            } catch (agentError) {
              console.error("Failed to recreate agent:", agentError);
              // Don't retry if agent recreation fails
              break;
            }
          } else if (!isDevMode()) {
            console.log("Certificate error in production - this might indicate network issues");
            // Don't retry certificate errors in production
            break;
          }
        }

        // Wait before retry
        if (attempt < maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000));
        }
      }
    }

    throw lastError;
  }

  /* ============ MEME OPERATIONS ============ */

  /**
    * Generate a new meme
    */
  async generateMeme(prompt) {
    if (!this.isAuthenticated) {
      throw new Error("Authentication required: Please login to generate memes");
    }
    const result = await this._safeCall('generate_meme', prompt);
    return this._unwrapResult(result, "generate_meme failed");
  }

  /**
    * Get user's memes
    */
  async getUserMemes() {
    if (!this.isAuthenticated) {
      throw new Error("Authentication required: Please login to view your memes");
    }
    return await this._safeCall('get_user_memes');
  }

  /**
    * Get total number of memes
    */
  async getTotalMemes() {
    return await this._safeCall('get_total_memes');
  }

  /**
    * Get total number of users
    */
  async getTotalUsers() {
    return await this._safeCall('get_total_users');
  }

  /**
    * Get all memes for marketplace
    */
  async getAllMemes() {
    return await this._safeCall('get_all_memes');
  }

  /**
    * Get only memes that are listed for sale on the marketplace
    */
  async getMarketplaceMemes() {
    return await this._safeCall('get_marketplace_memes');
  }

  /**
   * Get current leaderboard
   */
  async getCurrentLeaderboard(limit = 50) {
    const limitOpt = typeof limit === "number" ? [limit] : [];
    return await this._safeCall('get_current_leaderboard', limitOpt);
  }

  /**
    * Vote on a meme
    */
  async voteMeme(memeId, voteType) {
    if (!this.isAuthenticated) {
      throw new Error("Authentication required: Please login to vote on memes");
    }
    const voteVariant = this._toVoteVariant(voteType);
    const result = await this._safeCall('vote_meme', memeId, voteVariant);
    return this._unwrapResult(result, "vote_meme failed");
  }

  /**
    * Remove vote from a meme
    */
  async removeVote(memeId) {
    if (!this.isAuthenticated) {
      throw new Error("Authentication required: Please login to remove votes");
    }
    const result = await this._safeCall('remove_vote', memeId);
    return this._unwrapResult(result, "remove_vote failed");
  }

  /**
   * Get specific meme by ID
   */
  async getMeme(memeId) {
    const result = await this._safeCall('get_meme', memeId);
    return this._fromOpt(result);
  }

  /**
     * Get meme votes
     */
  async getMemeVotes(memeId) {
    const result = await this._safeCall('get_meme_votes', memeId);
    return this._fromOpt(result);
  }

  /**
    * Check if a meme has been minted as NFT
    */
  async isMemeMinted(memeId) {
    try {
      const result = await this._safeCall('is_meme_minted', memeId);
      return Boolean(result);
    } catch (error) {
      console.warn(`isMemeMinted failed for ${memeId}:`, error);
      return false;
    }
  }

  /**
    * Get user's vote on a specific meme
    */
  async getUserVote(memeId) {
    const result = await this._safeCall('get_user_vote', memeId);
    return this._fromOpt(result);
  }

  /**
     * Publish a meme to marketplace
     */
  async publishMeme(memeData) {
    if (!this.isAuthenticated) {
      throw new Error("Authentication required: Please login to publish memes");
    }
    const result = await this._safeCall('publish_meme', memeData);
    return this._unwrapResult(result, "publish_meme failed");
  }

  /**
     * List a meme for sale
     */
  async listMemeForSale(memeId, priceE8s) {
    if (!this.isAuthenticated) {
      throw new Error("Authentication required: Please login to list memes");
    }
    const result = await this._safeCall('list_meme_for_sale', memeId, priceE8s);
    return this._unwrapResult(result, "list_meme_for_sale failed");
  }

  /**
     * Remove meme from marketplace
     */
  async removeMemeFromMarket(memeId) {
    if (!this.isAuthenticated) {
      throw new Error("Authentication required: Please login to manage listings");
    }
    const result = await this._safeCall('remove_meme_from_market', memeId);
    return this._unwrapResult(result, "remove_meme_from_market failed");
  }

  /**
     * Record a meme sale
     */
  async recordMemeSale(memeId, salePriceE8s) {
    const result = await this._safeCall('record_meme_sale', memeId, salePriceE8s);
    return this._unwrapResult(result, "record_meme_sale failed");
  }

  /**
    * Increment view count for a meme
    */
  async incrementMemeViews(memeId) {
    try {
      const result = await this._safeCall('increment_meme_views', memeId);
      return this._unwrapResult(result, "increment_meme_views failed");
    } catch (error) {
      // Silently fail for view increments - not critical
      console.warn(`Failed to increment views for meme ${memeId}:`, error);
      return null;
    }
  }

  /* ============ FEEDBACK METHODS ============ */

  /**
    * Submit feedback
    */
  async submitFeedback(name, likes, dislikes, suggestions, willReturn) {
    if (!this.isAuthenticated) {
      throw new Error("Authentication required to submit feedback");
    }
    const result = await this._safeCall('submit_feedback', name, likes, dislikes, suggestions, willReturn);
    return this._unwrapResult(result, "submit_feedback failed");
  }

  /**
    * Get approved feedback for display
    */
  async getApprovedFeedback(limit = 10) {
    return await this._safeCall('get_approved_feedback', [limit]);
  }

  /**
    * Get all feedback (admin function)
    */
  async getAllFeedback() {
    return await this._safeCall('get_all_feedback');
  }

  /**
    * Get feedback statistics
    */
  async getFeedbackStats() {
    console.log("Getting feedback stats...");
    try {
      const result = await this._safeCall('get_feedback_stats');
      console.log("Feedback stats retrieved:", result);
      return result;
    } catch (error) {
      console.error("Failed to get feedback stats:", error);
      // Return default stats if the method fails
      return [0, 0, 0]; // [total_feedback, approved_count, approval_rate]
    }
  }

  /* ============ UTILITY METHODS ============ */

  /**
   * Get remaining API calls
   */
  async getRemainingCalls() {
    return await this._safeCall('check_remaining_calls');
  }

  /**
   * Health check
   */
  async healthCheck() {
    console.log("Performing health check...");
    try {
      const result = await this._safeCall('health');
      console.log("Health check successful:", result);
      return result;
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }

  /**
   * Test connection to canister
   */
  async testConnection() {
    try {
      console.log("Testing connection to canister...");
      console.log("Agent host:", this.agent?._host || this.agent?.host);
      console.log("Canister ID:", Id);
      console.log("Is development mode:", isDevMode());

      const result = await this.healthCheck();
      console.log("Connection test successful!");
      return { success: true, result };
    } catch (error) {
      console.error("Connection test failed:", error);
      return { success: false, error: error.message };
    }
  }

  /* ============ HELPER METHODS ============ */

  /**
   * Convert Candid optional to JavaScript value
   */
  _fromOpt(opt) {
    return Array.isArray(opt) && opt.length ? opt[0] : null;
  }

  /**
   * Unwrap Candid Result type
   */
  _unwrapResult(result, errorMessage = "Operation failed") {
    if (result && "Ok" in result) return result.Ok;
    const error = result?.Err ?? "Unknown error";
    throw new Error(`${errorMessage}: ${error}`);
  }

  /**
   * Convert vote type string to Candid variant
   */
  _toVoteVariant(voteType) {
    if (voteType && typeof voteType === "object") return voteType;
    if (voteType === "Upvote") return { Upvote: null };
    if (voteType === "Downvote") return { Downvote: null };
    throw new Error(`Invalid voteType: ${voteType} (expected "Upvote" or "Downvote")`);
  }
}

/* ============ EXPORTS ============ */

const backendService = new BackendService();
export default backendService;

// Low-level accessors
export const getBackend = async () => {
  await backendService.ensureReady();
  return backendService.actor;
};

export const getNetwork = () =>
  window.location.hostname.includes("localhost") ||
  window.location.hostname.endsWith(".localhost")
    ? "local"
    : "ic";

// Test connection utility
export const testConnection = async () => {
  return await backendService.testConnection();
};