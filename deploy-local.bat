@echo off
echo 🚀 Starting Mementic local deployment...

echo.
echo 📋 Prerequisites check:
echo - Make sure you have dfx installed
echo - Make sure you have Rust and Cargo installed
echo - Make sure you're in the Mementic directory

echo.
echo 🔧 Starting local network...
dfx start --clean --background

echo.
echo ⏳ Waiting for network to be ready...
timeout /t 10 /nobreak >nul

echo.
echo 🏗️  Building backend canister...
dfx build Mementic_backend

echo.
echo 🚀 Deploying backend canister...
dfx deploy Mementic_backend

echo.
echo 📝 Generating declarations...
dfx generate Mementic_backend

echo.
echo ✅ Deployment complete!
echo.
echo 🌐 Your canisters are now running at:
echo - Backend: http://127.0.0.1:4943/?canisterId=uxrrr-q7777-77774-qaaaq-cai
echo - Frontend: http://127.0.0.1:4943/?canisterId=u6s2n-gx777-77774-qaaba-cai
echo.
echo 🎯 Next steps:
echo 1. Start the frontend: cd src/Mementic_frontend && npm run dev
echo 2. Open http://localhost:5173 in your browser
echo.
echo 💡 To stop the network: dfx stop
pause
