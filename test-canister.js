#!/usr/bin/env node

const { Actor, HttpAgent } = require("@dfinity/agent");
const {
  idlFactory,
} = require("./.dfx/local/canisters/Mementic_backend/index.js");

async function testCanister() {
  console.log("🧪 Testing Mementic backend canister...");

  try {
    // Create agent
    const agent = new HttpAgent({
      host: "http://127.0.0.1:4943",
    });

    // Fetch root key for local development
    await agent.fetchRootKey();

    // Create actor
    const canisterId = "uxrrr-q7777-77774-qaaaq-cai";
    const actor = Actor.createActor(idlFactory, {
      agent,
      canisterId,
    });

    console.log("✅ Actor created successfully");

    // Test health check
    console.log("🏥 Testing health check...");
    const health = await actor.health();
    console.log("✅ Health check passed:", health);

    // Test remaining calls (should work for anonymous users)
    console.log("📞 Testing check_remaining_calls...");
    const remainingCalls = await actor.check_remaining_calls();
    console.log("✅ Remaining calls:", remainingCalls);

    console.log("\n🎉 All tests passed! The canister is working correctly.");
  } catch (error) {
    console.error("❌ Test failed:", error.message);
    console.log("\n🔧 Troubleshooting:");
    console.log("1. Make sure dfx is running: dfx start --clean --background");
    console.log(
      "2. Make sure the canister is deployed: dfx deploy Mementic_backend"
    );
    console.log(
      "3. Make sure the canister is running: dfx canister status Mementic_backend"
    );
  }
}

testCanister();
