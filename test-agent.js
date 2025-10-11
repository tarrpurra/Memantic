#!/usr/bin/env node

// Test script to verify agent configuration
import { Actor, HttpAgent } from "@dfinity/agent";
import { idlFactory } from "./src/declarations/mementic_backend/index.js";

// Environment detection
const isDevMode = () => {
  if (typeof window !== 'undefined') {
    return window.location.hostname.includes('localhost') ||
           window.location.hostname === '127.0.0.1';
  }
  return process.env.NODE_ENV !== 'development' ||
         process.env.VITE_NETWORK === 'local';
};

const getAgentHost = () => {
  if (process.env.VITE_AGENT_HOST) return process.env.VITE_AGENT_HOST;
  return isDevMode() ? "http://127.0.0.1:4943" : "https://icp-api.io";
};

const getCanisterId = () => {
  return process.env.VITE_CANISTER_ID_MEMENTIC_BACKEND ||
         process.env.CANISTER_ID_MEMENTIC_BACKEND ||
         'g3bm6-baaaa-aaaaa-qcexq-cai';
};

async function testAgent() {
  console.log("🧪 Testing agent configuration...");
  console.log("Is Dev Mode:", isDevMode());
  console.log("Agent Host:", getAgentHost());
  console.log("Canister ID:", getCanisterId());

  try {
    // Create agent with proper configuration
    const agent = new HttpAgent({
      host: getAgentHost(),
      verifyQuerySignatures: !isDevMode(),
    });

    console.log("Agent created successfully");

    // Fetch root key for local development
    if (isDevMode()) {
      console.log("Fetching root key...");
      await agent.fetchRootKey();
      console.log("Root key fetched successfully");
    }

    // Create actor
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId: getCanisterId(),
    });

    console.log("Actor created successfully");

    // Test a simple query
    console.log("Testing health check...");
    const health = await actor.health();
    console.log("Health check result:", health);

    // Test feedback stats
    console.log("Testing feedback stats...");
    const stats = await actor.get_feedback_stats();
    console.log("Feedback stats:", stats);

    console.log("✅ All tests passed!");

  } catch (error) {
    console.error("❌ Test failed:", error);
    process.exit(1);
  }
}

testAgent();