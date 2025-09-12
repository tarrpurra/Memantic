@echo off
REM Frontend-Backend Integration Setup Script for Windows
REM This script helps set up the complete Mementic development environment

echo 🚀 Setting up Mementic Development Environment...

REM Check if dfx is installed
dfx --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ dfx is not installed. Please install dfx first:
    echo    Visit: https://internetcomputer.org/docs/current/developer-docs/setup/install/
    pause
    exit /b 1
)

REM Check if npm is installed
npm --version >nul 2>&1
if %errorlevel% neq 0 (
    echo ❌ npm is not installed. Please install Node.js first:
    echo    Visit: https://nodejs.org/
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
cd ..\..

echo 🔧 Starting Internet Computer replica...
dfx start --background --clean

echo ⏳ Waiting for replica to start...
timeout /t 5 /nobreak >nul

echo 🚀 Deploying all canisters...
dfx deploy

echo 📝 Canisters deployed! Creating/updating .env file...
cd src\Mementic_frontend

REM Get canister IDs
for /f "tokens=*" %%i in ('dfx canister id Mementic_backend 2^>nul') do set BACKEND_ID=%%i
for /f "tokens=*" %%i in ('dfx canister id Mementic_frontend 2^>nul') do set FRONTEND_ID=%%i

REM Create .env file
echo VITE_AGENT_HOST=http://127.0.0.1:4943 > .env
echo VITE_INTERNET_IDENTITY_HOST=https://identity.ic0.app >> .env
if defined BACKEND_ID echo VITE_CANISTER_ID_MEMENTIC_BACKEND=%BACKEND_ID% >> .env
if defined FRONTEND_ID echo VITE_CANISTER_ID_MEMENTIC_FRONTEND=%FRONTEND_ID% >> .env

echo ✅ .env file created/updated in src\Mementic_frontend
cd ..\..

echo 🚀 Starting frontend development server...
start cmd /k "cd src\Mementic_frontend && npm run dev"

echo ✅ Setup complete!
echo 🌐 Frontend will be available at: http://localhost:5173 (or similar)
echo 📱 Test the integration by visiting /myplace and using the BackendTest component
echo 🎨 Generate memes using the MemeGenerator component

pause


