#!/usr/bin/env node

const { execSync } = require("child_process");
const path = require("path");

console.log("🚀 Building Mementic Frontend...");

try {
  // Step 1: Generate only backend declarations
  console.log("📝 Generating backend declarations...");
  execSync("dfx generate Mementic_backend", {
    stdio: "inherit",
    cwd: __dirname,
  });

  // Step 2: Build the frontend
  console.log("🔨 Building frontend with Vite...");
  execSync("npm run build", {
    stdio: "inherit",
    cwd: path.join(__dirname, "src/Mementic_frontend"),
  });

  console.log("✅ Frontend build completed successfully!");
  console.log("📁 Build output: src/Mementic_frontend/dist/");
} catch (error) {
  console.error("❌ Build failed:", error.message);
  process.exit(1);
}
