@echo off
REM Frontend-Backend Integration Setup Script for Windows
REM This script helps set up the integration between the React frontend and IC backend

echo 🚀 Setting up Mementic Frontend-Backend Integration...

REM Check if dfx is installed
dfx --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ dfx is not installed. Please install dfx first:
    echo    Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/
    pause
    exit /b 1
)

REM Check if we're in the right directory
if not exist "dfx.json" (
    echo ❌ Please run this script from the Mementic root directory
    pause
    exit /b 1
)

echo 📦 Installing frontend dependencies...
cd src\Mementic_frontend
call npm install

echo 🔧 Generating backend bindings...
cd ..\..
dfx generate Mementic_backend

echo 🚀 Deploying backend canister...
dfx deploy Mementic_backend

echo 📝 Backend deployed! Copy the canister ID above and update your .env file:
echo.
echo Create a .env file in src\Mementic_frontend with:
echo VITE_MEMENTIC_BACKEND_CANISTER_ID=^<your_canister_id_here^>
echo VITE_INTERNET_IDENTITY_HOST=https://identity.ic0.app
echo VITE_DEV_MODE=true
echo.

echo ✅ Setup complete! You can now:
echo 1. Start the frontend: cd src\Mementic_frontend ^&^& npm run dev
echo 2. Test the integration by visiting /myplace and using the BackendTest component
echo 3. Generate memes using the MemeGenerator component

pause


