import { Actor, HttpAgent } from "@dfinity/agent";
import { AuthClient } from "@dfinity/auth-client";
import {
  getCanisterId,
  getAgentHost,
  getIdentityProvider,
  isDevMode,
} from "../config/environment";

// Configuration
let CANISTER_ID = null;
let AGENT_HOST = null;
let IDP_URL = null;
let idlFactory = null;

// Initialize configuration
const initializeConfig = async () => {
  try {
    AGENT_HOST = getAgentHost();
    IDP_URL = getIdentityProvider();

    if (isDevMode()) {
      // For local development, load from dfx generated files
      try {
        const backendModule = await import(
          "../../../../.dfx/local/canisters/Mementic_backend/index.js"
        );
        idlFactory = backendModule.idlFactory;
        CANISTER_ID = backendModule.canisterId;
      } catch (error) {
        console.warn(
          "Could not load local canister, falling back to default:",
          error
        );
        // Fallback to default canister ID
        CANISTER_ID = "uxrrr-q7777-77774-qaaaq-cai";
      }
    } else {
      // For production
      CANISTER_ID = getCanisterId();
      // You'll need to provide the idlFactory for production
      console.warn("Production mode: idlFactory needs to be provided");
    }
  } catch (error) {
    console.error("Failed to initialize configuration:", error);
    throw new Error("Backend service configuration failed");
  }
};

class BackendService {
  constructor() {
    this.agent = null;
    this.actor = null;
    this.authClient = null;
    this.isAuthenticated = false;
    this.initialized = false;
  }

  // Initialize the service
  async initialize() {
    if (this.initialized) return true;

    try {
      // Initialize configuration first
      await initializeConfig();

      // Create auth client
      this.authClient = await AuthClient.create({
        idleOptions: {
          disableDefaultIdleCallback: true,
        },
      });

      // Always set up an anonymous agent first so queries work without login
      await this.setupAnonymousAgent();

      // If already authenticated, upgrade the agent to authenticated
      if (await this.authClient.isAuthenticated()) {
        await this.setupAuthenticatedAgent();
      }

      this.initialized = true;
      return true;
    } catch (error) {
      console.error("Failed to initialize backend service:", error);
      return false;
    }
  }

  // Setup authenticated agent
  async setupAuthenticatedAgent() {
    try {
      if (!idlFactory || !CANISTER_ID) {
        throw new Error("Backend service not properly configured");
      }

      const identity = this.authClient.getIdentity();
      this.agent = new HttpAgent({
        identity,
        host: AGENT_HOST,
      });

      // In local development, the agent must fetch the root key
      if (isDevMode()) {
        await this.agent.fetchRootKey();
      }

      // Create actor
      this.actor = Actor.createActor(idlFactory, {
        agent: this.agent,
        canisterId: CANISTER_ID,
      });

      this.isAuthenticated = true;
      return true;
    } catch (error) {
      console.error("Failed to setup authenticated agent:", error);
      this.isAuthenticated = false;
      return false;
    }
  }

  // Setup anonymous agent/actor (no login required)
  async setupAnonymousAgent() {
    if (!idlFactory || !CANISTER_ID) {
      throw new Error("Backend service not properly configured");
    }

    const agent = new HttpAgent({ host: AGENT_HOST });
    if (isDevMode()) {
      await agent.fetchRootKey();
    }
    this.agent = agent;
    this.actor = Actor.createActor(idlFactory, {
      agent: this.agent,
      canisterId: CANISTER_ID,
    });
    this.isAuthenticated = false;
  }

  // Login with Internet Identity
  async login() {
    try {
      return new Promise((resolve, reject) => {
        this.authClient.login({
          identityProvider: IDP_URL,
          onSuccess: async () => {
            try {
              await this.setupAuthenticatedAgent();
              resolve(true);
            } catch (error) {
              reject(error);
            }
          },
          onError: (error) => {
            reject(error);
          },
        });
      });
    } catch (error) {
      console.error("Login failed:", error);
      throw error;
    }
  }

  // Logout
  async logout() {
    try {
      await this.authClient.logout();
      // Recreate anonymous agent/actor so queries continue working
      await this.setupAnonymousAgent();
      this.isAuthenticated = false;
      return true;
    } catch (error) {
      console.error("Logout failed:", error);
      throw error;
    }
  }

