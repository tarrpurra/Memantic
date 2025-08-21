#!/bin/bash

# Frontend-Backend Integration Setup Script
# This script helps set up the integration between the React frontend and IC backend

echo "🚀 Setting up Mementic Frontend-Backend Integration..."

# Check if dfx is installed
if ! command -v dfx &> /dev/null; then
    echo "❌ dfx is not installed. Please install dfx first:"
    echo "   sh -ci \"\$(curl -fsSL https://internetcomputer.org/install.sh)\""
    exit 1
fi

# Check if we're in the right directory
if [ ! -f "dfx.json" ]; then
    echo "❌ Please run this script from the Mementic root directory"
    exit 1
fi

echo "📦 Installing frontend dependencies..."
cd src/Mementic_frontend
npm install

echo "🔧 Generating backend bindings..."
cd ../..
dfx generate Mementic_backend

echo "🚀 Deploying backend canister..."
dfx deploy Mementic_backend

echo "📝 Backend deployed! Copy the canister ID above and update your .env file:"
echo ""
echo "Create a .env file in src/Mementic_frontend with:"
echo "VITE_MEMENTIC_BACKEND_CANISTER_ID=<your_canister_id_here>"
echo "VITE_INTERNET_IDENTITY_HOST=https://identity.ic0.app"
echo "VITE_DEV_MODE=true"
echo ""

echo "✅ Setup complete! You can now:"
echo "1. Start the frontend: cd src/Mementic_frontend && npm run dev"
echo "2. Test the integration by visiting /myplace and using the BackendTest component"
echo "3. Generate memes using the MemeGenerator component"


