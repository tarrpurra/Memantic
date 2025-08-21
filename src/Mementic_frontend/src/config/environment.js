// Environment configuration for the frontend
export const config = {
  // Internet Computer Configuration
  INTERNET_IDENTITY_HOST:
    import.meta.env.VITE_INTERNET_IDENTITY_HOST ||
    "http://localhost:4943?canisterId=rdmx6-jaaaa-aaaaa-aaadq-cai",

  // Agent host used by @dfinity/agent to talk to the IC
  // Prefer icp-api.io in production to satisfy CSP and boundary node policies
  AGENT_HOST: import.meta.env.VITE_AGENT_HOST || "https://icp-api.io",

  // Backend Canister ID (replace with your actual canister ID after deployment)
  MEMENTIC_BACKEND_CANISTER_ID:
    import.meta.env.VITE_MEMENTIC_BACKEND_CANISTER_ID ||
    "ysmdh-qyaaa-aaaab-qacga-cai",

  // Development Configuration
  DEV_MODE: import.meta.env.VITE_DEV_MODE === "true",
  LOCAL_CANISTER_ID:
    import.meta.env.VITE_LOCAL_CANISTER_ID || "ysmdh-qyaaa-aaaab-qacga-cai",

  // Feature Flags
  ENABLE_MEME_GENERATION: true,
  ENABLE_VOTING: true,
  ENABLE_NFT_MINTING: true,

  // API Configuration
  REQUEST_TIMEOUT: 30000, // 30 seconds
  MAX_RETRIES: 3,
};

// Helper function to get canister ID based on environment
export const getCanisterId = () => {
  if (config.DEV_MODE) {
    return config.LOCAL_CANISTER_ID;
  }
  return config.MEMENTIC_BACKEND_CANISTER_ID;
};

// Helper to get HttpAgent host (IC API endpoint)
export const getAgentHost = () => {
  if (config.DEV_MODE) {
    // Use the frontend origin so requests go through Vite's /api proxy to 127.0.0.1:4943
    return window.location.origin;
  }
  return config.AGENT_HOST;
};

// Helper to get Internet Identity provider URL
export const getIdentityProvider = () => config.INTERNET_IDENTITY_HOST;

// Helper to check dev mode in other modules
export const isDevMode = () => !!config.DEV_MODE;