  // Check if user is authenticated
  isUserAuthenticated() {
    return this.isAuthenticated;
  }

  // Get remaining calls for today
  async getRemainingCalls() {
    try {
      if (!this.actor) {
        throw new Error("Actor not initialized. Please login first.");
      }
      return await this.actor.check_remaining_calls();
    } catch (error) {
      console.error("Failed to get remaining calls:", error);
      throw error;
    }
  }

  // Generate meme - UPDATED VERSION
  async generateMeme(prompt, style = null, returnBase64 = true) {
    try {
      if (!this.actor) {
        throw new Error("Actor not initialized. Please login first.");
      }

      // Call the backend's generate_meme method directly
      const result = await this.actor.generate_meme(prompt);

      // The backend returns Result<String, String> where Ok contains the image URL
      if (typeof result === "string") {
        return {
          success: true,
          image_url: result,
          prompt: prompt,
        };
      } else {
        throw new Error("Failed to generate meme");
      }
    } catch (error) {
      console.error("Failed to generate meme:", error);
      throw error;
    }
  }

  // Get user memes
  async getUserMemes() {
    try {
      if (!this.actor) {
        throw new Error("Actor not initialized. Please login first.");
      }
      return await this.actor.get_user_memes();
    } catch (error) {
      console.error("Failed to get user memes:", error);
      throw error;
    }
  }

  // Get total memes count
  async getTotalMemes() {
    try {
      if (!this.actor) {
        throw new Error("Actor not initialized. Please login first.");
      }
      return await this.actor.get_total_memes();
    } catch (error) {
      console.error("Failed to get total memes:", error);
      throw error;
    }
  }

  // Get current leaderboard
  async getCurrentLeaderboard(limit = 50) {
    try {
      if (!this.actor) {
        throw new Error("Actor not initialized. Please login first.");
      }
      return await this.actor.get_current_leaderboard([limit]);
    } catch (error) {
      console.error("Failed to get current leaderboard:", error);
      throw error;
    }
  }

  // Vote on a meme
  async voteMeme(memeId, voteType) {
    try {
      if (!this.actor) {
        throw new Error("Actor not initialized. Please login first.");
      }

      const result = await this.actor.vote_meme(memeId, voteType);

      if ("Ok" in result) {
        return result.Ok;
      } else {
        throw new Error(result.Err || "Failed to vote on meme");
      }
    } catch (error) {
      console.error("Failed to vote on meme:", error);
      throw error;
    }
  }

  // Get meme by ID
  async getMeme(memeId) {
    try {
      if (!this.actor) {
        throw new Error("Actor not initialized. Please login first.");
      }
      return await this.actor.get_meme(memeId);
    } catch (error) {
      console.error("Failed to get meme:", error);
      throw error;
    }
  }

  // Get meme votes
  async getMemeVotes(memeId) {
    try {
      if (!this.actor) {
        throw new Error("Actor not initialized. Please login first.");
      }
      return await this.actor.get_meme_votes(memeId);
    } catch (error) {
      console.error("Failed to get meme votes:", error);
      throw error;
    }
  }

  // Health check
  async healthCheck() {
    try {
      if (!this.actor) {
        // Ensure anonymous actor exists
        await this.setupAnonymousAgent();
      }
      return await this.actor.health();
    } catch (error) {
      console.error("Health check failed:", error);
      throw error;
    }
  }

  // Optionally force agent host like the example (only needed if not using env-based host)
  forceAgentHost(host) {
    if (this.agent && host) {
      // eslint-disable-next-line no-underscore-dangle
      this.agent._host = host;
    }
  }
}

// Create and export singleton instance
const backendService = new BackendService();
export default backendService;

// Helpers to mirror example integration API
export const getBackend = () => backendService.actor;
export const getNetwork = () =>
  window.location.hostname.includes("localhost") ||
  window.location.hostname.endsWith(".localhost")
    ? "local"
    : "ic";

// Optional helper: rewrite local assets URL pattern like the example snippet
export const rewriteLocalAssetsUrl = (dfxPort = 4943) => {
  try {
    const url = new URL(window.location.href);
    const canisterId = url.searchParams.get("canisterId");
    if (canisterId && url.port === String(dfxPort)) {
      url.searchParams.delete("canisterId");
      window.location.href = `http://${canisterId}.localhost:${dfxPort}?${url.searchParams}`;
    }
  } catch (_) {
    // ignore
  }
};
