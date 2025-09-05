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
   * Create a properly configured agent for development
    */
   async _createAgent(identity = null) {
     console.log("Creating agent with host:", getAgentHost());
     console.log("Development mode:", isDevMode());

     const agentOptions = {
       host: getAgentHost(),
       if (identity) {
       agentOptions.identity = identity;
     },
        verifyQuerySignatures: false,
       // CRITICAL: This must be set to false for localhost to disable signature verification
     };

     

     // Create the agent
     const agent = new HttpAgent(agentOptions);

     // CRITICAL: For development, we must fetch the root key
     if (isDevMode()) {
       console.log("Fetching root key...");
       try {
         await agent.fetchRootKey();
         console.log("Root key fetched successfully");

         // Verify the agent configuration
         console.log("Agent configuration:", {
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
     }

     // Additional check: Ensure signature verification is disabled
     if (agent._verifyQuerySignatures !== false) {
       console.warn("Warning: verifyQuerySignatures is not properly set to false");
       // Force disable it
       agent._verifyQuerySignatures = false;
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
    console.log("Identity principal:", identity.getPrincipal().toString());

    this.agent = await this._createAgent(identity);

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

    return new Promise((resolve, reject) => {
      this.authClient.login({
        identityProvider: getIdentityProvider(),
        maxTimeToLive: BigInt(7 * 24 * 60 * 60 * 1000 * 1000 * 1000), // 7 days
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
            error.message.includes('delegation')) {

          if (isDevMode() && attempt < maxRetries) {
            console.log("Certificate/signature error detected, recreating agent...");
            try {
              if (this.isAuthenticated) {
                await this._setupAuthenticatedAgent();
              } else {
                await this._setupAnonymousAgent();
              }
              console.log("Agent recreated successfully, retrying call...");
            } catch (agentError) {
              console.error("Failed to recreate agent:", agentError);
            }
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
    const result = await this._safeCall('generate_meme', prompt);
    return this._unwrapResult(result, "generate_meme failed");
  }

  /**
   * Get user's memes
   */
  async getUserMemes() {
    return await this._safeCall('get_user_memes');
  }

  /**
   * Get total number of memes
   */
  async getTotalMemes() {
    return await this._safeCall('get_total_memes');
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
    const voteVariant = this._toVoteVariant(voteType);
    const result = await this._safeCall('vote_meme', memeId, voteVariant);
    return this._unwrapResult(result, "vote_meme failed");
  }

  /**
   * Remove vote from a meme
   */
  async removeVote(memeId) {
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