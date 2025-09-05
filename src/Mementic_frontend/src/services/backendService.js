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
      // Create auth client
      this.authClient = await AuthClient.create({
        idleOptions: { disableDefaultIdleCallback: true },
      });

      // Setup anonymous agent first
      await this._setupAnonymousAgent();

      // Upgrade to authenticated if user is logged in
      if (await this.authClient.isAuthenticated()) {
        await this._setupAuthenticatedAgent();
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Backend service initialization failed:", error);
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
   * Setup authenticated agent with user identity
   */
  async _setupAuthenticatedAgent() {
    if (!idlFactory || !Id) {
      throw new Error("Backend service not properly configured");
    }

    console.log("Setting up authenticated agent");
    const identity = this.authClient.getIdentity();
    this.agent = new HttpAgent({
      identity,
      host: getAgentHost(),
      verifyQuerySignatures: false
    });

    // Additional certificate verification override for development
    if (isDevMode()) {
      // Override the certificate verification method
      this.agent._verifyQuerySignatures = () => true;
    }

    if (isDevMode()) {
      console.log("Fetching root key for authenticated agent...");
      try {
        await this.agent.fetchRootKey();
        console.log("Root key fetched successfully for authenticated agent");
      } catch (error) {
        console.warn("Failed to fetch root key for authenticated agent:", error);
        // Continue anyway - this is common in some setups
      }
    }

    console.log("Creating authenticated actor with canisterId:", Id);
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: Id,
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

    console.log("Setting up anonymous agent with host:", getAgentHost());

    this.agent = new HttpAgent({
      host: getAgentHost(),
      verifyQuerySignatures: false,
    });

    // Additional certificate verification override for development
    if (isDevMode()) {
      // Override the certificate verification method
      this.agent._verifyQuerySignatures = () => true;
    }

    if (isDevMode()) {
      console.log("Fetching root key for anonymous agent...");
      try {
        await this.agent.fetchRootKey();
        console.log("Root key fetched successfully for anonymous agent");
      } catch (error) {
        console.warn("Failed to fetch root key for anonymous agent:", error);
        // Continue anyway - this is common in some setups
      }
    }

    console.log("Creating actor with canisterId:", Id);
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

    return new Promise((resolve, reject) => {
      this.authClient.login({
        identityProvider: getIdentityProvider(),
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
        windowOpenerFeatures: "toolbar=0,location=0,menubar=0,width=500,height=500,left=100,top=100",
        onSuccess: async () => {
          try {
            await this._setupAuthenticatedAgent();
            resolve(true);
          } catch (error) {
            reject(error);
          }
        },
        onError: (error) => {
          reject(new Error(`Login failed: ${error}`));
        },
      });
    });
  }

  /**
   * Logout user
   */
  async logout() {
    await this.ensureReady();
    await this.authClient.logout();
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

  /* ============ MEME OPERATIONS ============ */

  /**
   * Generate a new meme
   */
  async generateMeme(prompt) {
    await this.ensureReady();
    const result = await this.actor.generate_meme(prompt);
    return this._unwrapResult(result, "generate_meme failed");
  }

  /**
   * Get user's memes
   */
  async getUserMemes() {
    await this.ensureReady();
    return await this.actor.get_user_memes();
  }

  /**
   * Get total number of memes
   */
  async getTotalMemes() {
    await this.ensureReady();
    return await this.actor.get_total_memes();
  }

  /**
   * Get current leaderboard
   */
  async getCurrentLeaderboard(limit = 50) {
    await this.ensureReady();
    const limitOpt = typeof limit === "number" ? [limit] : [];
    return await this.actor.get_current_leaderboard(limitOpt);
  }

  /**
   * Vote on a meme
   */
  async voteMeme(memeId, voteType) {
    await this.ensureReady();
    const voteVariant = this._toVoteVariant(voteType);
    const result = await this.actor.vote_meme(memeId, voteVariant);
    return this._unwrapResult(result, "vote_meme failed");
  }

  /**
   * Remove vote from a meme
   */
  async removeVote(memeId) {
    await this.ensureReady();
    const result = await this.actor.remove_vote(memeId);
    return this._unwrapResult(result, "remove_vote failed");
  }

  /**
   * Get specific meme by ID
   */
  async getMeme(memeId) {
    await this.ensureReady();
    const result = await this.actor.get_meme(memeId);
    return this._fromOpt(result);
  }

  /**
   * Get meme votes
   */
  async getMemeVotes(memeId) {
    await this.ensureReady();
    const result = await this.actor.get_meme_votes(memeId);
    return this._fromOpt(result);
  }

  /* ============ UTILITY METHODS ============ */

  /**
   * Get remaining API calls
   */
  async getRemainingCalls() {
    await this.ensureReady();
    return await this.actor.check_remaining_calls();
  }

  /**
   * Health check
   */
  async healthCheck() {
    await this.ensureReady();
    console.log("Performing health check...");
    try {
      const result = await this.actor.health();
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
      console.log("Agent host:", this.agent?.host);
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