# 🚀 Mementic Mainnet Deployment Guide

This guide will help you deploy Mementic to the Internet Computer mainnet.

## ⚠️ Important Prerequisites

### 1. ICP Wallet & Cycles
- **ICP Tokens**: You'll need ICP tokens for canister creation and cycles
- **Cycles Wallet**: Set up a cycles wallet for canister operations
- **Minimum Balance**: ~10-20 ICP recommended for initial deployment

### 2. DFX Setup
```bash
# Install dfx (if not already installed)
sh -ci "$(curl -fsSL https://internetcomputer.org/install.sh)"

# Check dfx version
dfx --version

# Login to dfx (creates/mainnet identity)
dfx identity new mainnet-identity
dfx identity use mainnet-identity
```

### 3. Internet Identity
- Mainnet uses production Internet Identity: `https://identity.ic0.app`
- No need to deploy your own II canister for mainnet

## 📋 Pre-Deployment Checklist

- [ ] ICP tokens in your wallet
- [ ] Cycles wallet configured
- [ ] dfx identity set up for mainnet
- [ ] Project builds successfully locally
- [ ] All environment variables configured

## 🚀 Deployment Steps

### Step 1: Prepare Environment
```bash
# Switch to mainnet environment
cp .env.mainnet src/Mementic_frontend/.env

# Verify environment
cat src/Mementic_frontend/.env
```

### Step 2: Build Project
```bash
# Build for mainnet
dfx build --network ic
```

### Step 3: Deploy Canisters
```bash
# Deploy to mainnet (this costs ICP!)
dfx deploy --network ic
```

### Step 4: Get Canister IDs
```bash
# Get deployed canister IDs
BACKEND_ID=$(dfx canister id Mementic_backend --network ic)
FRONTEND_ID=$(dfx canister id Mementic_frontend --network ic)

echo "Backend Canister ID: $BACKEND_ID"
echo "Frontend Canister ID: $FRONTEND_ID"
```

### Step 5: Update Frontend Configuration
After deployment, update the frontend canister ID in your environment:

```bash
# Update .env.mainnet with actual canister IDs
echo "VITE_CANISTER_ID_MEMENTIC_BACKEND=$BACKEND_ID" >> .env.mainnet
echo "VITE_CANISTER_ID_MEMENTIC_FRONTEND=$FRONTEND_ID" >> .env.mainnet
```

### Step 6: Redeploy Frontend (if needed)
```bash
# If you updated canister IDs, redeploy frontend
dfx deploy Mementic_frontend --network ic
```

## 🌐 Access Your Deployed App

Once deployed, your app will be available at:
```
https://<FRONTEND_CANISTER_ID>.icp0.io
```

## 💰 Cost Estimation

### Initial Deployment Costs:
- **Backend Canister**: ~0.1 ICP (Rust canister)
- **Frontend Canister**: ~0.01 ICP (Asset canister)
- **Cycles**: ~10-20 TCycles for initial operation

### Ongoing Costs:
- **Storage**: ~0.0001 ICP per GB per year
- **Compute**: ~0.0000000001 ICP per instruction
- **Cycles Top-up**: Required when cycles run low

## 🔧 Configuration Files

### Mainnet Environment (.env.mainnet)
```
VITE_NETWORK=ic
VITE_AGENT_HOST=https://icp-api.io
VITE_II_ORIGIN=https://identity.ic0.app
VITE_INTERNET_IDENTITY_HOST=https://identity.ic0.app
VITE_CANISTER_ID_MEMENTIC_BACKEND=<actual_backend_id>
VITE_CANISTER_ID_MEMENTIC_FRONTEND=<actual_frontend_id>
DEV=false
```

### dfx.json Networks Configuration
```json
{
  "networks": {
    "ic": {
      "providers": ["https://icp0.io", "https://icp-api.io"],
      "type": "persistent"
    }
  }
}
```

## 🐛 Troubleshooting

### Common Issues:

1. **"Insufficient cycles"**
   - Add more cycles to your wallet
   - Check cycles balance: `dfx wallet balance`

2. **"Authentication failed"**
   - Ensure you're using the correct dfx identity
   - Check: `dfx identity whoami`

3. **"Build failed"**
   - Ensure all dependencies are installed
   - Check Rust toolchain: `rustc --version`

4. **"Canister not found"**
   - Verify canister IDs are correct
   - Check network: `dfx canister status <canister_id> --network ic`

## 📊 Post-Deployment

### Monitoring:
```bash
# Check canister status
dfx canister status Mementic_backend --network ic
dfx canister status Mementic_frontend --network ic

# Check cycles balance
dfx wallet balance
```

### Updates:
```bash
# To update your deployed canisters
dfx deploy --network ic
```

## 🔒 Security Notes

- **Never commit private keys** to version control
- **Use environment variables** for sensitive configuration
- **Test thoroughly** on local replica before mainnet deployment
- **Backup your dfx identity** securely

## 📞 Support

If you encounter issues:
1. Check the [Internet Computer Developer Documentation](https://internetcomputer.org/docs/)
2. Join the [DFINITY Developer Forum](https://forum.dfinity.org/)
3. Check [dfx GitHub Issues](https://github.com/dfinity/dfx/issues)

---

**🎉 Congratulations on deploying to mainnet!**

Your Mementic app is now live on the Internet Computer mainnet. Share your canister URL with the world!

```
https://<your_frontend_canister_id>.icp0.io